"""packages

Fixed-price packages per zone (a duration, or a daily club-local window) and the optional
package a booking was made with.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "packages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("zone_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("window_start", sa.Time(), nullable=True),
        sa.Column("window_end", sa.Time(), nullable=True),
        sa.Column("price_kzt", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(duration_minutes IS NOT NULL AND duration_minutes > 0"
            " AND window_start IS NULL AND window_end IS NULL)"
            " OR (duration_minutes IS NULL AND window_start IS NOT NULL"
            " AND window_end IS NOT NULL AND window_start <> window_end)",
            name=op.f("ck_packages_duration_or_window"),
        ),
        sa.CheckConstraint("price_kzt >= 0", name=op.f("ck_packages_price_non_negative")),
        sa.ForeignKeyConstraint(
            ["zone_id"], ["zones.id"], name=op.f("fk_packages_zone_id_zones"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_packages")),
        sa.UniqueConstraint("zone_id", "name", name=op.f("uq_packages_zone_id_name")),
    )
    op.create_index(op.f("ix_packages_zone_id"), "packages", ["zone_id"], unique=False)
    op.add_column("bookings", sa.Column("package_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f("fk_bookings_package_id_packages"),
        "bookings",
        "packages",
        ["package_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("fk_bookings_package_id_packages"), "bookings", type_="foreignkey")
    op.drop_column("bookings", "package_id")
    op.drop_index(op.f("ix_packages_zone_id"), table_name="packages")
    op.drop_table("packages")
