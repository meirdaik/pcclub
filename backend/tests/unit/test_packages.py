from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.domain.age_rule import violates_night_restriction
from app.domain.packages import (
    OutsidePackageWindow,
    PackageTerms,
    package_end,
    window_overlaps_night,
)

ALMATY = ZoneInfo("Asia/Almaty")
THREE_HOURS = PackageTerms(duration_minutes=180)
DAY = PackageTerms(window_start=time(9), window_end=time(18))
NIGHT = PackageTerms(window_start=time(22), window_end=time(8))


def at(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 6, day, hour, minute, tzinfo=ALMATY)


# --- terms -------------------------------------------------------------------------------------


def test_kinds():
    assert THREE_HOURS.kind == "duration"
    assert DAY.kind == "window"
    assert NIGHT.kind == "window"


@pytest.mark.parametrize(
    "kwargs",
    [
        {},  # neither
        {"duration_minutes": 180, "window_start": time(9), "window_end": time(18)},  # both
        {"window_start": time(9)},  # half a window
        {"window_end": time(18)},
        {"window_start": time(9), "window_end": time(9)},  # empty window
        {"duration_minutes": 0},
        {"duration_minutes": -60},
    ],
)
def test_invalid_terms(kwargs):
    with pytest.raises(ValueError):
        PackageTerms(**kwargs)


# --- duration packages -------------------------------------------------------------------------


def test_duration_package_ends_after_its_length():
    assert package_end(THREE_HOURS, at(1, 14), ALMATY) == at(1, 17)
    assert package_end(THREE_HOURS, at(1, 22, 30), ALMATY) == at(2, 1, 30)  # across midnight


def test_duration_package_has_no_time_of_day_limit():
    for hour in range(24):
        assert package_end(THREE_HOURS, at(1, hour), ALMATY) - at(1, hour) == timedelta(hours=3)


# --- window packages ---------------------------------------------------------------------------


@pytest.mark.parametrize("start", [at(1, 9), at(1, 12, 30), at(1, 17), at(1, 17, 30)])
def test_day_window_runs_until_its_end(start):
    assert package_end(DAY, start, ALMATY) == at(1, 18)


@pytest.mark.parametrize("start", [at(1, 8, 30), at(1, 18), at(1, 20), at(1, 0)])
def test_day_window_rejects_starts_outside(start):
    with pytest.raises(OutsidePackageWindow, match=r"09:00.*18:00"):
        package_end(DAY, start, ALMATY)


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (at(1, 22), at(2, 8)),  # the whole night
        (at(1, 23, 30), at(2, 8)),
        (at(2, 0), at(2, 8)),  # after midnight belongs to the window that opened yesterday
        (at(2, 3), at(2, 8)),
        (at(2, 7, 30), at(2, 8)),
    ],
)
def test_overnight_window(start, end):
    assert package_end(NIGHT, start, ALMATY) == end


@pytest.mark.parametrize("start", [at(1, 21, 30), at(2, 8), at(2, 12)])
def test_overnight_window_rejects_starts_outside(start):
    with pytest.raises(OutsidePackageWindow):
        package_end(NIGHT, start, ALMATY)


def test_window_is_on_the_club_clock():
    # 04:00 UTC is 09:00 in Almaty: inside the day window although it is night in UTC.
    start = datetime(2026, 6, 1, 4, 0, tzinfo=UTC)
    assert package_end(DAY, start, ALMATY) == at(1, 18)
    # The same instant is 13:00 in Tokyo; there the window ends at 18:00 Tokyo time.
    tokyo = ZoneInfo("Asia/Tokyo")
    assert package_end(DAY, start, tokyo) == datetime(2026, 6, 1, 18, 0, tzinfo=tokyo)
    # 23:00 UTC is 04:00 next day in Almaty: outside the day window, inside the night one.
    late = datetime(2026, 6, 1, 23, 0, tzinfo=UTC)
    with pytest.raises(OutsidePackageWindow):
        package_end(DAY, late, ALMATY)
    assert package_end(NIGHT, late, ALMATY) == at(2, 8)


def test_naive_start_is_rejected():
    with pytest.raises(ValueError, match="naive"):
        package_end(THREE_HOURS, datetime(2026, 6, 1, 14), ALMATY)


# --- night label -------------------------------------------------------------------------------

RESTRICTED = (time(22), time(6))


@pytest.mark.parametrize(
    ("start", "end", "overlaps"),
    [
        (time(9), time(18), False),  # day
        (time(6), time(22), False),  # exactly the allowed day: touches both edges, no overlap
        (time(22), time(8), True),  # night package
        (time(18), time(23), True),  # evening running one hour into the night
        (time(5), time(9), True),  # early morning
        (time(0), time(6), True),
        (time(20), time(22), False),
        (time(12), time(4), True),  # overnight club hours
    ],
)
def test_window_overlaps_night(start, end, overlaps):
    assert window_overlaps_night(start, end, *RESTRICTED) is overlaps


def test_window_overlaps_a_daytime_restriction():
    # A non-wrapping restricted period, to cover both shapes of the comparison.
    assert window_overlaps_night(time(9), time(18), time(12), time(14))
    assert not window_overlaps_night(time(22), time(8), time(12), time(14))


# --- packages never bypass the age rule ---------------------------------------------------------

MINOR = date(2010, 3, 10)  # 16 in June 2026
ADULT = date(2000, 3, 10)


def _violates(birth_date, terms, start):
    return violates_night_restriction(birth_date, start, package_end(terms, start, ALMATY), ALMATY)


@pytest.mark.parametrize("start", [at(1, 22), at(1, 23, 30), at(2, 0), at(2, 5, 30)])
def test_minor_cannot_use_a_night_package_during_the_night(start):
    assert _violates(MINOR, NIGHT, start)
    assert not _violates(ADULT, NIGHT, start)


def test_night_package_tail_after_six_is_ordinary_daytime():
    # 06:00-08:00 is outside the restricted hours, whatever package pays for it.
    assert not _violates(MINOR, NIGHT, at(2, 6))


def test_minor_duration_package_must_end_by_22():
    assert not _violates(MINOR, THREE_HOURS, at(1, 19))  # 19:00-22:00
    assert _violates(MINOR, THREE_HOURS, at(1, 19, 30))  # 19:30-22:30
    assert _violates(MINOR, THREE_HOURS, at(2, 4))  # 04:00-07:00
    assert not _violates(MINOR, THREE_HOURS, at(2, 6))  # 06:00-09:00


def test_minor_day_package_is_fine():
    assert not _violates(MINOR, DAY, at(1, 9))
    assert not _violates(MINOR, DAY, at(1, 15))
