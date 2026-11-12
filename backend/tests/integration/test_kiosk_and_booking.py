"""The kiosk's live session state and the booking catalog are independent.

`pcs.status` is the lifecycle (active / maintenance / retired) that decides whether a PC is
listed and bookable. `pcs.session_status` (FREE / BUSY) is what the kiosk writes when someone
sits down or leaves. Neither may change the other.
"""

from sqlalchemy import select

from app.models import GamingSession, Pc, PcStatus
from tests.integration.helpers import at, book, code, register

PHONE = "+77010000001"


async def _pc(db, pc_id) -> Pc:
    return await db.scalar(
        select(Pc).where(Pc.id == pc_id).execution_options(populate_existing=True)
    )


async def _unlock(client, pc_id, username: str, seconds: int = 3600):
    return await client.post(
        f"/v1/pc/{pc_id}/unlock", json={"username": username, "remaining_seconds": seconds}
    )


async def _listed_pc_ids(client, club_id) -> set[str]:
    response = await client.get(f"/v1/clubs/{club_id}/pcs")
    assert response.status_code == 200, response.text
    return {pc["id"] for pc in response.json()}


async def test_new_pc_is_active_and_free(db, world):
    pc = await _pc(db, world.pc_ids[0])
    assert pc.status == PcStatus.ACTIVE
    assert pc.session_status == "FREE"


async def test_pc_with_an_active_kiosk_session_stays_in_the_catalog(client, db, world):
    headers = await register(client, PHONE)
    pc_id = world.pc_ids[0]

    response = await _unlock(client, pc_id, PHONE)
    assert response.status_code == 200, response.text

    pc = await _pc(db, pc_id)
    assert pc.session_status == "BUSY"  # the kiosk state changed ...
    assert pc.status == PcStatus.ACTIVE  # ... the lifecycle did not
    assert pc.remaining_seconds == 3600
    assert pc.current_user_id is not None
    sessions = list(await db.scalars(select(GamingSession).where(GamingSession.pc_id == pc_id)))
    assert len(sessions) == 1

    assert str(pc_id) in await _listed_pc_ids(client, world.club_id)
    # Someone playing now does not stop a booking for a later slot.
    response = await book(client, headers, pc_id, at(1, 18), at(1, 20))
    assert response.status_code == 201, response.text


async def test_booking_does_not_touch_the_kiosk_state(client, db, world):
    headers = await register(client, PHONE)
    pc_id = world.pc_ids[0]

    assert (await book(client, headers, pc_id, at(1, 18), at(1, 20))).status_code == 201

    pc = await _pc(db, pc_id)
    assert pc.session_status == "FREE"
    assert pc.status == PcStatus.ACTIVE
    assert pc.remaining_seconds == 0
    assert pc.current_user_id is None


async def test_locking_frees_the_kiosk_and_keeps_bookings(client, db, world):
    headers = await register(client, PHONE)
    pc_id = world.pc_ids[0]
    await _unlock(client, pc_id, PHONE)
    booking = (await book(client, headers, pc_id, at(1, 18), at(1, 20))).json()

    response = await client.post(f"/v1/pc/{pc_id}/lock")
    assert response.status_code == 200, response.text

    pc = await _pc(db, pc_id)
    assert pc.session_status == "FREE"
    assert pc.status == PcStatus.ACTIVE
    assert pc.remaining_seconds == 0
    assert pc.current_user_id is None

    response = await client.get(f"/v1/bookings/{booking['id']}", headers=headers)
    assert response.json()["status"] == "pending_payment"
    assert str(pc_id) in await _listed_pc_ids(client, world.club_id)


async def test_lifecycle_still_decides_what_is_bookable(client, db, world):
    """A PC under maintenance is hidden and unbookable whatever the kiosk state says."""
    headers = await register(client, PHONE)
    pc_id = world.pc_ids[0]
    pc = await _pc(db, pc_id)
    pc.status = PcStatus.MAINTENANCE
    await db.commit()

    assert str(pc_id) not in await _listed_pc_ids(client, world.club_id)
    response = await book(client, headers, pc_id, at(1, 18), at(1, 20))
    assert (response.status_code, code(response)) == (409, "PC_UNAVAILABLE")

    # The kiosk can still be operated (staff testing the machine); it stays unbookable.
    assert (await _unlock(client, pc_id, PHONE)).status_code == 200
    pc = await _pc(db, pc_id)
    assert (pc.status, pc.session_status) == (PcStatus.MAINTENANCE, "BUSY")
    assert str(pc_id) not in await _listed_pc_ids(client, world.club_id)
