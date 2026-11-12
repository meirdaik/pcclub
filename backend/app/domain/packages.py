"""Pricing packages. Pure functions, no I/O.

A package sells a block of time in one zone for a fixed price. Two kinds:

  * duration - N minutes from the chosen start ("3 hours for the price of 2");
  * window   - from the chosen start until the end of a daily club-local window
               ("Day 09:00-18:00", "Night 22:00-08:00"). The start must lie inside the window;
               a window whose end is not after its start crosses midnight.

A package only decides when the booking ends and what it costs. Every other rule (slot
alignment, opening hours and above all the age rule) is applied to the resulting interval
exactly as for an hourly booking, so a night package gives a minor no way around 22:00-06:00.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta, tzinfo
from typing import Literal

PackageKind = Literal["duration", "window"]

_DAY_MINUTES = 24 * 60


class OutsidePackageWindow(ValueError):
    """The chosen start is not inside the package's daily window."""


@dataclass(frozen=True)
class PackageTerms:
    """Either `duration_minutes`, or both `window_start` and `window_end` (club-local)."""

    duration_minutes: int | None = None
    window_start: time | None = None
    window_end: time | None = None

    def __post_init__(self) -> None:
        has_window = self.window_start is not None or self.window_end is not None
        if (self.duration_minutes is not None) == has_window:
            raise ValueError("a package is either a duration or a window, not both or neither")
        if has_window:
            if self.window_start is None or self.window_end is None:
                raise ValueError("a window needs both a start and an end")
            if self.window_start == self.window_end:
                raise ValueError("a window must not be empty")
        elif self.duration_minutes <= 0:  # type: ignore[operator]
            raise ValueError("duration must be positive")

    @property
    def kind(self) -> PackageKind:
        return "duration" if self.duration_minutes is not None else "window"


def package_end(terms: PackageTerms, starts_at: datetime, tz: tzinfo) -> datetime:
    """When a booking of this package ends if it starts at `starts_at`.

    Raises OutsidePackageWindow if a window package is started outside its window.
    """
    if starts_at.tzinfo is None:
        raise ValueError("naive datetimes are not allowed")
    if terms.duration_minutes is not None:
        return starts_at + timedelta(minutes=terms.duration_minutes)

    assert terms.window_start is not None and terms.window_end is not None
    start = starts_at.astimezone(UTC)
    overnight = terms.window_end <= terms.window_start
    local_day = starts_at.astimezone(tz).date()
    # The start may fall in the window that opened today or, past midnight, yesterday.
    for day in (local_day - timedelta(days=1), local_day):
        window_start = datetime.combine(day, terms.window_start, tzinfo=tz).astimezone(UTC)
        end_day = day + timedelta(days=1) if overnight else day
        window_end = datetime.combine(end_day, terms.window_end, tzinfo=tz).astimezone(UTC)
        if window_start <= start < window_end:
            return window_end
    raise OutsidePackageWindow(
        f"this package can only start between {terms.window_start:%H:%M} "
        f"and {terms.window_end:%H:%M} club time"
    )


def _segments(start: time, end: time) -> list[tuple[int, int]]:
    """A daily [start, end) interval as minute ranges within one day (two if it wraps)."""
    a, b = start.hour * 60 + start.minute, end.hour * 60 + end.minute
    if a < b:
        return [(a, b)]
    return [(a, _DAY_MINUTES), (0, b)]


def window_overlaps_night(
    window_start: time, window_end: time, night_start: time, night_end: time
) -> bool:
    """Whether a daily window shares any time with the restricted night hours.

    Used only to label a package ("18+ at night") for clients. Enforcement is always done on
    the actual booking interval by the age rule.
    """
    return any(
        a < d and c < b
        for a, b in _segments(window_start, window_end)
        for c, d in _segments(night_start, night_end)
    )
