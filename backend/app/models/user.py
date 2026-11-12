import uuid
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_column, tz_datetime, uuid_pk


class IdentityStatus(StrEnum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    """Customer. Global across organizations: one account works in every club."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "identity_status IN ('unverified', 'verified', 'rejected')",
            name="identity_status_valid",
        ),
        CheckConstraint(
            "identity_status <> 'verified' OR (birth_date IS NOT NULL AND iin_hash IS NOT NULL)",
            name="verified_has_identity",
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    phone: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)  # E.164
    username: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    balance_kzt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="player")  # "player" or "admin"
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))

    # IIN is PII: encrypted at rest, HMAC for uniqueness. Never log or return it unmasked.
    iin_encrypted: Mapped[str | None] = mapped_column(Text)
    iin_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    birth_date: Mapped[date | None] = mapped_column(Date)
    identity_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=IdentityStatus.UNVERIFIED
    )
    identity_verified_at: Mapped[datetime | None] = mapped_column(tz_datetime)

    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = created_at_column()

    @property
    def balance(self) -> int:
        return self.balance_kzt

    @property
    def is_identity_verified(self) -> bool:
        return self.identity_status == IdentityStatus.VERIFIED and self.birth_date is not None
