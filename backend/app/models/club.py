import uuid
from datetime import datetime, time
from enum import StrEnum
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.packages import PackageTerms
from app.models.base import Base, created_at_column, uuid_fk_type, uuid_pk

DEFAULT_TIMEZONE = "Asia/Almaty"


class PcStatus(StrEnum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


class Club(Base):
    __tablename__ = "clubs"
    __table_args__ = (
        CheckConstraint(
            "(opens_at IS NULL) = (closes_at IS NULL)", name="opening_hours_both_or_none"
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    organization_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default=DEFAULT_TIMEZONE)
    # Both NULL = open 24/7. closes_at <= opens_at = closes after midnight.
    opens_at: Mapped[time | None] = mapped_column(Time)
    closes_at: Mapped[time | None] = mapped_column(Time)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_column()

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)


class Zone(Base):
    """Group of PCs with one hourly price (Standard, VIP, Bootcamp...)."""

    __tablename__ = "zones"
    __table_args__ = (
        UniqueConstraint("club_id", "name"),
        CheckConstraint("price_per_hour_kzt >= 0", name="price_non_negative"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    club_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_per_hour_kzt: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_column()


class Pc(Base):
    __tablename__ = "pcs"
    __table_args__ = (
        UniqueConstraint("club_id", "label"),
        CheckConstraint("status IN ('active', 'maintenance', 'retired')", name="status_valid"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    club_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("zones.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    specs: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PcStatus.ACTIVE)
    created_at: Mapped[datetime] = created_at_column()

    zone: Mapped[Zone] = relationship(lazy="raise")
    club: Mapped[Club] = relationship(lazy="raise")


class Package(Base):
    """Fixed-price block of time in one zone: a duration or a daily window (domain/packages.py).

    Whether a package touches the restricted night hours is not stored: it is derived from the
    window and the configured night hours, so it cannot drift from the rule that is enforced.
    """

    __tablename__ = "packages"
    __table_args__ = (
        UniqueConstraint("zone_id", "name"),
        CheckConstraint("price_kzt >= 0", name="price_non_negative"),
        CheckConstraint(
            "(duration_minutes IS NOT NULL AND duration_minutes > 0"
            " AND window_start IS NULL AND window_end IS NULL)"
            " OR (duration_minutes IS NULL AND window_start IS NOT NULL"
            " AND window_end IS NOT NULL AND window_start <> window_end)",
            name="duration_or_window",
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    zone_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Either duration_minutes, or a club-local window (window_end <= window_start = overnight).
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    window_start: Mapped[time | None] = mapped_column(Time)
    window_end: Mapped[time | None] = mapped_column(Time)
    price_kzt: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_column()

    @property
    def terms(self) -> PackageTerms:
        return PackageTerms(self.duration_minutes, self.window_start, self.window_end)
