"""Automated End-to-End Backend & WebSocket Verification for PC Club."""

import asyncio
import json
import sys
import urllib.request
import urllib.error

# Ensure websockets library is available
try:
    import websockets
except ImportError:
    print("[E2E] Error: 'websockets' library is required. Install via pip install websockets.")
    sys.exit(1)

BASE_HTTP = "http://127.0.0.1:8000"
BASE_WS = "ws://127.0.0.1:8000"
AUTH_TOKEN = "pc-kiosk-secret-token"

def http_get(path: str) -> dict | list:
    url = f"{BASE_HTTP}{path}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as res:
        return json.loads(res.read().decode("utf-8"))

def http_post(path: str, data: dict | None = None) -> dict:
    url = f"{BASE_HTTP}{path}"
    body = json.dumps(data or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTP ERROR {e.code} on POST {path}: {err_body}")
        raise

async def run_e2e():
    print("=" * 65)
    print(">>> STARTING AUTOMATED E2E VERIFICATION FOR PC CLUB SYSTEM <<<")
    print("=" * 65)

    # 1. System info and DB Seed Verification
    print("\n[Step 1] Verifying System Info and Database Seeding...")
    sys_info = http_get("/api/system/info")
    print(f" -> System Info: Club: '{sys_info.get('club_name')}', LAN IP: {sys_info.get('server_ip')}")
    assert sys_info.get("status") == "online", "System info status is not online"

    pcs = http_get("/api/admin/pcs")
    print(f" -> Loaded {len(pcs)} PCs from database/system.")
    assert len(pcs) >= 10, f"Expected at least 10 PCs, found {len(pcs)}"

    tariffs = http_get("/api/admin/tariffs")
    print(f" -> Loaded {len(tariffs)} Club Tariffs:")
    for t in tariffs[:3]:
        print(f"    * {t.get('name')} ({t.get('zone_name')}) - {t.get('price_kzt')} KZT ({t.get('duration_minutes')}m)")
    assert len(tariffs) >= 5, "Expected at least 5 tariffs seeded"
    print(" -> [PASS] Seed data & system endpoints verified.")

    # 2. WebSocket Connections for PC #1 and PC #2
    print("\n[Step 2] Connecting PC #1 (pc-001) and PC #2 (pc-002) via WebSocket...")
    ws1_url = f"{BASE_WS}/ws/pc/pc-001"
    ws2_url = f"{BASE_WS}/ws/pc/pc-002"

    async with websockets.connect(ws1_url) as ws1, websockets.connect(ws2_url) as ws2:
        # Authenticate PC #1
        await ws1.send(json.dumps({"type": "auth", "token": AUTH_TOKEN}))
        msg1 = json.loads(await ws1.recv())
        assert msg1.get("type") == "auth_ok", f"PC 1 auth failed: {msg1}"
        msg1_init = json.loads(await ws1.recv())
        qr_token_pc1 = msg1_init.get("qr_token")
        print(f" -> PC #1 Connected & Authenticated (Initial QR Token: {qr_token_pc1})")

        # Authenticate PC #2
        await ws2.send(json.dumps({"type": "auth", "token": AUTH_TOKEN}))
        msg2 = json.loads(await ws2.recv())
        assert msg2.get("type") == "auth_ok", f"PC 2 auth failed: {msg2}"
        msg2_init = json.loads(await ws2.recv())
        qr_token_pc2 = msg2_init.get("qr_token")
        print(f" -> PC #2 Connected & Authenticated (Initial QR Token: {qr_token_pc2})")

        # 3. Heartbeat & Telemetry Synchronization
        print("\n[Step 3] Sending Heartbeat Telemetry from PC #1...")
        await ws1.send(json.dumps({
            "type": "heartbeat",
            "pc_id": "pc-001",
            "status": "LOCKED",
            "remaining_seconds": 0,
            "timestamp": 1234567890
        }))
        hb_resp = json.loads(await ws1.recv())
        assert hb_resp.get("type") == "heartbeat_ack", f"Unexpected heartbeat response: {hb_resp}"
        assert "qr_token" in hb_resp, "Expected rotating qr_token in heartbeat_ack"
        print(f" -> Heartbeat ACK verified with rotating QR Token: {hb_resp.get('qr_token')}")

        # 4. Session Start (Remote UNLOCK)
        print("\n[Step 4] Triggering Remote UNLOCK for PC #1 (player1, 3600s)...")
        unlock_res = http_post("/api/pc/pc-001/unlock", {
            "username": "player1",
            "remaining_seconds": 3600
        })
        assert unlock_res.get("ok") is True, f"Unlock failed: {unlock_res}"

        ws1_unlock_msg = json.loads(await ws1.recv())
        print(f" -> PC #1 received payload: action={ws1_unlock_msg.get('action')}, user={ws1_unlock_msg.get('username')}, rem={ws1_unlock_msg.get('remaining_seconds')}s")
        assert ws1_unlock_msg.get("action") == "UNLOCK", f"Expected UNLOCK action, got {ws1_unlock_msg}"
        assert ws1_unlock_msg.get("username") == "player1"
        assert ws1_unlock_msg.get("remaining_seconds") == 3600
        print(" -> [PASS] Session start successfully verified.")

        # 5. Live Time Extension (+30m)
        print("\n[Step 5] Triggering Time Extension (+1800s / +30m)...")
        extend_res = http_post("/api/pc/pc-001/extend", {"additional_seconds": 1800})
        assert extend_res.get("ok") is True, f"Extend failed: {extend_res}"

        ws1_extend_msg = json.loads(await ws1.recv())
        print(f" -> PC #1 received EXTEND payload: new remaining={ws1_extend_msg.get('remaining_seconds')}s (+{ws1_extend_msg.get('added_seconds')}s)")
        assert ws1_extend_msg.get("action") == "EXTEND"
        assert ws1_extend_msg.get("remaining_seconds") == 5400
        print(" -> [PASS] Time extension verified.")

        # 6. Bar Order Creation
        print("\n[Step 6] Placing Bar Order from PC #1 over WebSocket...")
        await ws1.send(json.dumps({
            "type": "order_snack",
            "description": "Red Bull 250ml x 1, Doritos Nacho Cheese x 1"
        }))
        order_ack = json.loads(await ws1.recv())
        assert order_ack.get("type") == "order_received", f"Order not acked: {order_ack}"
        print(f" -> Bar Order placed and acknowledged: status={order_ack.get('status')}")

        # 7. Session Transfer ("Move Player": PC #1 -> PC #2)
        print("\n[Step 7] Testing Session Transfer ('Move Player': PC #1 -> PC #2)...")
        transfer_res = http_post("/api/pc/pc-001/transfer/pc-002")
        assert transfer_res.get("ok") is True, f"Transfer failed: {transfer_res}"
        print(f" -> Transfer API Response: {transfer_res.get('detail')}")

        # PC #1 must receive LOCK
        ws1_lock_msg = json.loads(await ws1.recv())
        print(f" -> PC #1 received: action={ws1_lock_msg.get('action')}")
        assert ws1_lock_msg.get("action") == "LOCK", f"PC 1 did not lock: {ws1_lock_msg}"

        # PC #2 must receive UNLOCK with remaining seconds
        ws2_unlock_msg = json.loads(await ws2.recv())
        print(f" -> PC #2 received: action={ws2_unlock_msg.get('action')}, user={ws2_unlock_msg.get('username')}, rem={ws2_unlock_msg.get('remaining_seconds')}s, transferred_from={ws2_unlock_msg.get('transferred_from')}")
        assert ws2_unlock_msg.get("action") == "UNLOCK", f"PC 2 did not unlock: {ws2_unlock_msg}"
        assert ws2_unlock_msg.get("username") == "player1"
        assert ws2_unlock_msg.get("transferred_from") == "pc-001"
        print(" -> [PASS] Atomic session transfer from PC #1 to PC #2 verified.")

        # 8. Dynamic Anti-Replay QR Unlock
        print("\n[Step 8] Testing Dynamic Anti-Replay QR Code Unlock...")
        # Lock PC #2 first
        http_post("/api/pc/pc-002/lock")
        ws2_lock = json.loads(await ws2.recv())
        assert ws2_lock.get("action") == "LOCK"

        # PC #2 sends heartbeat in locked state to receive fresh rotating QR token
        await ws2.send(json.dumps({
            "type": "heartbeat",
            "pc_id": "pc-002",
            "status": "LOCKED",
            "remaining_seconds": 0
        }))
        hb2 = json.loads(await ws2.recv())
        active_qr_token = hb2.get("qr_token")
        assert active_qr_token, "No QR token returned in heartbeat"
        print(f" -> Kiosk PC #2 active rotating QR token: {active_qr_token}")

        # Mobile app scans and performs QR unlock
        qr_unlock_res = http_post("/api/pc/qr-unlock", {
            "pc_id": "pc-002",
            "qr_token": active_qr_token,
            "username": "player1",
            "duration_minutes": 60
        })
        assert qr_unlock_res.get("ok") is True, f"QR Unlock failed: {qr_unlock_res}"
        print(f" -> Mobile QR Unlock Response: {qr_unlock_res.get('detail')}")

        ws2_qr_unlock = json.loads(await ws2.recv())
        assert ws2_qr_unlock.get("action") == "UNLOCK"
        print(" -> PC #2 successfully unlocked via QR token!")

        # Verify Anti-Replay: replaying the same token must fail!
        print(" -> Testing anti-replay protection (replaying consumed token)...")
        try:
            http_post("/api/pc/qr-unlock", {
                "pc_id": "pc-002",
                "qr_token": active_qr_token,
                "username": "player1",
                "duration_minutes": 60
            })
            raise AssertionError("Anti-replay check failed: replayed token was accepted!")
        except urllib.error.HTTPError as err:
            assert err.code == 400, f"Expected 400 Bad Request, got {err.code}"
            print(f" -> [PASS] Anti-replay successfully rejected replayed token (HTTP 400: {err.reason})")

        # 9. Final Cleanup: Lock PC #2
        print("\n[Step 9] Terminating Session (LOCK)...")
        http_post("/api/pc/pc-002/lock")
        ws2_final_lock = json.loads(await ws2.recv())
        assert ws2_final_lock.get("action") == "LOCK"
        print(" -> PC #2 successfully locked back to Kiosk Shield.")

    # 10. Crash & Reboot Session Recovery Verification
    print("\n[Step 10] Testing Crash & Reboot Session Recovery...")
    # Start session on PC #1
    http_post("/api/pc/pc-001/unlock", {"username": "player1", "remaining_seconds": 3600})

    # Simulate PC reboot: new WebSocket connection connects for pc-001
    async with websockets.connect(ws1_url) as ws_reboot:
        await ws_reboot.send(json.dumps({"type": "auth", "token": AUTH_TOKEN}))
        auth_ack = json.loads(await ws_reboot.recv())
        assert auth_ack.get("type") == "auth_ok"

        # The server must immediately push the recovery UNLOCK payload!
        recovery_msg = json.loads(await ws_reboot.recv())
        print(f" -> Crash recovery received: action={recovery_msg.get('action')}, is_recovery={recovery_msg.get('is_recovery')}, rem={recovery_msg.get('remaining_seconds')}s")
        assert recovery_msg.get("action") == "UNLOCK", f"Expected recovery UNLOCK, got: {recovery_msg}"
        assert recovery_msg.get("is_recovery") is True
        assert recovery_msg.get("remaining_seconds") > 3500
        print(" -> [PASS] Rebooted PC automatically resumed player active session!")

    # Lock PC #1 after test
    http_post("/api/pc/pc-001/lock")

    print("\n" + "=" * 65)
    print(">>> ALL 10 E2E AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(run_e2e())
