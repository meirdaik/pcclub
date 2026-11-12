"""HTTP endpoints to lock / unlock a PC via WebSocket."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SettingsDep
from app.api.v1.pc_ws import _resolve_pc
from app.core.config import Settings
from app.core.errors import AppError
from app.models.club import Pc, PcStatus
from app.services.pc_session import PcSessionManager, get_pc_session_manager

router = APIRouter(prefix="/pc", tags=["pc-control"])
logger = logging.getLogger("pcclub.pc_control")


# ------------------------------------------------------------------
# Request / response schemas
# ------------------------------------------------------------------


class UnlockRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=200)
    password: str | None = None
    remaining_seconds: int = Field(3600, gt=0)


class CommandResult(BaseModel):
    ok: bool
    detail: str


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


async def _resolve_and_check_pc(session: AsyncSession, settings: Settings, pc_id: str) -> Pc | None:
    pc = await _resolve_pc(session, pc_id)
    if pc is not None:
        if pc.status != PcStatus.ACTIVE:
            raise AppError("PC_NOT_ACTIVE", f"PC is in '{pc.status}' status", 409)
        return pc

    if settings.environment != "dev":
        raise AppError("PC_NOT_FOUND", f"PC '{pc_id}' not found", 404)

    return None


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.post("/{pc_id}/unlock")
async def unlock_pc(
    pc_id: str,
    body: UnlockRequest,
    session: SessionDep,
    settings: SettingsDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
    _authorization: Annotated[str | None, Header()] = None,
) -> CommandResult:
    """Send UNLOCK to a connected PC kiosk client."""
    pc = await _resolve_and_check_pc(session, settings, pc_id)

    payload = {
        "username": body.username,
        "remaining_seconds": body.remaining_seconds,
    }

    # Attempt to send to pc_id directly or by DB UUID if available
    sent = await manager.send_command(pc_id, "UNLOCK", payload)
    if not sent and pc is not None:
        sent = await manager.send_command(str(pc.id), "UNLOCK", payload)

    if not sent:
        raise AppError("PC_NOT_CONNECTED", "The PC is not connected via WebSocket", 409)

    logger.info("PC %s: unlocked for %s (%ds)", pc_id, body.username, body.remaining_seconds)
    return CommandResult(ok=True, detail=f"UNLOCK sent to {pc_id}")


@router.post("/{pc_id}/lock")
async def lock_pc(
    pc_id: str,
    session: SessionDep,
    settings: SettingsDep,
    manager: PcSessionManager = Depends(get_pc_session_manager),
    _authorization: Annotated[str | None, Header()] = None,
) -> CommandResult:
    """Send LOCK to a connected PC kiosk client."""
    pc = await _resolve_and_check_pc(session, settings, pc_id)

    sent = await manager.send_command(pc_id, "LOCK")
    if not sent and pc is not None:
        sent = await manager.send_command(str(pc.id), "LOCK")

    if not sent:
        raise AppError("PC_NOT_CONNECTED", "The PC is not connected via WebSocket", 409)

    logger.info("PC %s: locked", pc_id)
    return CommandResult(ok=True, detail=f"LOCK sent to {pc_id}")
