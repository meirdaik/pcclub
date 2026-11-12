"""WebSocket connection manager and telemetry registry for PC kiosk clients.

Maintains live WebSocket connections, session states, and telemetry data.
"""

import logging
import time
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger("pcclub.pc_session")


class PcSessionManager:
    """Maintains ``{pc_id: WebSocket}`` of connected PC kiosk clients and real-time telemetry."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._aliases: dict[str, str] = {}
        self._telemetry: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, pc_id: str, ws: WebSocket) -> None:
        """Register a PC WebSocket. Closes the previous one if still open."""
        old = self._connections.get(pc_id)
        if old is not None:
            logger.warning("PC %s: replacing stale connection", pc_id)
            try:  # noqa: SIM105
                await old.close(code=1012, reason="replaced")
            except Exception:
                pass
        self._connections[pc_id] = ws

        # Initialize or preserve telemetry
        canonical = self._aliases.get(pc_id, pc_id)
        if canonical not in self._telemetry:
            self._telemetry[canonical] = {
                "pc_id": canonical,
                "status": "FREE",
                "current_user": None,
                "remaining_seconds": 0,
                "active_game": None,
                "alert": None,
                "last_heartbeat": time.time(),
            }
        else:
            self._telemetry[canonical]["last_heartbeat"] = time.time()
            if self._telemetry[canonical]["status"] == "OFFLINE":
                self._telemetry[canonical]["status"] = "FREE"

    async def alias(self, alias_id: str, canonical_id: str) -> None:
        """Map an alternate ID (e.g. UUID) to the canonical connection ID (e.g. 'pc-001')."""
        self._aliases[alias_id] = canonical_id

    async def disconnect(self, pc_id: str) -> None:
        """Remove the mapping (does **not** close the socket itself)."""
        target = self._aliases.get(pc_id, pc_id)
        self._connections.pop(target, None)
        self._connections.pop(pc_id, None)

        if target in self._telemetry:
            self._telemetry[target]["status"] = "OFFLINE"

        # Clean any aliases pointing to this pc_id
        for k in [k for k, v in self._aliases.items() if v == pc_id or k == pc_id]:
            self._aliases.pop(k, None)
        logger.info("PC %s: disconnected", pc_id)

    async def send_command(
        self, pc_id: str, action: str, data: dict[str, Any] | None = None
    ) -> bool:
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

            # Update internal telemetry state
            if action == "UNLOCK":
                if target_id not in self._telemetry:
                    self._telemetry[target_id] = {}
                self._telemetry[target_id]["status"] = "BUSY"
                self._telemetry[target_id]["current_user"] = (
                    data.get("username", "Guest") if data else "Guest"
                )
                self._telemetry[target_id]["remaining_seconds"] = (
                    data.get("remaining_seconds", 3600) if data else 3600
                )
            elif action == "LOCK":
                if target_id in self._telemetry:
                    self._telemetry[target_id]["status"] = "FREE"
                    self._telemetry[target_id]["current_user"] = None
                    self._telemetry[target_id]["remaining_seconds"] = 0
                    self._telemetry[target_id]["active_game"] = None
                    self._telemetry[target_id]["alert"] = None
            elif action == "EXTEND":  # noqa: SIM102
                if target_id in self._telemetry and data:
                    self._telemetry[target_id]["remaining_seconds"] = data.get(
                        "remaining_seconds", 0
                    )

            return True
        except Exception:
            logger.warning("PC %s: failed to send command %s", target_id, action, exc_info=True)
            await self.disconnect(target_id)
            return False

    # ------------------------------------------------------------------
    # Telemetry & Heartbeat Registry
    # ------------------------------------------------------------------

    def update_telemetry(self, pc_id: str, data: dict[str, Any]) -> None:
        target = self._aliases.get(pc_id, pc_id)
        existing = self._telemetry.setdefault(
            target,
            {
                "pc_id": target,
                "status": "FREE",
                "current_user": None,
                "remaining_seconds": 0,
                "active_game": None,
                "alert": None,
            },
        )
        existing["last_heartbeat"] = time.time()

        if "status" in data:
            # If there's an active alert, preserve ALERT status unless unlocked/locked
            status = data["status"]
            if existing.get("alert") and status != "LOCKED":
                existing["status"] = "ALERT"
            else:
                existing["status"] = status
        if "remaining_seconds" in data:
            existing["remaining_seconds"] = int(data["remaining_seconds"])
        if "active_game" in data:
            existing["active_game"] = data["active_game"]
        if "current_user" in data:
            existing["current_user"] = data["current_user"]
        if "alert" in data:
            existing["alert"] = data["alert"]

    def set_alert(self, pc_id: str, alert_message: str) -> None:
        target = self._aliases.get(pc_id, pc_id)
        record = self._telemetry.setdefault(
            target,
            {
                "pc_id": target,
                "status": "FREE",
                "current_user": None,
                "remaining_seconds": 0,
                "active_game": None,
            },
        )
        record["alert"] = alert_message
        record["status"] = "ALERT"
        record["last_heartbeat"] = time.time()

    def clear_alert(self, pc_id: str) -> None:
        target = self._aliases.get(pc_id, pc_id)
        if target in self._telemetry:
            self._telemetry[target]["alert"] = None
            if self._telemetry[target]["remaining_seconds"] > 0:
                self._telemetry[target]["status"] = "BUSY"
            else:
                self._telemetry[target]["status"] = "FREE"

    def get_pc_state(self, pc_id: str) -> dict[str, Any]:
        target = self._aliases.get(pc_id, pc_id)
        state = self._telemetry.get(
            target,
            {
                "pc_id": target,
                "status": "ONLINE" if self.is_online(target) else "OFFLINE",
                "current_user": None,
                "remaining_seconds": 0,
                "active_game": None,
                "alert": None,
                "last_heartbeat": 0,
            },
        ).copy()
        state["online"] = self.is_online(target)
        return state

    def get_all_states(self) -> dict[str, dict[str, Any]]:
        result = {}
        for pc_id, state in self._telemetry.items():
            s = state.copy()
            s["online"] = self.is_online(pc_id)
            result[pc_id] = s
        return result

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
