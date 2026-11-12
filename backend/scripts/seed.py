"""Database seed script for PC Club SENET ecosystem.
Populates admin account, test player, 10 gaming PCs (Standard/VIP), and tariffs.
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.db import Base, get_engine, get_sessionmaker
from app.core.security import hash_password
from app.models.club import Club, Pc, Zone
from app.models.kiosk import GamingSession, SnackOrder, Tariff, Transaction
from app.models.organization import Organization
from app.models.user import IdentityStatus, User


async def seed() -> None:
    engine = get_engine()
    # 1. Ensure all tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = get_sessionmaker()
    async with session_maker() as session:
        # Check if already seeded
        existing_admin = await session.scalar(select(User).where(User.username == "admin"))
        if existing_admin:
            print("[SEED] Admin account already exists. Updating/verifying baseline data...")
        else:
            print("[SEED] Populating fresh club database...")

        # 2. Organization & Club
        org = await session.scalar(select(Organization).limit(1))
        if not org:
            org = Organization(name="CyberZone Gaming Network")
            session.add(org)
            await session.flush()

        club = await session.scalar(select(Club).limit(1))
        if not club:
            club = Club(
                organization_id=org.id,
                name="CyberZone Cyber Arena Almaty",
                city="Almaty",
                address="Abay Ave 150",
                timezone="Asia/Almaty",
                is_active=True,
            )
            session.add(club)
            await session.flush()

        # 3. Zones
        std_zone = await session.scalar(
            select(Zone).where(Zone.club_id == club.id, Zone.name == "Standard")
        )
        if not std_zone:
            std_zone = Zone(
                club_id=club.id,
                name="Standard",
                price_per_hour_kzt=1000,
                is_active=True,
            )
            session.add(std_zone)

        vip_zone = await session.scalar(
            select(Zone).where(Zone.club_id == club.id, Zone.name == "VIP")
        )
        if not vip_zone:
            vip_zone = Zone(
                club_id=club.id,
                name="VIP",
                price_per_hour_kzt=1500,
                is_active=True,
            )
            session.add(vip_zone)
        await session.flush()

        # 4. Users (Admin, Player1, Vaqlur)
        if not existing_admin:
            admin_user = User(
                username="admin",
                phone="+77000000000",
                email="admin@cyberzone.kz",
                password_hash=hash_password("admin123"),
                balance_kzt=99999,
                role="admin",
                first_name="Club",
                last_name="Manager",
                identity_status=IdentityStatus.UNVERIFIED,
            )
            session.add(admin_user)

        player1 = await session.scalar(select(User).where(User.username == "player1"))
        if not player1:
            player1 = User(
                username="player1",
                phone="+77011111111",
                email="player1@cyberzone.kz",
                password_hash=hash_password("player123"),
                balance_kzt=5000,
                role="player",
                first_name="Alex",
                last_name="Mercer",
                identity_status=IdentityStatus.UNVERIFIED,
            )
            session.add(player1)

        vaqlur = await session.scalar(select(User).where(User.username == "Vaqlur"))
        if not vaqlur:
            vaqlur = User(
                username="Vaqlur",
                phone="+77022222222",
                email="Vaqlur@users.noreply.github.com",
                password_hash=hash_password("password123"),
                balance_kzt=15000,
                role="player",
                first_name="Vaqlur",
                last_name="Gamer",
                identity_status=IdentityStatus.UNVERIFIED,
            )
            session.add(vaqlur)
        await session.flush()

        # 5. PCs (10 gaming stations: PC #1..5 in Standard, PC #6..10 in VIP)
        existing_pcs = (await session.scalars(select(Pc).where(Pc.club_id == club.id))).all()
        if len(existing_pcs) < 10:
            existing_labels = {p.label for p in existing_pcs}
            for i in range(1, 11):
                label = f"PC #{i}"
                if label in existing_labels:
                    continue
                is_vip = i > 5
                zone = vip_zone if is_vip else std_zone
                specs = {
                    "cpu": "Intel Core i7-14700KF" if is_vip else "Intel Core i5-13400F",
                    "gpu": "NVIDIA GeForce RTX 4080 Super 16GB" if is_vip else "NVIDIA GeForce RTX 4060 8GB",
                    "ram": "64 GB DDR5-6000" if is_vip else "32 GB DDR5-5200",
                    "monitor": "32' OLED 360Hz QHD" if is_vip else "27' Fast IPS 240Hz FHD",
                    "keyboard": "SteelSeries Apex Pro TKL" if is_vip else "HyperX Alloy Origins",
                    "mouse": "Logitech G Pro X Superlight 2" if is_vip else "Razer DeathAdder V3",
                    "headset": "HyperX Cloud III Wireless" if is_vip else "HyperX Cloud II",
                }
                pc = Pc(
                    club_id=club.id,
                    zone_id=zone.id,
                    label=label,
                    name=f"PC-{i:02d}",
                    status="FREE",
                    remaining_seconds=0,
                    specs=specs,
                )
                session.add(pc)
            print("[SEED] Created 10 Club PCs (5 Standard, 5 VIP).")

        # 6. Tariffs
        existing_tariffs = (await session.scalars(select(Tariff))).all()
        if not existing_tariffs:
            tariffs = [
                Tariff(
                    club_id=club.id,
                    name="1 Hour Standard",
                    zone="Standard",
                    duration_minutes=60,
                    price_kzt=1000,
                ),
                Tariff(
                    club_id=club.id,
                    name="3 Hours Standard (Pack)",
                    zone="Standard",
                    duration_minutes=180,
                    price_kzt=2500,
                ),
                Tariff(
                    club_id=club.id,
                    name="1 Hour VIP",
                    zone="VIP",
                    duration_minutes=60,
                    price_kzt=1500,
                ),
                Tariff(
                    club_id=club.id,
                    name="3 Hours VIP (Pack)",
                    zone="VIP",
                    duration_minutes=180,
                    price_kzt=4000,
                ),
                Tariff(
                    club_id=club.id,
                    name="Night Pack VIP (8 Hours)",
                    zone="VIP",
                    duration_minutes=480,
                    price_kzt=6000,
                ),
            ]
            session.add_all(tariffs)
            print("[SEED] Created 5 Standard & VIP Tariffs.")

        await session.commit()
        print("[SEED] Database seeding completed successfully!")
        print("  - Admin: admin / admin123 (Balance: 99,999₸)")
        print("  - Player: player1 / player123 (Balance: 5,000₸)")
        print("  - Player: Vaqlur / password123 (Balance: 15,000₸)")
        print("  - 10 Gaming PCs (PC-01 to PC-10)")
        print("  - 5 Tariffs (Standard & VIP)")


if __name__ == "__main__":
    asyncio.run(seed())
