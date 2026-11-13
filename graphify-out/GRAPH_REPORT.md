# Graph Report - pcclub  (2026-11-13)

## Corpus Check
- 176 files · ~87,188 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .example 4, (none) 4, .bat 3)

## Summary
- 1812 nodes · 5317 edges · 100 communities (64 shown, 36 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 317 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a05446b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Catalog & Admin Club Endpoints
- test_payments.py
- Project Docs & Domain Rules
- IIN Identity Verification
- create_booking
- Mobile API Client & Auth Session
- [bookingId].tsx
- violates_night_restriction
- parseInstant
- Mobile Booking Screen & Time Helpers
- clubs/[clubId].tsx
- Bookings Router & Schemas
- Integration Test Fixtures
- Security: JWT & IIN Crypto
- Button
- services/payment.py
- Auth & Expiry Clock Tests
- Expo App Config
- Auth Routers & Token Schemas
- Pc
- models/__init__.py
- helpers.py
- deps.py
- main.py
- Auth Service & Refresh Tokens
- payments/base.py
- Docker Compose Database
- payments.py
- pytest
- packages.py
- Admin API Tests
- dependencies
- pc_control.py
- components.tsx
- expo-constants@~58.0.16
- Alembic Environment
- Current User & Staff Dependencies
- Injectable Clock
- Mobile npm Scripts
- Mobile TypeScript Config
- sqlalchemy
- register
- Phone Normalization
- mobile/package.json
- pc_ws.py
- Mobile App Icons
- Generated OpenAPI Types
- eslint.config.js
- compilerOptions
- test_slots_and_pricing.py
- test_booking_age_rule.py
- asyncio
- Dashboard.tsx
- seed_packages
- Backend Project Metadata
- reserve/[clubId].tsx
- Transaction
- 🚀 PC Club (SENET-Style) LAN Deployment & Operator Guide
- devDependencies
- test_catalog.py
- identity/base.py
- desktop/package.json
- main.ts
- compilerOptions
- test_kiosk_and_booking.py
- expo-crypto
- build
- scripts
- scripts
- server.mjs
- expo-font
- typescript@^5.5.4
- expo-linking@~58.0.17
- @expo-google-fonts/hanken-grotesk
- @expo-google-fonts/ibm-plex-mono
- @expo/metro-runtime@~58.0.17
- expo-secure-store
- database
- SnackOrder
- ru.ts
- expo-camera
- @expo-google-fonts/big-shoulders-display
- expo-status-bar
- react-native-screens@~4.30.1
- react-native-web@^0.21.4

## God Nodes (most connected - your core abstractions)
1. `register()` - 82 edges
2. `code()` - 76 edges
3. `at()` - 74 edges
4. `book()` - 71 edges
5. `T()` - 56 edges
6. `Settings` - 45 edges
7. `TicketScreen()` - 34 edges
8. `BookPcScreen()` - 34 edges
9. `Screen()` - 33 edges
10. `AppError` - 32 edges

## Surprising Connections (you probably didn't know these)
- `Expo commands (expo install/start/lint, tsc --noEmit, expo-doctor)` --semantically_similar_to--> `Mobile commands (npm run web/start/typecheck/lint/test/gen:api)`  [INFERRED] [semantically similar]
  mobile/AGENTS.md → CLAUDE.md
- `Mobile commands (npm run web/start/typecheck/lint/test/gen:api)` --references--> `Expo has changed - check versioned docs, do not trust training data`  [INFERRED]
  CLAUDE.md → mobile/AGENTS.md
- `test_list_and_get_clubs()` --calls--> `Club`  [INFERRED]
  backend/tests/integration/test_catalog.py → backend/app/models/club.py
- `Expo/React Native agent rules (mobile/AGENTS.md)` --references--> `Customer mobile app (React Native + Expo SDK 58) - phase 2`  [INFERRED]
  mobile/AGENTS.md → CLAUDE.md
- `Building with EAS (eas build, eas submit, eas update)` --conceptually_related_to--> `Roadmap (4 phases: backend core, mobile app, admin + real integrations, Windows client)`  [INFERRED]
  mobile/AGENTS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Booking and payment integrity mechanisms** — claude_booking_lifecycle, claude_slot_rules, claude_exclusion_constraints, claude_lazy_hold_expiry, claude_webhook_confirmation, claude_automatic_refunds, claude_idempotency_key, claude_row_lock_order [EXTRACTED 1.00]
- **Four parts of the PC Club monorepo** — claude_backend_api, claude_customer_mobile_app, claude_admin_panel, claude_windows_client [EXTRACTED 1.00]
- **Minor night restriction: from IIN identity to booking rejection** — claude_iin_rule, claude_identityverifier, claude_age_rule, claude_adult_from, claude_can_play_at, claude_minor_night_restriction [INFERRED 0.85]
- **Android adaptive icon layer set (background, foreground, monochrome)** — mobile_assets_android_icon_background, mobile_assets_android_icon_foreground, mobile_assets_android_icon_monochrome [INFERRED 0.85]

## Communities (100 total, 36 thin omitted)

### Community 0 - "Catalog & Admin Club Endpoints"
Cohesion: 0.07
Nodes (58): create_club(), create_pc(), create_zone(), get_club(), list_club_bookings(), list_clubs(), list_pcs(), list_zones() (+50 more)

### Community 1 - "test_payments.py"
Cohesion: 0.17
Nodes (25): ProviderPaymentStatus, pay(), ids(), booking(), _booking_status(), headers(), test_cannot_pay_a_confirmed_or_cancelled_booking(), test_cannot_pay_after_the_hold_expired() (+17 more)

### Community 2 - "Project Docs & Domain Rules"
Cohesion: 0.06
Nodes (35): Admin panel for club owners (React + Vite) - phase 3, Architecture rules, Auth: customers phone + SMS code, staff email + password, JWT access token (30 min), Automatic refunds for late, duplicate or cancelled-booking payments, Backend API (FastAPI, PostgreSQL 17, SQLAlchemy 2 async, Alembic) - phase 1 done, Backend commands (venv, alembic, uvicorn, pytest, ruff, app.cli), Backend layout (main, cli, core, domain, models, schemas, integrations, services, api), can_play_at() - single-instant age check for the future PC client (+27 more)

### Community 3 - "IIN Identity Verification"
Cohesion: 0.08
Nodes (27): get_me(), submit_identity(), update_me(), hash_iin(), build_iin(), check_digit(), IINInfo, InvalidIIN (+19 more)

### Community 4 - "create_booking"
Cohesion: 0.19
Nodes (7): Clock, cancel_booking(), create_booking(), expire_stale_holds(), get_booking(), list_bookings(), _violated_constraint()

### Community 5 - "Mobile API Client & Auth Session"
Cohesion: 0.06
Nodes (46): API_URL, ApiError, buildUrl(), currentRefreshToken(), endSession(), parse(), Query, refresh() (+38 more)

### Community 6 - "[bookingId].tsx"
Cohesion: 0.08
Nodes (51): api(), BookingPage, cancelBooking(), Club, createBooking(), createPayment(), getBooking(), getClub() (+43 more)

### Community 7 - "violates_night_restriction"
Cohesion: 0.12
Nodes (27): adult_from(), can_play_at(), is_minor_at(), _local(), _require_aware(), violates_night_restriction(), local(), test_adult_from_leap_day_in_leap_year() (+19 more)

### Community 8 - "parseInstant"
Cohesion: 0.09
Nodes (16): ADULT_AGE, ageOn(), isMinorOn(), VALID, WEIGHTS_1, WEIGHTS_2, PackageLike, evening (+8 more)

### Community 9 - "Mobile Booking Screen & Time Helpers"
Cohesion: 0.11
Nodes (49): listPackages(), BookPcScreen(), submit(), describePackage(), font, styles, ReserveScreen(), Wheel() (+41 more)

### Community 10 - "clubs/[clubId].tsx"
Cohesion: 0.12
Nodes (36): getPcAvailability(), ClubLive, loadClubsLive(), chunk(), ClubBody(), ClubScreen(), Extras, specsLine() (+28 more)

### Community 11 - "Bookings Router & Schemas"
Cohesion: 0.12
Nodes (8): cancel_booking(), create_booking(), create_payment(), get_booking(), list_bookings(), BookingCreate, BookingOut, BookingPage

### Community 12 - "Integration Test Fixtures"
Cohesion: 0.11
Nodes (21): Settings, MockSmsSender, SentSms, _build_app(), _session(), client(), _client(), committed_client() (+13 more)

### Community 13 - "Security: JWT & IIN Crypto"
Cohesion: 0.13
Nodes (10): create_access_token(), decode_access_token(), decrypt_iin(), encrypt_iin(), _fernet(), generate_otp_code(), InvalidToken, mask_iin() (+2 more)

### Community 14 - "Button"
Cohesion: 0.19
Nodes (22): listBookings(), requestOtp(), submitIdentity(), verifyOtp(), BookingsScreen(), addHour(), loadMore(), IdentityScreen() (+14 more)

### Community 15 - "services/payment.py"
Cohesion: 0.12
Nodes (11): PaymentMethod, PaymentProvider, build_payment_providers(), get_payment_providers(), PaymentProviders, apply_event(), _auto_unlock_pc(), create_payment() (+3 more)

### Community 16 - "Auth & Expiry Clock Tests"
Cohesion: 0.23
Nodes (22): code(), _request(), test_access_token_expires(), test_blocked_user(), test_code_expires(), test_code_is_locked_after_too_many_attempts(), test_code_is_single_use(), test_first_login_creates_unverified_user() (+14 more)

### Community 17 - "Expo App Config"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 18 - "Auth Routers & Token Schemas"
Cohesion: 0.15
Nodes (10): staff_login(), logout(), refresh(), request_otp(), verify_otp(), OtpRequest, OtpVerify, RefreshRequest (+2 more)

### Community 19 - "Pc"
Cohesion: 0.10
Nodes (18): create_owner(), main(), _run(), seed_demo(), get_settings(), Base, get_engine(), get_session() (+10 more)

### Community 20 - "models/__init__.py"
Cohesion: 0.12
Nodes (11): RefreshToken, created_at_column(), uuid_pk(), Booking, BookingStatus, GamingSession, SessionStatus, StaffRole (+3 more)

### Community 21 - "helpers.py"
Cohesion: 0.22
Nodes (13): iin_for(), login(), test_booking_requires_verified_identity(), _submit(), test_cannot_verify_twice(), test_identity_requires_authentication(), test_identity_verification(), test_iin_cannot_be_used_by_two_accounts() (+5 more)

### Community 23 - "main.py"
Cohesion: 0.10
Nodes (18): _envelope(), register_error_handlers(), _app_error(), _http_error(), _validation_error(), _cors_origin_regex(), create_app(), _lifespan() (+10 more)

### Community 24 - "Auth Service & Refresh Tokens"
Cohesion: 0.12
Nodes (16): constant_time_equals(), hash_otp(), hash_token(), SmsDeliveryError, SmsSender, OtpCode, _get_or_create_user(), _issue_tokens() (+8 more)

### Community 25 - "payments/base.py"
Cohesion: 0.14
Nodes (5): CreatedPayment, InvalidWebhook, PaymentProviderError, WebhookEvent, MockPaymentProvider

### Community 26 - "Docker Compose Database"
Cohesion: 0.12
Nodes (16): environment, healthcheck, image, ports, volumes, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER (+8 more)

### Community 27 - "payments.py"
Cohesion: 0.22
Nodes (7): get_payment(), mock_complete(), mock_fail(), provider_webhook(), _simulate(), PaymentCreate, PaymentOut

### Community 28 - "pytest"
Cohesion: 0.18
Nodes (17): OutsidePackageWindow, package_end(), at(), test_day_window_rejects_starts_outside(), test_day_window_runs_until_its_end(), test_duration_package_ends_after_its_length(), test_duration_package_has_no_time_of_day_limit(), test_invalid_terms() (+9 more)

### Community 29 - "packages.py"
Cohesion: 0.14
Nodes (5): PackageTerms, _segments(), window_overlaps_night(), test_window_overlaps_a_daytime_restriction(), test_window_overlaps_night()

### Community 30 - "Admin API Tests"
Cohesion: 0.16
Nodes (8): staff(), staff_login(), ids(), test_customer_and_staff_tokens_are_not_interchangeable(), test_duplicates_and_foreign_zones(), test_organizations_are_isolated(), test_staff_login(), test_unknown_ids_are_404()

### Community 31 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, expo@~58.0.24, expo-linear-gradient@~58.0.4, expo-location@~58.0.22, expo-router@~58.0.31, react@19.3.0, react-dom@19.3.0, react-native@0.88.1 (+8 more)

### Community 32 - "pc_control.py"
Cohesion: 0.08
Nodes (18): call_admin(), CallAdminRequest, clear_alert(), CommandResult, extend_session(), ExtendRequest, list_admin_pcs(), list_admin_tariffs() (+10 more)

### Community 33 - "components.tsx"
Cohesion: 0.10
Nodes (49): RulesScreen(), styles, cornerStyle, ScanScreen(), styles, SettingsScreen(), styles, Toggle() (+41 more)

### Community 35 - "Alembic Environment"
Cohesion: 0.23
Nodes (5): _database_url(), _do_run_migrations(), _run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 36 - "Current User & Staff Dependencies"
Cohesion: 0.31
Nodes (3): _claims(), get_current_staff(), get_current_user()

### Community 37 - "Injectable Clock"
Cohesion: 0.27
Nodes (4): FixedClock, SystemClock, clock(), test_token_signed_with_another_secret_is_rejected()

### Community 38 - "Mobile npm Scripts"
Cohesion: 0.20
Nodes (10): scripts, android, build, gen:api, ios, lint, start, test (+2 more)

### Community 39 - "Mobile TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, types, extends, include, expo/tsconfig.base

### Community 40 - "sqlalchemy"
Cohesion: 0.13
Nodes (7): upgrade(), upgrade(), _created_at(), downgrade(), upgrade(), test_models_match_migrated_schema(), test_overlap_constraints_exist()

### Community 41 - "register"
Cohesion: 0.08
Nodes (54): PcStatus, at(), book(), book_and_pay(), parse_dt(), register(), test_club_bookings_for_a_day(), test_adult_can_book_a_night_package() (+46 more)

### Community 43 - "mobile/package.json"
Cohesion: 0.21
Nodes (11): devDependencies, @types/node@^26.6.6, @types/react@~19.3.0, typescript@~6.0.3, @types/react, typescript, main, name (+3 more)

### Community 45 - "Mobile App Icons"
Cohesion: 0.40
Nodes (6): Android adaptive icon background layer (light-blue construction-guide grid: concentric circles, dashed centre line and diagonals), Android adaptive icon foreground layer (blue gradient chevron / 'A'-shaped logo mark on transparent background), Android adaptive icon monochrome layer (flat grey chevron / 'A'-shaped logo mark for themed icons), Web favicon (tiny blue chevron logo mark on light-blue square), Mobile app launcher icon (blue gradient chevron logo mark over light-blue construction-guide grid), Splash screen icon (grey placeholder: square grid with three concentric circles, no logo mark)

### Community 46 - "Generated OpenAPI Types"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 47 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): { defineConfig }, expoConfig, eslint@^9.0.0, eslint-config-expo@~58.0.4, eslint, eslint-config-expo

### Community 48 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleDetection (+11 more)

### Community 49 - "test_slots_and_pricing.py"
Cohesion: 0.12
Nodes (19): booking_price_kzt(), InvalidSlot, _is_aligned(), OutsideOpeningHours, SlotRules, validate_slot(), within_opening_hours(), at() (+11 more)

### Community 50 - "test_booking_age_rule.py"
Cohesion: 0.16
Nodes (8): test_adult_can_book_at_night(), test_age_comes_from_the_verified_iin(), test_around_the_18th_birthday(), test_minor_can_book_daytime(), test_minor_cannot_book_at_night(), test_night_is_judged_in_the_club_timezone(), test_night_window_is_configurable(), test_unverified_user_cannot_bypass_the_rule()

### Community 51 - "asyncio"
Cohesion: 0.43
Nodes (3): test_many_users_racing_for_overlapping_slots(), test_one_user_double_submitting(), test_two_users_racing_for_one_slot()

### Community 52 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (35): App(), AdminPanel(), AdminPanelProps, styles, BrowserFallbackView(), Dashboard(), DashboardProps, KioskWebview() (+27 more)

### Community 62 - "seed_packages"
Cohesion: 0.47
Nodes (4): committed_packages(), Packages, packages(), seed_packages()

### Community 66 - "reserve/[clubId].tsx"
Cohesion: 0.14
Nodes (24): Booking, ActiveCard(), EmptySessions(), Loaded, styles, DURATIONS, PackageRow(), styles (+16 more)

### Community 70 - "🚀 PC Club (SENET-Style) LAN Deployment & Operator Guide"
Cohesion: 0.12
Nodes (15): 1. Find Your Server's LAN IP Address, 1. From the Kiosk Lock Screen, 2. From Any Browser on the LAN, 2. Start the Backend Server, 🏛️ Architecture Overview, Cashier Capabilities:, 🚨 Emergency Exit & Keyboard Shortcuts, 🌐 In-App Browser & Platform Restrictions (+7 more)

### Community 71 - "devDependencies"
Cohesion: 0.14
Nodes (13): devDependencies, concurrently@^8.2.2, electron-builder@^24.13.3, @types/react@^18.3.3, @types/react-dom@^18.3.0, vite@^5.4.2, @vitejs/plugin-react@^4.3.1, @types/react (+5 more)

### Community 72 - "test_catalog.py"
Cohesion: 0.29
Nodes (5): test_list_and_get_clubs(), test_unknown_or_inactive_club_is_404(), test_unpaid_hold_stops_blocking_after_expiry(), test_window_validation(), test_zones()

### Community 73 - "identity/base.py"
Cohesion: 0.14
Nodes (11): IdentityCheckStatus, IdentityResult, IdentityVerifier, IdentityVerifierUnavailable, MockIdentityVerifier, build_identity_verifier(), build(), build_sms_sender() (+3 more)

### Community 74 - "desktop/package.json"
Cohesion: 0.18
Nodes (13): dependencies, qrcode.react@^3.1.0, react@^18.3.1, react-dom@^18.3.1, description, wait-on@^7.2.0, react, react-dom (+5 more)

### Community 75 - "main.ts"
Cohesion: 0.17
Nodes (5): appConfig, RuntimeConfig, trackedPids, electron@^31.3.1, electron

### Community 76 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 77 - "test_kiosk_and_booking.py"
Cohesion: 0.38
Nodes (8): _listed_pc_ids(), _pc(), test_booking_does_not_touch_the_kiosk_state(), test_lifecycle_still_decides_what_is_bookable(), test_locking_frees_the_kiosk_and_keeps_bookings(), test_new_pc_is_active_and_free(), test_pc_with_an_active_kiosk_session_stays_in_the_catalog(), _unlock()

### Community 79 - "build"
Cohesion: 0.20
Nodes (10): build, appId, directories, extraFiles, files, productName, win, output (+2 more)

### Community 80 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, dist, dist:dir, dist:portable, electron:build, electron:dev (+1 more)

### Community 81 - "scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, postinstall, start

### Community 82 - "server.mjs"
Cohesion: 0.29
Nodes (3): child, mobileDir, rootDir

### Community 91 - "database"
Cohesion: 0.33
Nodes (3): alembic_config(), database(), _reset_schema()

## Knowledge Gaps
- **8 isolated node(s):** `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift`, `Slot rules (future, 30-min aligned, 1-12 h, max 14 days ahead, inside opening hours)`, `graphify knowledge graph usage rules` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 548 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Settings` connect `Integration Test Fixtures` to `pc_control.py`, `IIN Identity Verification`, `Current User & Staff Dependencies`, `create_booking`, `identity/base.py`, `pc_ws.py`, `Security: JWT & IIN Crypto`, `services/payment.py`, `Pc`, `deps.py`, `main.py`, `Auth Service & Refresh Tokens`, `database`, `._no_dev_secrets_in_prod`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Catalog & Admin Club Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.0654241894777713 - nodes in this community are weakly interconnected._
- **Why does `violates_night_restriction()` connect `violates_night_restriction` to `create_booking`, `pytest`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `Project Docs & Domain Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.05507246376811594 - nodes in this community are weakly interconnected._
- **Why does `qrcode.react` connect `desktop/package.json` to `Dashboard.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `IIN Identity Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.08455625436757512 - nodes in this community are weakly interconnected._