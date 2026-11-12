import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, created_at_column, tz_datetime, uuid_fk_type, uuid_pk


class SessionStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"


class Tariff(Base):
    """Tariff packages available for PC Club customers (e.g. 1 hour, 3 hours, Night Pack)."""

    __tablename__ = "tariffs"

    id: Mapped[uuid.UUID] = uuid_pk()
    club_id: Mapped[uuid.UUID | None] = mapped_column(
        uuid_fk_type, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    zone: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Standard"
    )  # "Standard", "VIP"
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    price_kzt: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at_column()

    @property
    def price(self) -> int:
        return self.price_kzt


class GamingSession(Base):
    """Real-time active gaming session on a physical PC kiosk."""

    __tablename__ = "gaming_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pc_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("pcs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tariff_id: Mapped[uuid.UUID | None] = mapped_column(
        uuid_fk_type, ForeignKey("tariffs.id", ondelete="SET NULL"), nullable=True
    )
    start_time: Mapped[datetime] = mapped_column(tz_datetime, nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(tz_datetime, nullable=True)
    remaining_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=3600)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=SessionStatus.ACTIVE)
    active_game: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = created_at_column()

    tariff: Mapped[Tariff | None] = relationship(lazy="joined")


class Transaction(Base):
    """User balance ledger or payment record."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pc_id: Mapped[uuid.UUID | None] = mapped_column(
        uuid_fk_type, ForeignKey("pcs.id", ondelete="SET NULL"), nullable=True
    )
    amount_kzt: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="DEPOSIT"
    )  # DEPOSIT, SESSION, SNACK
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SUCCEEDED")
    created_at: Mapped[datetime] = created_at_column()

    @property
    def amount(self) -> int:
        return self.amount_kzt


class SnackOrder(Base):
    """Food and beverage order placed from desktop kiosk or mobile."""

    __tablename__ = "snack_orders"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        uuid_fk_type, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pc_id: Mapped[str] = mapped_column(String(50), nullable=False, default="pc-001")
    items: Mapped[dict[str, Any] | list[Any]] = mapped_column(JSON, nullable=False, default=list)
    amount_kzt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING"
    )  # PENDING, DELIVERED, CANCELLED
    created_at: Mapped[datetime] = created_at_column()

    @property
    def amount(self) -> int:
        return self.amount_kzt


class CashierShift(Base):
    """Cashier work shift (Z-Report) tracking revenue, sessions, and orders."""

    __tablename__ = "cashier_shifts"

    id: Mapped[uuid.UUID] = uuid_pk()
    cashier_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Admin Cashier")
    opened_at: Mapped[datetime] = created_at_column()
    closed_at: Mapped[datetime | None] = mapped_column(tz_datetime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    total_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    session_revenue_kzt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    order_revenue_kzt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_revenue_kzt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
