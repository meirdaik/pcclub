"""Bookings made with a package.

A package only decides when the booking ends and what it costs. Slot rules, the age rule and
the double-booking constraints apply to the resulting interval exactly as for hourly bookings.
"""

import asyncio
import uuid
from dataclasses import dataclass
from datetime import time

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Package
from tests.integration.conftest import World
from tests.integration.helpers import (
    ADULT_BIRTH,
    MINOR_BIRTH,
    at,
    book,
    code,
    parse_dt,
    pay,
    register,
)

PHONE = "+77010000001"
OTHER_PHONE = "+77010000002"


@dataclass(frozen=True)
class Packages:
    """Standard zone (1000 ₸/h): 3 hours, Day 13:00-18:00, Night 22:00-08:00. VIP: Night."""

    three_hours: uuid.UUID
    day: uuid.UUID
    night: uuid.UUID
    vip_night: uuid.UUID
    retired: uuid.UUID


async def seed_packages(session: AsyncSession, world: World) -> Packages:
    standard, vip = world.standard_zone_id, world.vip_zone_id
    rows = {
        "three_hours": Package(
            zone_id=standard, name="3 hours", duration_minutes=180, price_kzt=2500
        ),
        "day": Package(
            zone_id=standard, name="Day", window_start=time(13), window_end=time(18), price_kzt=3000
        ),
        "night": Package(
            zone_id=standard,
            name="Night",
            window_start=time(22),
            window_end=time(8),
            price_kzt=4000,
        ),
        "vip_night": Package(
            zone_id=vip, name="Night", window_start=time(22), window_end=time(8), price_kzt=6000
        ),
        "retired": Package(
            zone_id=standard, name="Old", duration_minutes=120, price_kzt=1, is_active=False
        ),
    }
    session.add_all(rows.values())
    await session.commit()
    return Packages(**{name: package.id for name, package in rows.items()})


@pytest.fixture
async def packages(db, world) -> Packages:
    return await seed_packages(db, world)


@pytest.fixture
async def committed_packages(committed_session_factory, committed_world) -> Packages:
    async with committed_session_factory() as session:
        return await seed_packages(session, committed_world)


# --- listing -----------------------------------------------------------------------------------


async def test_list_packages(client, world, packages):
    response = await client.get(f"/v1/clubs/{world.club_id}/packages")

    assert response.status_code == 200
    items = response.json()
    # Zone by zone, cheapest first; the inactive package is hidden.
    assert [(p["zone_name"], p["name"]) for p in items] == [
        ("Standard", "3 hours"),
        ("Standard", "Day"),
        ("Standard", "Night"),
        ("VIP", "Night"),
    ]
    three_hours, day, night, _ = items
    assert three_hours == {
        "id": str(packages.three_hours),
        "club_id": str(world.club_id),
        "zone_id": str(world.standard_zone_id),
        "zone_name": "Standard",
        "name": "3 hours",
        "kind": "duration",
        "duration_minutes": 180,
        "window_start": None,
        "window_end": None,
        "price_kzt": 2500,
        "is_night": False,
    }
    assert (day["kind"], day["window_start"], day["window_end"]) == (
        "window",
        "13:00:00",
        "18:00:00",
    )
    assert (day["duration_minutes"], day["is_night"]) == (None, False)
    assert (night["window_start"], night["window_end"], night["is_night"]) == (
        "22:00:00",
        "08:00:00",
        True,
    )


async def test_list_packages_of_one_zone(client, world, packages):
    response = await client.get(
        f"/v1/clubs/{world.club_id}/packages", params={"zone_id": str(world.vip_zone_id)}
    )
    assert [p["id"] for p in response.json()] == [str(packages.vip_night)]


async def test_night_label_follows_the_configured_night_hours(client, world, packages, settings):
    settings.night_start = time(17, 0)  # now the Day window (13:00-18:00) reaches into the night
    items = (await client.get(f"/v1/clubs/{world.club_id}/packages")).json()
    assert {p["name"]: p["is_night"] for p in items if p["zone_name"] == "Standard"} == {
        "3 hours": False,
        "Day": True,
        "Night": True,
    }


async def test_packages_of_an_unknown_club_are_404(client, world):
    response = await client.get(f"/v1/clubs/{uuid.uuid7()}/packages")
    assert response.status_code == 404
    assert code(response) == "NOT_FOUND"


# --- end time and price come from the package ----------------------------------------------------


async def test_duration_package_sets_the_end_and_the_price(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(
        client, headers, world.pc_ids[0], at(1, 18), package_id=packages.three_hours
    )

    assert response.status_code == 201, response.text
    booking = response.json()
    assert parse_dt(booking["starts_at"]) == at(1, 18)
    assert parse_dt(booking["ends_at"]) == at(1, 21)
    assert booking["price_kzt"] == 2500  # not 3 h x 1000
    assert booking["package_id"] == str(packages.three_hours)
    assert booking["status"] == "pending_payment"


async def test_window_package_runs_until_the_window_ends(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(client, headers, world.pc_ids[0], at(1, 14), package_id=packages.day)

    assert response.status_code == 201, response.text
    booking = response.json()
    assert parse_dt(booking["ends_at"]) == at(1, 18)
    assert booking["price_kzt"] == 3000  # the full package price, whenever it starts


async def test_window_package_must_start_inside_its_window(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(client, headers, world.pc_ids[0], at(1, 19), package_id=packages.day)

    assert response.status_code == 422
    assert code(response) == "OUTSIDE_PACKAGE_WINDOW"
    assert response.json()["error"]["details"] == {
        "window_start": "13:00",
        "window_end": "18:00",
        "timezone": "Asia/Almaty",
    }
    history = (await client.get("/v1/bookings", headers=headers)).json()
    assert history["items"] == []  # nothing was held


async def test_hourly_booking_has_no_package(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(client, headers, world.pc_ids[0], at(1, 18), at(1, 21))
    assert response.status_code == 201
    assert response.json()["package_id"] is None
    assert response.json()["price_kzt"] == 3000


async def test_payment_charges_the_package_price(client, world, packages):
    headers = await register(client, PHONE)
    booking = (
        await book(client, headers, world.pc_ids[0], at(1, 18), package_id=packages.three_hours)
    ).json()

    response = await pay(client, headers, booking["id"])
    assert response.status_code == 201, response.text
    assert response.json()["amount_kzt"] == 2500


# --- what a package cannot be used for ------------------------------------------------------------


async def test_package_of_another_zone_is_rejected(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(
        client, headers, world.pc_ids[0], at(1, 22), package_id=packages.vip_night
    )
    assert response.status_code == 422
    assert code(response) == "PACKAGE_NOT_FOR_PC"


async def test_unknown_or_inactive_package_is_404(client, world, packages):
    headers = await register(client, PHONE)
    for package_id in (uuid.uuid7(), packages.retired):
        response = await book(client, headers, world.pc_ids[0], at(1, 18), package_id=package_id)
        assert response.status_code == 404
        assert code(response) == "NOT_FOUND"


async def test_end_and_package_exclude_each_other(client, world, packages):
    headers = await register(client, PHONE)
    base = {"pc_id": str(world.pc_ids[0]), "starts_at": at(1, 18).isoformat()}
    both = {**base, "ends_at": at(1, 20).isoformat(), "package_id": str(packages.three_hours)}

    for body in (both, base):
        response = await client.post("/v1/bookings", headers=headers, json=body)
        assert response.status_code == 422
        assert code(response) == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    ("package", "start"),
    [
        ("three_hours", at(1, 18, 15)),  # not aligned to 30 minutes
        ("three_hours", at(1, 11)),  # in the past
        ("day", at(1, 17, 30)),  # only 30 minutes of the window are left
    ],
)
async def test_slot_rules_still_apply_to_packages(client, world, packages, package, start):
    headers = await register(client, PHONE)
    response = await book(
        client, headers, world.pc_ids[0], start, package_id=getattr(packages, package)
    )
    assert response.status_code == 422
    assert code(response) == "INVALID_SLOT"


# --- the age rule: a package is no way around 22:00-06:00 ----------------------------------------


@pytest.mark.parametrize("start", [at(1, 22), at(1, 23, 30), at(2, 2), at(2, 5, 30)])
async def test_minor_cannot_book_a_night_package(client, world, packages, start):
    headers = await register(client, PHONE, MINOR_BIRTH)
    response = await book(client, headers, world.pc_ids[0], start, package_id=packages.night)

    assert response.status_code == 403
    assert code(response) == "MINOR_NIGHT_RESTRICTION"
    assert response.json()["error"]["details"] == {
        "adult_age": 18,
        "night_start": "22:00",
        "night_end": "06:00",
        "timezone": "Asia/Almaty",
    }
    history = (await client.get("/v1/bookings", headers=headers)).json()
    assert history["items"] == []  # nothing was held


async def test_adult_can_book_a_night_package(client, world, packages):
    headers = await register(client, PHONE, ADULT_BIRTH)
    response = await book(client, headers, world.pc_ids[0], at(1, 22), package_id=packages.night)

    assert response.status_code == 201, response.text
    booking = response.json()
    assert parse_dt(booking["ends_at"]) == at(2, 8)
    assert booking["price_kzt"] == 4000


async def test_minor_cannot_run_a_duration_package_into_the_night(client, world, packages):
    """The rule looks at the booked interval, not at the package's name or kind."""
    headers = await register(client, PHONE, MINOR_BIRTH)
    pc = world.pc_ids[0]

    response = await book(client, headers, pc, at(1, 20), package_id=packages.three_hours)
    assert code(response) == "MINOR_NIGHT_RESTRICTION"  # 20:00-23:00
    response = await book(client, headers, pc, at(1, 19), package_id=packages.three_hours)
    assert response.status_code == 201, response.text  # 19:00-22:00 ends exactly at 22:00


async def test_minor_can_book_a_day_package(client, world, packages):
    headers = await register(client, PHONE, MINOR_BIRTH)
    response = await book(client, headers, world.pc_ids[0], at(1, 14), package_id=packages.day)
    assert response.status_code == 201, response.text


async def test_minor_may_use_the_morning_tail_of_a_night_package(client, world, packages):
    """06:00-08:00 is not night, so the night package is open to a minor from 06:00 on."""
    headers = await register(client, PHONE, MINOR_BIRTH)
    response = await book(client, headers, world.pc_ids[0], at(2, 6), package_id=packages.night)

    assert response.status_code == 201, response.text
    assert parse_dt(response.json()["ends_at"]) == at(2, 8)


# --- double booking -------------------------------------------------------------------------------


@pytest.mark.requires_overlap_constraints
async def test_package_booking_blocks_the_pc_for_its_whole_interval(client, world, packages):
    first = await register(client, PHONE, serial=1)
    second = await register(client, OTHER_PHONE, serial=2)
    pc = world.pc_ids[0]
    response = await book(client, first, pc, at(1, 22), package_id=packages.night)  # until 08:00
    assert response.status_code == 201, response.text

    hourly = await book(client, second, pc, at(2, 2), at(2, 4))
    assert (hourly.status_code, code(hourly)) == (409, "SLOT_TAKEN")
    with_package = await book(client, second, pc, at(1, 20), package_id=packages.three_hours)
    assert (with_package.status_code, code(with_package)) == (409, "SLOT_TAKEN")  # 20:00-23:00
    same_package = await book(client, second, pc, at(2, 1), package_id=packages.night)
    assert (same_package.status_code, code(same_package)) == (409, "SLOT_TAKEN")

    # Another PC is free, and so is this one from the moment the package ends.
    assert (await book(client, second, world.pc_ids[1], at(2, 2), at(2, 4))).status_code == 201
    assert (await book(client, second, pc, at(2, 8), at(2, 10))).status_code == 201


@pytest.mark.requires_overlap_constraints
async def test_hourly_booking_blocks_a_package_on_the_same_pc(client, world, packages):
    first = await register(client, PHONE, serial=1)
    second = await register(client, OTHER_PHONE, serial=2)
    pc = world.pc_ids[0]
    assert (await book(client, first, pc, at(1, 16), at(1, 18))).status_code == 201

    response = await book(client, second, pc, at(1, 14), package_id=packages.day)  # until 18:00
    assert (response.status_code, code(response)) == (409, "SLOT_TAKEN")


@pytest.mark.requires_overlap_constraints
async def test_user_cannot_hold_two_overlapping_package_bookings(client, world, packages):
    headers = await register(client, PHONE)
    response = await book(
        client, headers, world.pc_ids[0], at(1, 18), package_id=packages.three_hours
    )
    assert response.status_code == 201, response.text

    response = await book(
        client, headers, world.pc_ids[1], at(1, 20), package_id=packages.three_hours
    )
    assert (response.status_code, code(response)) == (409, "USER_BOOKING_OVERLAP")


@pytest.mark.requires_overlap_constraints
async def test_two_users_racing_for_one_night_package_slot(
    committed_client, committed_world, committed_packages
):
    client, world, packages = committed_client, committed_world, committed_packages
    first = await register(client, PHONE, serial=1)
    second = await register(client, OTHER_PHONE, serial=2)

    responses = await asyncio.gather(
        book(client, first, world.pc_ids[0], at(1, 22), package_id=packages.night),
        book(client, second, world.pc_ids[0], at(1, 23), package_id=packages.night),
    )

    assert sorted(r.status_code for r in responses) == [201, 409]
    loser = next(r for r in responses if r.status_code == 409)
    assert code(loser) == "SLOT_TAKEN"


@pytest.mark.requires_overlap_constraints
async def test_one_user_double_submitting_a_package(
    committed_client, committed_world, committed_packages
):
    client, world, packages = committed_client, committed_world, committed_packages
    headers = await register(client, PHONE)

    responses = await asyncio.gather(
        book(client, headers, world.pc_ids[0], at(1, 18), package_id=packages.three_hours),
        book(client, headers, world.pc_ids[1], at(1, 18), package_id=packages.three_hours),
    )

    assert sorted(r.status_code for r in responses) == [201, 409]
    loser = next(r for r in responses if r.status_code == 409)
    assert code(loser) == "USER_BOOKING_OVERLAP"
