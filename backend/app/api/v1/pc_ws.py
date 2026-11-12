"""WebSocket endpoint for PC kiosk clients."""

import logging
import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_session
from app.models.club import Pc, PcStatus
from app.services.pc_session import PcSessionManager, get_pc_session_manager

router = APIRouter(tags=["pc-ws"])
logger = logging.getLogger("pcclub.pc_ws")


async def _resolve_pc(session: AsyncSession, pc_identifier: str) -> Pc | None:
    """Resolve PC by UUID or by label (e.g. 'PC #1' or 'pc-001')."""
    try:
        pc_uuid = uuid.UUID(pc_identifier)
        pc = await session.get(Pc, pc_uuid)
        if pc is not None:
            return pc
    except (ValueError, TypeError):
        pass

    # Search by label
    stmt = select(Pc).where(
        or_(
            Pc.label == pc_identifier,
            func.lower(Pc.label) == pc_identifier.lower(),
        )
    )
    result = await session.scalars(stmt)
    return result.first()


@router.websocket("/ws/pc/{pc_id}")
async def pc_websocket(
    pc_id: str,
    ws: WebSocket,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    manager: PcSessionManager = Depends(get_pc_session_manager),
) -> None:
    await ws.accept()
    pc_key = str(pc_id)

    # ------------------------------------------------------------------
    # 1. Authenticate: first message must be {"type": "auth", "token": "..."}
    # ------------------------------------------------------------------
    try:
        auth_msg = await ws.receive_json()
    except (WebSocketDisconnect, Exception):
        return

    if (
        not isinstance(auth_msg, dict)
        or auth_msg.get("type") != "auth"
        or auth_msg.get("token") != settings.pc_auth_token
    ):
        logger.warning("PC %s: auth failed", pc_key)
        await ws.close(code=4001, reason="auth_failed")
        return

    # ------------------------------------------------------------------
    # 2. Validate the PC exists in DB (or allow in dev mode)
    # ------------------------------------------------------------------
    pc = await _resolve_pc(session, pc_key)
    if pc is not None and pc.status == PcStatus.RETIRED:
        await ws.close(code=4004, reason="pc_retired")
        return

    if pc is None and settings.environment != "dev":
        await ws.close(code=4004, reason="pc_not_found")
        return

    # ------------------------------------------------------------------
    # 3. Register and keep alive
    # ------------------------------------------------------------------
    await manager.connect(pc_key, ws)
    if pc is not None:
        # Also map the DB UUID so unlock via UUID reaches this connection
        await manager.alias(str(pc.id), pc_key)

    await ws.send_json({"type": "auth_ok"})
    logger.info("PC %s: authenticated and connected", pc_key)

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type") if isinstance(data, dict) else None
            if msg_type == "heartbeat":
                await ws.send_json({"type": "heartbeat_ack"})
            elif msg_type == "status":
                logger.debug("PC %s: status update: %s", pc_key, data)
            else:
                logger.debug("PC %s: unknown message type: %s", pc_key, msg_type)
    except WebSocketDisconnect:
        logger.info("PC %s: client disconnected", pc_key)
    except Exception:
        logger.warning("PC %s: connection error", pc_key, exc_info=True)
    finally:
        await manager.disconnect(pc_key)
