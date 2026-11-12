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
        self._chat_messages: list[dict[str, Any]] = []

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

        # Normalize number and establish canonical aliases
        digits = "".join(filter(str.isdigit, str(pc_id)))
        canonical = pc_id
        if digits:
            num = int(digits)
            canonical = f"pc-{num:03d}"
            label = f"PC #{num}"
            name = f"PC-{num:02d}"
            for alt in (str(pc_id), canonical, label, name, str(num), f"pc-{num}"):
                self._aliases[alt] = canonical

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

        logger.info("PC %s: disconnected", pc_id)

    async def send_command(
        self, pc_id: str, action: str, data: dict[str, Any] | None = None
    ) -> bool:
        """Send a JSON command to a connected PC. Returns ``True`` on success."""
        target_id = self._aliases.get(pc_id, pc_id)
        ws = self._connections.get(target_id) or self._connections.get(pc_id)
        if ws is None:
            # Also try finding any connection whose alias points to target_id
            for conn_id, conn_ws in self._connections.items():
                if self._aliases.get(conn_id) == target_id:
                    ws = conn_ws
                    break
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

    async def broadcast_command(
        self, action: str, data: dict[str, Any] | None = None
    ) -> int:
        """Send a JSON command to ALL connected PC kiosk clients."""
        dispatched = 0
        for pc_id in list(self._connections.keys()):
            if await self.send_command(pc_id, action, data):
                dispatched += 1
        return dispatched

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
        for key in (
            "cpu_usage",
            "memory_usage",
            "gpu_usage",
            "power_plan",
            "processes",
            "mac_address",
            "maintenance_mode",
            "security",
            "specs",
        ):
            if key in data:
                existing[key] = data[key]

    @staticmethod
    def send_wake_on_lan(mac_address: str, broadcast_ip: str = "255.255.255.255", port: int = 9) -> bool:
        """Send a Wake-on-LAN magic packet to power on a remote PC via network."""
        import socket

        try:
            clean_mac = mac_address.replace(":", "").replace("-", "").strip()
            if len(clean_mac) != 12:
                logger.warning("Invalid MAC address for WoL: %s", mac_address)
                return False
            mac_bytes = bytes.fromhex(clean_mac)
            magic_packet = b"\xff" * 6 + mac_bytes * 16
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                sock.sendto(magic_packet, (broadcast_ip, port))
            logger.info("Wake-on-LAN packet dispatched to MAC %s", mac_address)
            return True
        except Exception as exc:
            logger.error("Failed to send WoL packet to %s: %s", mac_address, exc)
            return False

    def add_chat_message(self, pc_id: str, sender: str, text: str) -> dict[str, Any]:
        """Record a chat message between admin and station."""
        target = self._aliases.get(pc_id, pc_id)
        msg = {
            "id": f"msg-{int(time.time() * 1000)}",
            "pc_id": target,
            "sender": sender,
            "text": text,
            "timestamp": time.time(),
        }
        self._chat_messages.append(msg)
        if len(self._chat_messages) > 200:
            self._chat_messages = self._chat_messages[-200:]
        return msg

    def get_chat_messages(self, pc_id: str | None = None) -> list[dict[str, Any]]:
        """Return chat messages for a specific station or all stations."""
        if not pc_id or pc_id == "ALL":
            return list(self._chat_messages)
        target = self._aliases.get(pc_id, pc_id)
        return [m for m in self._chat_messages if m["pc_id"] == target]

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
