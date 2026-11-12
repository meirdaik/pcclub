"""HTTP endpoints to control PC stations, telemetry, live admin map, and kiosk sessions."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SettingsDep
from app.api.v1.pc_ws import _resolve_pc
from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import verify_password
from app.models.club import Pc, Zone
from app.models.kiosk import GamingSession, SessionStatus, SnackOrder, Tariff, Transaction
from app.models.user import User
from app.services.pc_session import PcSessionManager, get_pc_session_manager

router = APIRouter(prefix="/pc", tags=["pc-control"])
admin_router = APIRouter(prefix="/admin", tags=["admin-kiosk"])
logger = logging.getLogger("pcclub.pc_control")


# ------------------------------------------------------------------
# Request / response schemas
# ------------------------------------------------------------------


class UnlockRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=200)
    password: str | None = None
    remaining_seconds: int = Field(3600, gt=0)
    tariff_id: str | None = None


class ExtendRequest(BaseModel):
    additional_seconds: int = Field(1800, gt=0)  # Default +30 min


class OrderItem(BaseModel):
    name: str
    quantity: int = 1
    price_kzt: int


class OrderRequest(BaseModel):
    items: list[OrderItem]
    total_kzt: int
    note: str | None = None


class CallAdminRequest(BaseModel):
    reason: str = "Assistance"
    message: str | None = None


class CommandResult(BaseModel):
    ok: bool
    detail: str
    data: dict[str, Any] | None = None


# ------------------------------------------------------------------
# PC Control Endpoints
# ------------------------------------------------------------------


@router.post("/{pc_id}/unlock")
async def unlock_pc(
    pc_id: str,
    body: UnlockRequest,
    session: SessionDep,
    settings: SettingsDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send UNLOCK to a connected PC kiosk client with user authentication."""
    # 1. Resolve PC in database if possible
    pc = await _resolve_pc(session, pc_id)

    # 2. Check user credentials if password provided
    user: User | None = None
    stmt = select(User).where(or_(User.username == body.username, User.phone == body.username))
    user = (await session.scalars(stmt)).first()

    is_admin_user = False
    if user is not None:
        if body.password and user.password_hash:
            if not verify_password(user.password_hash, body.password):
                raise HTTPException(status_code=401, detail="Invalid username or password")
        is_admin_user = user.role == "admin"
    elif body.password and settings.environment != "dev":
        raise HTTPException(status_code=401, detail="User account not found")

    # 3. Create or update GamingSession record if user and pc exist
    if user and pc:
        gaming_session = GamingSession(
            user_id=user.id,
            pc_id=pc.id,
            start_time=datetime.now(timezone.utc),
            remaining_seconds=body.remaining_seconds,
            status=SessionStatus.ACTIVE,
        )
        session.add(gaming_session)
        pc.status = "BUSY"
        pc.current_user_id = user.id
        pc.remaining_seconds = body.remaining_seconds
        await session.commit()

    # 4. Push UNLOCK via WebSocket
    payload = {
        "username": body.username,
        "remaining_seconds": body.remaining_seconds,
        "is_admin": is_admin_user,
        "balance": user.balance_kzt if user else 5000,
    }

    sent = await manager.send_command(pc_id, "UNLOCK", payload)
    if not sent and pc is not None:
        sent = await manager.send_command(str(pc.id), "UNLOCK", payload)

    logger.info("PC %s: UNLOCK requested for %s (remaining: %ds, sent: %s)", pc_id, body.username, body.remaining_seconds, sent)
    return CommandResult(
        ok=True,
        detail=f"UNLOCK command sent to {pc_id}",
        data={"username": body.username, "remaining_seconds": body.remaining_seconds, "is_admin": is_admin_user},
    )


@router.post("/{pc_id}/lock")
async def lock_pc(
    pc_id: str,
    session: SessionDep,
    settings: SettingsDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send LOCK to a connected PC kiosk client."""
    pc = await _resolve_pc(session, pc_id)
    if pc:
        pc.status = "FREE"
        pc.current_user_id = None
        pc.remaining_seconds = 0
        pc.current_game = None
        await session.commit()

    sent = await manager.send_command(pc_id, "LOCK")
    if not sent and pc is not None:
        sent = await manager.send_command(str(pc.id), "LOCK")

    logger.info("PC %s: LOCK command sent", pc_id)
    return CommandResult(ok=True, detail=f"LOCK sent to {pc_id}")


@router.post("/{pc_id}/extend")
async def extend_session(
    pc_id: str,
    body: ExtendRequest,
    session: SessionDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Add time to an active session on station and push WebSocket update."""
    pc = await _resolve_pc(session, pc_id)
    state = manager.get_pc_state(pc_id)
    current_rem = state.get("remaining_seconds", 0)
    new_rem = current_rem + body.additional_seconds

    if pc:
        pc.remaining_seconds = new_rem
        await session.commit()

    payload = {"remaining_seconds": new_rem, "added_seconds": body.additional_seconds}
    sent = await manager.send_command(pc_id, "EXTEND", payload)
    if not sent and pc is not None:
        sent = await manager.send_command(str(pc.id), "EXTEND", payload)

    logger.info("PC %s: Extended +%ds (New total: %ds)", pc_id, body.additional_seconds, new_rem)
    return CommandResult(ok=True, detail=f"Session extended +{body.additional_seconds}s", data={"remaining_seconds": new_rem})


@router.post("/{pc_id}/call-admin")
async def call_admin(
    pc_id: str,
    body: CallAdminRequest,
    session: SessionDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send emergency or support call to Admin/Cashier panel."""
    msg = body.message or f"Reason: {body.reason}"
    manager.set_alert(pc_id, msg)
    logger.warning("PC %s [ALERT CALL ADMIN]: %s", pc_id, msg)
    return CommandResult(ok=True, detail=f"Admin notified for station {pc_id}")


@router.post("/{pc_id}/clear-alert")
async def clear_alert(
    pc_id: str,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Clear active alert from a station."""
    manager.clear_alert(pc_id)
    return CommandResult(ok=True, detail=f"Alert cleared for {pc_id}")


@router.post("/{pc_id}/reboot")
async def reboot_pc(
    pc_id: str,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send remote REBOOT command to connected PC kiosk."""
    sent = await manager.send_command(pc_id, "REBOOT")
    logger.info("PC %s: REBOOT command dispatched (success=%s)", pc_id, sent)
    return CommandResult(ok=True, detail=f"REBOOT command sent to {pc_id}")


@router.post("/{pc_id}/shutdown")
async def shutdown_pc(
    pc_id: str,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send remote SHUTDOWN command to connected PC kiosk."""
    sent = await manager.send_command(pc_id, "SHUTDOWN")
    logger.info("PC %s: SHUTDOWN command dispatched (success=%s)", pc_id, sent)
    return CommandResult(ok=True, detail=f"SHUTDOWN command sent to {pc_id}")


@router.post("/{pc_id}/order")
async def place_station_order(
    pc_id: str,
    body: OrderRequest,
    session: SessionDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Player orders snacks / energy drinks delivered to their station."""
    item_summary = ", ".join(f"{it.name} x{it.quantity}" for it in body.items)
    alert_msg = f"Order ({body.total_kzt}₸): {item_summary}"
    manager.set_alert(pc_id, alert_msg)

    # Record snack order in DB
    user = await session.scalar(select(User).where(User.username == "player1").limit(1))
    if user:
        snack = SnackOrder(
            user_id=user.id,
            pc_id=pc_id,
            items=[it.model_dump() for it in body.items],
            amount_kzt=body.total_kzt,
            description=item_summary,
            status="PENDING",
        )
        session.add(snack)
        await session.commit()

    logger.info("PC %s [SNACK ORDER]: %s (Total: %d₸)", pc_id, item_summary, body.total_kzt)
    return CommandResult(ok=True, detail=f"Order received for {pc_id}. Administrator dispatched.")


# ------------------------------------------------------------------
# Admin / Cashier Map Endpoints
# ------------------------------------------------------------------


@admin_router.get("/pcs")
async def list_admin_pcs(
    session: SessionDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> list[dict[str, Any]]:
    """Return all club PCs with real-time merged status (Free, Busy, Offline, Alert)."""
    db_pcs = (await session.scalars(select(Pc).options(selectinload(Pc.zone)).order_by(Pc.label))).all()
    live_states = manager.get_all_states()

    result = []
    # If DB has PCs, return them with live telemetry
    if db_pcs:
        for p in db_pcs:
            # Check telemetry by canonical id, name, or label
            pc_key = p.name or p.label.lower().replace(" ", "").replace("#", "-")
            canonical_key = f"pc-{int(''.join(filter(str.isdigit, p.label)) or 1):03d}"
            
            telemetry = (
                live_states.get(canonical_key)
                or live_states.get(p.label)
                or live_states.get(str(p.id))
                or {}
            )

            is_online = manager.is_online(canonical_key) or manager.is_online(p.label) or manager.is_online(str(p.id))
            alert = telemetry.get("alert")
            rem_sec = telemetry.get("remaining_seconds", p.remaining_seconds)
            current_user = telemetry.get("current_user")
            active_game = telemetry.get("active_game", p.current_game)

            # Determine live status: ALERT > BUSY > FREE > OFFLINE
            if alert:
                computed_status = "ALERT"
            elif rem_sec > 0:
                computed_status = "BUSY"
            elif is_online:
                computed_status = "FREE"
            else:
                computed_status = "OFFLINE"

            zone_name = "VIP" if (p.zone and "vip" in p.zone.name.lower()) or "vip" in str(p.label).lower() else "Standard"

            result.append({
                "id": str(p.id),
                "pc_id": canonical_key,
                "label": p.label,
                "name": p.name or canonical_key,
                "zone": zone_name,
                "status": computed_status,
                "online": is_online,
                "current_user": current_user,
                "remaining_seconds": rem_sec,
                "current_game": active_game,
                "alert": alert,
                "specs": p.specs,
                "cpu_usage": telemetry.get("cpu_usage", 18 if computed_status == "BUSY" else 4),
                "memory_usage": telemetry.get("memory_usage", 42 if computed_status == "BUSY" else 15),
                "gpu_usage": telemetry.get("gpu_usage", 65 if computed_status == "BUSY" else 0),
                "processes": telemetry.get("processes", [active_game] if active_game else []),
                "last_heartbeat": telemetry.get("last_heartbeat"),
            })
    else:
        # Fallback if DB empty: generate standard 10 PCs
        for i in range(1, 11):
            key = f"pc-{i:03d}"
            label = f"PC #{i}"
            telemetry = live_states.get(key, {})
            is_online = manager.is_online(key)
            status = telemetry.get("status", "FREE" if is_online else "OFFLINE")
            result.append({
                "id": str(uuid.uuid4()),
                "pc_id": key,
                "label": label,
                "name": f"PC-{i:02d}",
                "zone": "VIP" if i > 5 else "Standard",
                "status": status,
                "online": is_online,
                "current_user": telemetry.get("current_user"),
                "remaining_seconds": telemetry.get("remaining_seconds", 0),
                "current_game": telemetry.get("active_game"),
                "alert": telemetry.get("alert"),
                "specs": {"cpu": "Intel Core i7-14700K", "gpu": "RTX 4080 Super", "ram": "32 GB DDR5"},
                "cpu_usage": telemetry.get("cpu_usage", 22 if status == "BUSY" else 5),
                "memory_usage": telemetry.get("memory_usage", 45 if status == "BUSY" else 16),
                "gpu_usage": telemetry.get("gpu_usage", 70 if status == "BUSY" else 0),
                "processes": telemetry.get("processes", []),
                "last_heartbeat": telemetry.get("last_heartbeat"),
            })
                "zone": "VIP" if i > 5 else "Standard",
                "status": telemetry.get("status", "FREE" if is_online else "OFFLINE"),
                "online": is_online,
                "current_user": telemetry.get("current_user"),
                "remaining_seconds": telemetry.get("remaining_seconds", 0),
                "current_game": telemetry.get("active_game"),
                "alert": telemetry.get("alert"),
                "specs": {},
            })

    return result


@admin_router.get("/tariffs")
async def list_admin_tariffs(session: SessionDep) -> list[dict[str, Any]]:
    """List club tariffs available for assignment."""
    tariffs = (await session.scalars(select(Tariff).where(Tariff.is_active == True))).all()  # noqa: E712
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "zone": t.zone,
            "duration_minutes": t.duration_minutes,
            "price_kzt": t.price_kzt,
        }
        for t in tariffs
    ]
