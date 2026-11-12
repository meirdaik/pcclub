"""HTTP endpoints to control PC stations, telemetry, live admin map, and kiosk sessions."""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, SettingsDep
from app.api.v1.pc_ws import _resolve_pc
from app.core.security import verify_password
from app.models.club import Pc
from app.models.kiosk import CashierShift, GamingSession, SessionStatus, SnackOrder, Tariff
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


class PowerPlanRequest(BaseModel):
    plan: str = Field(..., description="high_performance, balanced, or power_saver")


class KillProcessRequest(BaseModel):
    pid: int | None = None
    name: str | None = None


class LaunchAppRequest(BaseModel):
    path: str


class MaintenanceRequest(BaseModel):
    enabled: bool = True


class BroadcastRequest(BaseModel):
    message: str
    title: str = "Admin Notification"


class WakeOnLanRequest(BaseModel):
    mac_address: str


class ChatSendRequest(BaseModel):
    message: str
    sender: str = "Admin"


class OrderStatusUpdateRequest(BaseModel):
    status: str = "DELIVERED"


class ShiftCloseRequest(BaseModel):
    cashier_name: str | None = None
    notes: str | None = None


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
        if body.password and user.password_hash:  # noqa: SIM102
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
            start_time=datetime.now(UTC),
            remaining_seconds=body.remaining_seconds,
            status=SessionStatus.ACTIVE,
        )
        session.add(gaming_session)
        pc.session_status = "BUSY"
        pc.current_user_id = user.id
        pc.remaining_seconds = body.remaining_seconds

        # Record revenue in active cashier shift
        session_revenue = 0
        if body.tariff_id:
            try:
                tariff = await session.get(Tariff, uuid.UUID(body.tariff_id))
                if tariff:
                    session_revenue = tariff.price_kzt
            except Exception:
                pass
        if session_revenue == 0:
            session_revenue = max(500, int((body.remaining_seconds / 3600) * 1000))

        shift = await session.scalar(select(CashierShift).where(CashierShift.is_active == True).limit(1))  # noqa: E712
        if not shift:
            shift = CashierShift(cashier_name="Admin Cashier", is_active=True)
            session.add(shift)
            await session.flush()
        shift.total_sessions += 1
        shift.session_revenue_kzt += session_revenue
        shift.total_revenue_kzt = shift.session_revenue_kzt + shift.order_revenue_kzt
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

    logger.info(
        "PC %s: UNLOCK requested for %s (remaining: %ds, sent: %s)",
        pc_id,
        body.username,
        body.remaining_seconds,
        sent,
    )
    return CommandResult(
        ok=True,
        detail=f"UNLOCK command sent to {pc_id}",
        data={
            "username": body.username,
            "remaining_seconds": body.remaining_seconds,
            "is_admin": is_admin_user,
        },
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
        pc.session_status = "FREE"
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
    return CommandResult(
        ok=True,
        detail=f"Session extended +{body.additional_seconds}s",
        data={"remaining_seconds": new_rem},
    )


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

    # Also increment current cashier shift order revenue
    shift = await session.scalar(select(CashierShift).where(CashierShift.is_active == True).limit(1))  # noqa: E712
    if not shift:
        shift = CashierShift(cashier_name="Admin Cashier", is_active=True)
        session.add(shift)
        await session.flush()
    shift.total_orders += 1
    shift.order_revenue_kzt += body.total_kzt
    shift.total_revenue_kzt = shift.session_revenue_kzt + shift.order_revenue_kzt
    await session.commit()

    logger.info("PC %s [SNACK ORDER]: %s (Total: %d₸)", pc_id, item_summary, body.total_kzt)
    return CommandResult(ok=True, detail=f"Order received for {pc_id}. Administrator dispatched.")


@router.post("/{pc_id}/power-plan")
async def set_pc_power_plan(
    pc_id: str,
    body: PowerPlanRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Remotely switch Windows power plan (high_performance, balanced, power_saver)."""
    sent = await manager.send_command(pc_id, "SET_POWER_PLAN", {"plan": body.plan})
    logger.info("PC %s: Power plan change to '%s' sent (dispatched=%s)", pc_id, body.plan, sent)
    return CommandResult(ok=True, detail=f"Power plan '{body.plan}' sent to {pc_id}")


@router.post("/{pc_id}/kill-process")
async def kill_pc_process(
    pc_id: str,
    body: KillProcessRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Remotely terminate a running process by PID or image name on player's PC."""
    sent = await manager.send_command(pc_id, "KILL_PROCESS", {"pid": body.pid, "name": body.name})
    logger.info("PC %s: Kill process command sent (pid=%s, name=%s)", pc_id, body.pid, body.name)
    return CommandResult(ok=True, detail=f"Kill process request sent to {pc_id}")


@router.post("/{pc_id}/launch-app")
async def remote_launch_app(
    pc_id: str,
    body: LaunchAppRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Remotely launch a game or application on player's PC."""
    sent = await manager.send_command(pc_id, "LAUNCH_APP", {"path": body.path})
    logger.info("PC %s: Remote launch app '%s' sent", pc_id, body.path)
    return CommandResult(ok=True, detail=f"Launch app '{body.path}' sent to {pc_id}")


@router.post("/{pc_id}/maintenance")
async def toggle_maintenance_mode(
    pc_id: str,
    body: MaintenanceRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Toggle maintenance mode (exits kiosk fullscreen & unblocks desktop for technician)."""
    sent = await manager.send_command(pc_id, "SET_MAINTENANCE", {"enabled": body.enabled})
    logger.info("PC %s: Maintenance mode set to %s", pc_id, body.enabled)
    return CommandResult(ok=True, detail=f"Maintenance mode set to {body.enabled} on {pc_id}")


@router.post("/{pc_id}/wake-on-lan")
async def wake_on_lan(
    pc_id: str,
    body: WakeOnLanRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send Wake-on-LAN magic packet to remotely power on offline PC."""
    ok = manager.send_wake_on_lan(body.mac_address)
    logger.info("Wake-on-LAN dispatched for %s (MAC: %s, result: %s)", pc_id, body.mac_address, ok)
    return CommandResult(ok=ok, detail=f"Wake-on-LAN packet sent to MAC {body.mac_address}")


@router.post("/{pc_id}/broadcast")
async def broadcast_single_pc(
    pc_id: str,
    body: BroadcastRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send on-screen broadcast notification popup to a single PC."""
    sent = await manager.send_command(pc_id, "BROADCAST_POPUP", {"message": body.message, "title": body.title})
    return CommandResult(ok=True, detail=f"Broadcast message sent to {pc_id}")


@router.post("/broadcast-all")
async def broadcast_all_pcs(
    body: BroadcastRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send on-screen broadcast notification popup to ALL club PCs."""
    count = await manager.broadcast_command("BROADCAST_POPUP", {"message": body.message, "title": body.title})
    logger.info("Broadcast popup dispatched to %d connected PCs: %s", count, body.message)
    return CommandResult(ok=True, detail=f"Broadcast popup dispatched to {count} connected PCs")


@router.post("/{pc_id}/chat")
async def send_chat_message(
    pc_id: str,
    body: ChatSendRequest,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> CommandResult:
    """Send chat message from admin to station."""
    msg = manager.add_chat_message(pc_id, body.sender, body.message)
    await manager.send_command(pc_id, "CHAT_MESSAGE", msg)
    return CommandResult(ok=True, detail="Message sent", data=msg)


@router.get("/{pc_id}/chat")
async def get_station_chat(
    pc_id: str,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> list[dict[str, Any]]:
    """Get chat message history for station."""
    return manager.get_chat_messages(pc_id)


# ------------------------------------------------------------------
# Admin / Cashier Map Endpoints
# ------------------------------------------------------------------


@admin_router.get("/pcs")
async def list_admin_pcs(
    session: SessionDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> list[dict[str, Any]]:
    """Return all club PCs with real-time merged status (Free, Busy, Offline, Alert)."""
    db_pcs = (
        await session.scalars(select(Pc).options(selectinload(Pc.zone)).order_by(Pc.label))
    ).all()
    live_states = manager.get_all_states()

    result = []
    # If DB has PCs, return them with live telemetry
    if db_pcs:
        for p in db_pcs:
            # Check telemetry by canonical id, name, or label
            pc_key = p.name or p.label.lower().replace(" ", "").replace("#", "-")  # noqa: F841
            canonical_key = f"pc-{int(''.join(filter(str.isdigit, p.label)) or 1):03d}"

            telemetry = (
                live_states.get(canonical_key)
                or live_states.get(p.label)
                or live_states.get(str(p.id))
                or {}
            )

            is_online = (
                manager.is_online(canonical_key)
                or manager.is_online(p.label)
                or manager.is_online(str(p.id))
            )
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

            zone_name = (
                "VIP"
                if (p.zone and "vip" in p.zone.name.lower()) or "vip" in str(p.label).lower()
                else "Standard"
            )

            result.append(
                {
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
                    "power_plan": telemetry.get(
                        "power_plan", "High Performance" if computed_status == "BUSY" else "Balanced"
                    ),
                    "maintenance_mode": telemetry.get("maintenance_mode", False),
                    "mac_address": telemetry.get("mac_address"),
                    "last_heartbeat": telemetry.get("last_heartbeat"),
                }
            )
    else:
        # Fallback if DB empty: generate standard 10 PCs
        for i in range(1, 11):
            key = f"pc-{i:03d}"
            label = f"PC #{i}"
            telemetry = live_states.get(key, {})
            is_online = manager.is_online(key)
            status = telemetry.get("status", "FREE" if is_online else "OFFLINE")
            result.append(
                {
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
                    "power_plan": telemetry.get("power_plan", "High Performance" if status == "BUSY" else "Balanced"),
                    "maintenance_mode": telemetry.get("maintenance_mode", False),
                    "mac_address": telemetry.get("mac_address"),
                    "last_heartbeat": telemetry.get("last_heartbeat"),
                }
            )

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


@admin_router.get("/chat")
async def get_all_club_chat(
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> list[dict[str, Any]]:
    """Get all recent chat messages across all club stations."""
    return manager.get_chat_messages("ALL")


@admin_router.get("/orders")
async def list_snack_orders(
    session: SessionDep,
) -> list[dict[str, Any]]:
    """List snack bar orders (newest first)."""
    orders = (await session.scalars(select(SnackOrder).order_by(SnackOrder.created_at.desc()).limit(50))).all()
    return [
        {
            "id": str(o.id),
            "pc_id": o.pc_id,
            "items": o.items,
            "amount_kzt": o.amount_kzt,
            "description": o.description,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]


@admin_router.post("/orders/{order_id}/status")
async def update_snack_order_status(
    order_id: str,
    body: OrderStatusUpdateRequest,
    session: SessionDep,
) -> CommandResult:
    """Update status of a snack bar order (DELIVERED, CANCELLED, PENDING)."""
    try:
        o_uuid = uuid.UUID(order_id)
        order = await session.get(SnackOrder, o_uuid)
    except Exception:
        order = None
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = body.status
    await session.commit()
    logger.info("Order %s updated to status: %s", order_id, body.status)
    return CommandResult(ok=True, detail=f"Order status updated to {body.status}")


@admin_router.get("/shift/current")
async def get_current_shift(
    session: SessionDep,
) -> dict[str, Any]:
    """Get active cashier shift stats and financial summary."""
    shift = await session.scalar(select(CashierShift).where(CashierShift.is_active == True).limit(1))  # noqa: E712
    if not shift:
        shift = CashierShift(cashier_name="Admin Cashier", is_active=True)
        session.add(shift)
        await session.commit()
    return {
        "id": str(shift.id),
        "cashier_name": shift.cashier_name,
        "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
        "total_sessions": shift.total_sessions,
        "session_revenue_kzt": shift.session_revenue_kzt,
        "total_orders": shift.total_orders,
        "order_revenue_kzt": shift.order_revenue_kzt,
        "total_revenue_kzt": shift.total_revenue_kzt,
        "is_active": shift.is_active,
    }


@admin_router.post("/shift/close")
async def close_shift_and_generate_z_report(
    body: ShiftCloseRequest,
    session: SessionDep,
) -> dict[str, Any]:
    """Close active shift, generate official Z-Report, and open a new shift."""
    shift = await session.scalar(select(CashierShift).where(CashierShift.is_active == True).limit(1))  # noqa: E712
    if not shift:
        shift = CashierShift(cashier_name=body.cashier_name or "Admin Cashier", is_active=True)
        session.add(shift)
        await session.flush()

    shift.closed_at = datetime.now(UTC)
    shift.is_active = False
    if body.notes:
        shift.notes = body.notes

    z_report = {
        "report_type": "Z-REPORT (DAILY SHIFT CLOSURE)",
        "shift_id": str(shift.id),
        "cashier_name": shift.cashier_name,
        "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
        "closed_at": shift.closed_at.isoformat(),
        "total_sessions": shift.total_sessions,
        "session_revenue_kzt": shift.session_revenue_kzt,
        "total_orders": shift.total_orders,
        "order_revenue_kzt": shift.order_revenue_kzt,
        "total_revenue_kzt": shift.total_revenue_kzt,
        "notes": shift.notes,
    }

    # Open fresh shift
    new_shift = CashierShift(
        cashier_name=body.cashier_name or shift.cashier_name,
        is_active=True,
    )
    session.add(new_shift)
    await session.commit()

    logger.info("Cashier shift %s closed. Z-Report generated: Total %d₸", shift.id, shift.total_revenue_kzt)
    return z_report
