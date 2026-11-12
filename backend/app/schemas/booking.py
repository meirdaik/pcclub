import uuid
from datetime import datetime
from typing import Literal, Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, model_validator

BookingStatusLiteral = Literal[
    "pending_payment", "confirmed", "completed", "cancelled", "expired", "no_show"
]


class BookingCreate(BaseModel):
    pc_id: uuid.UUID
    # Must carry a UTC offset, e.g. 2026-06-01T18:00:00+05:00.
    starts_at: AwareDatetime
    # Exactly one of the two: an explicit end (hourly price), or a package of the PC's zone,
    # which decides both the end time and the price.
    ends_at: AwareDatetime | None = None
    package_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _end_or_package(self) -> Self:
        if (self.ends_at is None) == (self.package_id is None):
            raise ValueError("send either ends_at or package_id, not both and not neither")
        return self


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    pc_id: uuid.UUID
    club_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: BookingStatusLiteral
    hold_expires_at: datetime | None
    price_kzt: int
    package_id: uuid.UUID | None  # null for an hourly booking
    created_at: datetime
    cancelled_at: datetime | None


class BookingPage(BaseModel):
    items: list[BookingOut]
    next_cursor: uuid.UUID | None
