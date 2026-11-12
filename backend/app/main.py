"""FastAPI application factory."""

import socket
from pathlib import Path
from typing import Any
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

from app.api.v1 import auth, bookings, clubs, me, payments, pc_control, pc_ws
from app.api.v1.admin import auth as admin_auth
from app.api.v1.admin import clubs as admin_clubs
from app.core.config import Settings, get_settings
from app.core.db import get_engine
from app.core.errors import register_error_handlers


def get_local_lan_ip() -> str:
    """Detect local LAN IPv4 address reachable by other club PCs."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


# Dev default: this machine and private LAN addresses (kiosk PCs and phones on the club network),
# plain http only. Anything else needs CORS_ALLOW_ORIGIN_REGEX.
_LAN_CORS_ORIGIN_REGEX = (
    r"^http://(localhost|127\.0\.0\.1|0\.0\.0\.0|"
    r"192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
)


def _cors_origin_regex(settings: Settings) -> str | None:
    if settings.cors_allow_origin_regex is not None:
        return settings.cors_allow_origin_regex or None
    return _LAN_CORS_ORIGIN_REGEX if settings.environment == "dev" else None


@asynccontextmanager
async def _lifespan(_: FastAPI) -> AsyncIterator[None]:
    import app.models  # noqa: F401
    from app.core.db import Base

    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Automatic initial database seed (12 PCs across Standard/VIP, Tariffs, Admin, Player1)
    try:
        from scripts.seed import seed
        await seed()
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning("Auto-seed on startup: %s", exc)

    yield
    if get_engine.cache_info().currsize:
        await get_engine().dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="PC Club API", version="0.1.0", lifespan=_lifespan)
    register_error_handlers(app)

    # Dev and LAN default: allow all origins so local LAN PCs, Electron Kiosks, and Expo apps connect cleanly
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    v1 = APIRouter(prefix="/v1")
    for module in (auth, me, clubs, bookings, admin_auth, admin_clubs):
        v1.include_router(module.router)
    # Mock helpers are registered before /payments/{payment_id} style routes and never in prod.
    if settings.uses_mock_payments and settings.environment != "prod":
        v1.include_router(payments.mock_router)
    v1.include_router(payments.router)
    v1.include_router(pc_control.router)
    v1.include_router(pc_control.admin_router)
    app.include_router(v1)

    # Also alias /api/pc and /api/admin for direct integration calls
    api_router = APIRouter(prefix="/api")
    api_router.include_router(pc_control.router)
    api_router.include_router(pc_control.admin_router)
    app.include_router(api_router)

    # WebSocket routes are mounted directly on the app (not behind /v1 prefix).
    app.include_router(pc_ws.router)

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.api_route("/download/kiosk", methods=["GET", "HEAD"], tags=["download"])
    @app.api_route("/download/client", methods=["GET", "HEAD"], tags=["download"])
    @app.api_route("/download/kiosk.exe", methods=["GET", "HEAD"], tags=["download"])
    async def download_kiosk_exe() -> FileResponse:
        repo_root = Path(__file__).resolve().parent.parent.parent
        candidates = [
            repo_root / "desktop" / "release" / "PCClub-Gaming-Client.exe",
            repo_root / "desktop" / "release" / "win-unpacked" / "PC Club Kiosk.exe",
            repo_root / "desktop" / "release" / "PC Club Kiosk Setup.exe",
        ]
        release_dir = repo_root / "desktop" / "release"
        if release_dir.exists():
            for p in release_dir.glob("*.exe"):
                if p not in candidates:
                    candidates.append(p)

        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return FileResponse(
                    path=str(candidate),
                    filename="PCClub-Gaming-Client.exe",
                    media_type="application/vnd.microsoft.portable-executable",
                )

        raise HTTPException(
            status_code=404,
            detail="Desktop client .exe not found. Packaging in progress or not generated yet.",
        )

    @app.get("/download", response_class=HTMLResponse, tags=["download"])
    async def download_page() -> str:
        lan_ip = get_local_lan_ip()
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Download Gaming Station Kiosk</title>
    <style>
        body {{
            background: #0a0e1a;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }}
        .card {{
            background: #111827;
            border: 1px solid #00f0ff;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.2);
        }}
        h1 {{ color: #00f0ff; margin-bottom: 8px; font-size: 26px; }}
        h2 {{ color: #ffffff; font-size: 18px; margin-top: 0; font-weight: normal; }}
        p {{ color: #94a3b8; font-size: 14px; margin-bottom: 24px; }}
        .btn {{
            display: inline-block;
            background: linear-gradient(135deg, #00f0ff 0%, #0077ff 100%);
            color: #050710;
            font-weight: bold;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(0, 240, 255, 0.4);
        }}
        .btn:hover {{
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.8);
        }}
        .info {{
            margin-top: 24px;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #1e293b;
            padding-top: 16px;
            line-height: 1.6;
        }}
        code {{
            background: #1e293b;
            color: #38bdf8;
            padding: 2px 6px;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class="card">
        <h1>🎮 CYBER ARENA CLUB</h1>
        <h2>Gaming Station Kiosk Client</h2>
        <p>Pre-configured for Club Server at <b>{lan_ip}:8000</b> (PC #2)</p>
        <a href="/download/kiosk" class="btn">⬇️ Download PCClub-Gaming-Client.exe</a>
        <div class="info">
            <b>Technician Instructions:</b><br>
            1. Download and run <code>PCClub-Gaming-Client.exe</code> on the second PC.<br>
            2. Press <code>Ctrl+Shift+S</code> anytime inside the kiosk to open Connection Settings.<br>
            3. Press <code>Ctrl+Shift+A</code> to access the Admin Maintenance PIN Modal (<code>admin123</code> / <code>9999</code>).
        </div>
    </div>
</body>
</html>"""

    @app.get("/api/system/info", tags=["system"])
    @app.get("/v1/system/info", tags=["system"])
    async def system_info() -> dict[str, Any]:
        lan_ip = get_local_lan_ip()
        return {
            "status": "online",
            "club_name": "CYBER ARENA CLUB",
            "server_ip": lan_ip,
            "server_port": 8000,
            "server_url": f"http://{lan_ip}:8000",
            "ws_url": f"ws://{lan_ip}:8000",
            "local_url": "http://127.0.0.1:8000",
            "version": "1.0.0",
        }

    return app


app = create_app()
