"""WebSocket connection manager for PC kiosk clients.

In-process singleton — no Redis needed for the phase-4 MVP.
"""

import logging
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger("pcclub.pc_session")


class PcSessionManager:
    """Maintains ``{pc_id: WebSocket}`` of connected PC kiosk clients."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._aliases: dict[str, str] = {}

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, pc_id: str, ws: WebSocket) -> None:
        """Register a PC WebSocket. Closes the previous one if still open."""
        old = self._connections.get(pc_id)
        if old is not None:
            logger.warning("PC %s: replacing stale connection", pc_id)
            try:
                await old.close(code=1012, reason="replaced")
            except Exception:  # noqa: BLE001
                pass
        self._connections[pc_id] = ws

    async def alias(self, alias_id: str, canonical_id: str) -> None:
        """Map an alternate ID (e.g. UUID) to the canonical connection ID (e.g. 'pc-001')."""
        self._aliases[alias_id] = canonical_id

    async def disconnect(self, pc_id: str) -> None:
        """Remove the mapping (does **not** close the socket itself)."""
        self._connections.pop(pc_id, None)
        # Clean any aliases pointing to this pc_id
        for k in [k for k, v in self._aliases.items() if v == pc_id or k == pc_id]:
            self._aliases.pop(k, None)
        logger.info("PC %s: disconnected", pc_id)

    async def send_command(self, pc_id: str, action: str, data: dict[str, Any] | None = None) -> bool:
        """Send a JSON command to a connected PC. Returns ``True`` on success."""
        target_id = self._aliases.get(pc_id, pc_id)
        ws = self._connections.get(target_id)
        if ws is None:
            return False

        payload: dict[str, Any] = {"action": action}
        if data:
            payload.update(data)
        try:
            if ws.client_state != WebSocketState.CONNECTED:
                await self.disconnect(target_id)
                return False
            await ws.send_json(payload)
            return True
        except Exception:  # noqa: BLE001
            logger.warning("PC %s: failed to send command %s", target_id, action, exc_info=True)
            await self.disconnect(target_id)
            return False

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def is_online(self, pc_id: str) -> bool:
        target = self._aliases.get(pc_id, pc_id)
        return target in self._connections

    @property
    def online_pc_ids(self) -> list[str]:
        return list(self._connections)


# Module-level singleton
pc_session_manager = PcSessionManager()


def get_pc_session_manager() -> PcSessionManager:
    return pc_session_manager
