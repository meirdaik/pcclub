"""kiosk client: sessions, tariffs, transactions, snack orders, user accounts

Schema for the Windows kiosk client work, which had changed the models without a migration:

- users: optional username/email/password login, a balance and a role; phone widened to 32.
- pcs: kiosk fields (name, current user, remaining seconds, current game) and session_status
  (FREE/BUSY). `status` keeps its meaning (active/maintenance/retired) and its check.
- pcs.specs and payments.raw become JSON instead of JSONB (values convert without loss).
- new tables: tariffs, gaming_sessions, transactions, snack_orders.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _created_at() -> sa.Column:
    return sa.Column(
        "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


def upgrade() -> None:
    # --- users ---
    op.alter_column(
        "users",
        "phone",
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
    op.add_column("users", sa.Column("username", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    # Existing rows get the model defaults; the server default is then dropped because the
    # application always supplies the value.
    op.add_column(
        "users", sa.Column("balance_kzt", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "users", sa.Column("role", sa.String(length=20), nullable=False, server_default="player")
    )
    op.alter_column("users", "balance_kzt", server_default=None)
    op.alter_column("users", "role", server_default=None)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # --- pcs ---
    op.add_column("pcs", sa.Column("name", sa.String(length=50), nullable=True))
    op.add_column(
        "pcs",
        sa.Column("session_status", sa.String(length=20), nullable=False, server_default="FREE"),
    )
    op.add_column("pcs", sa.Column("current_user_id", sa.UUID(), nullable=True))
    op.add_column(
        "pcs", sa.Column("remaining_seconds", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column("pcs", sa.Column("current_game", sa.String(length=100), nullable=True))
    op.alter_column("pcs", "session_status", server_default=None)
    op.alter_column("pcs", "remaining_seconds", server_default=None)
    op.create_check_constraint(
        op.f("ck_pcs_session_status_valid"), "pcs", "session_status IN ('FREE', 'BUSY')"
    )
    op.create_foreign_key(
        op.f("fk_pcs_current_user_id_users"),
        "pcs",
        "users",
        ["current_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column(
        "pcs",
        "specs",
        existing_type=postgresql.JSONB(),
        type_=sa.JSON(),
        existing_nullable=False,
        postgresql_using="specs::json",
    )

    # --- payments ---
    op.alter_column(
        "payments",
        "raw",
        existing_type=postgresql.JSONB(),
        type_=sa.JSON(),
        existing_nullable=False,
        postgresql_using="raw::json",
    )

    # --- kiosk tables ---
    op.create_table(
        "tariffs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("club_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("zone", sa.String(length=50), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price_kzt", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["club_id"], ["clubs.id"], name=op.f("fk_tariffs_club_id_clubs"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tariffs")),
    )
    op.create_index(op.f("ix_tariffs_club_id"), "tariffs", ["club_id"], unique=False)

    op.create_table(
        "gaming_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("pc_id", sa.UUID(), nullable=False),
        sa.Column("tariff_id", sa.UUID(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("remaining_seconds", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("active_game", sa.String(length=100), nullable=True),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["pc_id"], ["pcs.id"], name=op.f("fk_gaming_sessions_pc_id_pcs"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tariff_id"],
            ["tariffs.id"],
            name=op.f("fk_gaming_sessions_tariff_id_tariffs"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_gaming_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gaming_sessions")),
    )
    op.create_index(op.f("ix_gaming_sessions_pc_id"), "gaming_sessions", ["pc_id"], unique=False)
    op.create_index(
        op.f("ix_gaming_sessions_user_id"), "gaming_sessions", ["user_id"], unique=False
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("pc_id", sa.UUID(), nullable=True),
        sa.Column("amount_kzt", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["pc_id"], ["pcs.id"], name=op.f("fk_transactions_pc_id_pcs"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_transactions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transactions")),
    )
    op.create_index(op.f("ix_transactions_user_id"), "transactions", ["user_id"], unique=False)

    op.create_table(
        "snack_orders",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("pc_id", sa.String(length=50), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("amount_kzt", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_snack_orders_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_snack_orders")),
    )
    op.create_index(op.f("ix_snack_orders_user_id"), "snack_orders", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_snack_orders_user_id"), table_name="snack_orders")
    op.drop_table("snack_orders")
    op.drop_index(op.f("ix_transactions_user_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_gaming_sessions_user_id"), table_name="gaming_sessions")
    op.drop_index(op.f("ix_gaming_sessions_pc_id"), table_name="gaming_sessions")
    op.drop_table("gaming_sessions")
    op.drop_index(op.f("ix_tariffs_club_id"), table_name="tariffs")
    op.drop_table("tariffs")

    op.alter_column(
        "payments",
        "raw",
        existing_type=sa.JSON(),
        type_=postgresql.JSONB(),
        existing_nullable=False,
        postgresql_using="raw::jsonb",
    )

    op.alter_column(
        "pcs",
        "specs",
        existing_type=sa.JSON(),
        type_=postgresql.JSONB(),
        existing_nullable=False,
        postgresql_using="specs::jsonb",
    )
    op.drop_constraint(op.f("fk_pcs_current_user_id_users"), "pcs", type_="foreignkey")
    op.drop_constraint(op.f("ck_pcs_session_status_valid"), "pcs", type_="check")
    op.drop_column("pcs", "current_game")
    op.drop_column("pcs", "remaining_seconds")
    op.drop_column("pcs", "current_user_id")
    op.drop_column("pcs", "session_status")
    op.drop_column("pcs", "name")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "balance_kzt")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
    op.drop_column("users", "username")
    # Narrowing back fails if a phone longer than 16 characters was stored meanwhile.
    op.alter_column(
        "users",
        "phone",
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        existing_nullable=False,
    )
