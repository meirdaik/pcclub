# Graph Report - pcclub  (2026-11-12)

## Corpus Check
- 154 files · ~69,365 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .example 4, (none) 4, .bat 3)

## Summary
- 1661 nodes · 4528 edges · 92 communities (63 shown, 29 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 318 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `927556a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Catalog & Admin Club Endpoints
- Payments & Provider Mocks
- Project Docs & Domain Rules
- IIN Identity Verification
- create_booking
- Mobile API Client & Auth Session
- uuid
- Age Rule (Minor Night Restriction)
- pytest
- Mobile Booking Screen & Time Helpers
- bookings/index.tsx
- Bookings Router & Schemas
- Integration Test Fixtures
- Security: JWT & IIN Crypto
- login.tsx
- PaymentProviders
- Auth & Expiry Clock Tests
- Expo App Config
- Auth Routers & Token Schemas
- Pc
- Model Base & Columns
- Identity Integration Tests
- deps.py
- main.py
- Auth Service & Refresh Tokens
- Operator CLI & Demo Seed
- Docker Compose Database
- Booking Age Rule Tests
- Test App & Mock SMS
- helpers.py
- Admin API Tests
- Mobile Runtime Dependencies
- pc_control.py
- components.tsx
- mobile/package.json
- Alembic Environment
- Current User & Staff Dependencies
- Injectable Clock
- Mobile npm Scripts
- Mobile TypeScript Config
- Migration Drift Tests
- register
- Phone Normalization
- devDependencies
- staff_login
- Mobile App Icons
- Generated OpenAPI Types
- sqlalchemy
- compilerOptions
- test_slots_and_pricing.py
- validate_slot
- packages.py
- Dashboard.tsx
- seed_packages
- Backend Project Metadata
- [bookingId].tsx
- models/__init__.py
- 🚀 PC Club (SENET-Style) LAN Deployment & Operator Guide
- devDependencies
- mockServer.ts
- identity/base.py
- desktop/package.json
- main.ts
- compilerOptions
- test_kiosk_and_booking.py
- config.py
- build
- scripts
- scripts
- server.mjs
- typescript@^5.5.4
- expo-linking@~58.0.17
- expo-status-bar
- react-native-screens@~4.30.1

## God Nodes (most connected - your core abstractions)
1. `register()` - 82 edges
2. `code()` - 76 edges
3. `at()` - 74 edges
4. `book()` - 71 edges
5. `Settings` - 45 edges
6. `BookPcScreen()` - 33 edges
7. `AppError` - 32 edges
8. `violates_night_restriction()` - 29 edges
9. `PcSessionManager` - 25 edges
10. `pay()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Expo commands (expo install/start/lint, tsc --noEmit, expo-doctor)` --semantically_similar_to--> `Mobile commands (npm run web/start/typecheck/lint/test/gen:api)`  [INFERRED] [semantically similar]
  mobile/AGENTS.md → CLAUDE.md
- `Mobile commands (npm run web/start/typecheck/lint/test/gen:api)` --references--> `Expo has changed - check versioned docs, do not trust training data`  [INFERRED]
  CLAUDE.md → mobile/AGENTS.md
- `Expo/React Native agent rules (mobile/AGENTS.md)` --references--> `Customer mobile app (React Native + Expo SDK 58) - phase 2`  [INFERRED]
  mobile/AGENTS.md → CLAUDE.md
- `Building with EAS (eas build, eas submit, eas update)` --conceptually_related_to--> `Roadmap (4 phases: backend core, mobile app, admin + real integrations, Windows client)`  [INFERRED]
  mobile/AGENTS.md → CLAUDE.md
- `Mobile commands (npm run web/start/typecheck/lint/test/gen:api)` --references--> `npx expo install (always instead of npm/yarn/pnpm/bun add)`  [INFERRED]
  CLAUDE.md → mobile/AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Booking and payment integrity mechanisms** — claude_booking_lifecycle, claude_slot_rules, claude_exclusion_constraints, claude_lazy_hold_expiry, claude_webhook_confirmation, claude_automatic_refunds, claude_idempotency_key, claude_row_lock_order [EXTRACTED 1.00]
- **Four parts of the PC Club monorepo** — claude_backend_api, claude_customer_mobile_app, claude_admin_panel, claude_windows_client [EXTRACTED 1.00]
- **Minor night restriction: from IIN identity to booking rejection** — claude_iin_rule, claude_identityverifier, claude_age_rule, claude_adult_from, claude_can_play_at, claude_minor_night_restriction [INFERRED 0.85]
- **Android adaptive icon layer set (background, foreground, monochrome)** — mobile_assets_android_icon_background, mobile_assets_android_icon_foreground, mobile_assets_android_icon_monochrome [INFERRED 0.85]

## Communities (92 total, 29 thin omitted)

### Community 0 - "Catalog & Admin Club Endpoints"
Cohesion: 0.07
Nodes (57): create_club(), create_pc(), create_zone(), get_club(), list_club_bookings(), list_clubs(), list_pcs(), list_zones() (+49 more)

### Community 1 - "Payments & Provider Mocks"
Cohesion: 0.06
Nodes (38): get_payment(), mock_complete(), mock_fail(), provider_webhook(), _simulate(), CreatedPayment, InvalidWebhook, PaymentProviderError (+30 more)

### Community 2 - "Project Docs & Domain Rules"
Cohesion: 0.06
Nodes (35): Admin panel for club owners (React + Vite) - phase 3, Architecture rules, Auth: customers phone + SMS code, staff email + password, JWT access token (30 min), Automatic refunds for late, duplicate or cancelled-booking payments, Backend API (FastAPI, PostgreSQL 17, SQLAlchemy 2 async, Alembic) - phase 1 done, Backend commands (venv, alembic, uvicorn, pytest, ruff, app.cli), Backend layout (main, cli, core, domain, models, schemas, integrations, services, api), can_play_at() - single-instant age check for the future PC client (+27 more)

### Community 3 - "IIN Identity Verification"
Cohesion: 0.09
Nodes (25): get_me(), submit_identity(), update_me(), check_digit(), IINInfo, InvalidIIN, is_valid_iin(), parse_iin() (+17 more)

### Community 4 - "create_booking"
Cohesion: 0.21
Nodes (7): SlotRules, cancel_booking(), create_booking(), expire_stale_holds(), get_booking(), list_bookings(), _violated_constraint()

### Community 5 - "Mobile API Client & Auth Session"
Cohesion: 0.10
Nodes (31): API_URL, ApiError, buildUrl(), currentRefreshToken(), endSession(), parse(), Query, refresh() (+23 more)

### Community 6 - "uuid"
Cohesion: 0.22
Nodes (7): test_packages_of_an_unknown_club_are_404(), test_unknown_pc(), test_availability_flag_for_a_window(), test_pc_busy_intervals_for_a_local_day(), busy(), test_unknown_or_inactive_club_is_404(), test_window_validation()

### Community 7 - "Age Rule (Minor Night Restriction)"
Cohesion: 0.12
Nodes (27): adult_from(), can_play_at(), is_minor_at(), _local(), _require_aware(), violates_night_restriction(), local(), test_adult_from_leap_day_in_leap_year() (+19 more)

### Community 8 - "pytest"
Cohesion: 0.17
Nodes (17): OutsidePackageWindow, package_end(), at(), test_day_window_rejects_starts_outside(), test_day_window_runs_until_its_end(), test_duration_package_ends_after_its_length(), test_duration_package_has_no_time_of_day_limit(), test_invalid_terms() (+9 more)

### Community 9 - "Mobile Booking Screen & Time Helpers"
Cohesion: 0.12
Nodes (41): createBooking(), getPcAvailability(), BookPcScreen(), submit(), describePackage(), styles, formatDay(), formatDuration() (+33 more)

### Community 10 - "bookings/index.tsx"
Cohesion: 0.20
Nodes (30): cancelBooking(), listBookings(), listClubs(), submitIdentity(), BookingScreen(), cancel(), BookingsScreen(), loadMore() (+22 more)

### Community 11 - "Bookings Router & Schemas"
Cohesion: 0.11
Nodes (9): cancel_booking(), create_booking(), create_payment(), get_booking(), list_bookings(), BookingCreate, BookingOut, BookingPage (+1 more)

### Community 12 - "Integration Test Fixtures"
Cohesion: 0.12
Nodes (16): alembic_config(), _session(), clock(), committed_session_factory(), committed_world(), connection(), Database, database() (+8 more)

### Community 13 - "Security: JWT & IIN Crypto"
Cohesion: 0.09
Nodes (16): Settings, constant_time_equals(), create_access_token(), decode_access_token(), decrypt_iin(), encrypt_iin(), _fernet(), generate_otp_code() (+8 more)

### Community 14 - "login.tsx"
Cohesion: 0.20
Nodes (11): requestOtp(), verifyOtp(), LoginScreen(), resend(), run(), sendCode(), submitCode(), VALID (+3 more)

### Community 15 - "PaymentProviders"
Cohesion: 0.28
Nodes (7): PaymentMethod, PaymentProvider, build_payment_providers(), get_payment_providers(), PaymentProviders, mock_provider(), providers()

### Community 16 - "Auth & Expiry Clock Tests"
Cohesion: 0.20
Nodes (24): code(), _request(), test_access_token_expires(), test_blocked_user(), test_code_expires(), test_code_is_locked_after_too_many_attempts(), test_code_is_single_use(), test_first_login_creates_unverified_user() (+16 more)

### Community 17 - "Expo App Config"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 18 - "Auth Routers & Token Schemas"
Cohesion: 0.21
Nodes (9): logout(), refresh(), request_otp(), verify_otp(), OtpRequest, OtpVerify, RefreshRequest, StaffLogin (+1 more)

### Community 19 - "Pc"
Cohesion: 0.12
Nodes (14): Base, get_engine(), get_sessionmaker(), hash_password(), Booking, Club, Pc, Zone (+6 more)

### Community 21 - "Identity Integration Tests"
Cohesion: 0.23
Nodes (13): build_iin(), iin_for(), login(), _submit(), test_cannot_verify_twice(), test_identity_requires_authentication(), test_identity_verification(), test_iin_cannot_be_used_by_two_accounts() (+5 more)

### Community 22 - "deps.py"
Cohesion: 0.15
Nodes (8): get_clock(), IdentityVerifier, build_identity_verifier(), build_sms_sender(), get_identity_verifier(), get_sms_sender(), UnknownProvider, SmsSender

### Community 23 - "main.py"
Cohesion: 0.08
Nodes (18): _envelope(), register_error_handlers(), _app_error(), _http_error(), _validation_error(), _cors_origin_regex(), create_app(), _lifespan() (+10 more)

### Community 24 - "Auth Service & Refresh Tokens"
Cohesion: 0.16
Nodes (15): Clock, AppError, SmsDeliveryError, OtpCode, RefreshToken, _get_or_create_user(), _issue_tokens(), logout() (+7 more)

### Community 25 - "Operator CLI & Demo Seed"
Cohesion: 0.22
Nodes (7): create_owner(), main(), _run(), seed_demo(), get_settings(), Package, Organization

### Community 26 - "Docker Compose Database"
Cohesion: 0.12
Nodes (16): environment, healthcheck, image, ports, volumes, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER (+8 more)

### Community 27 - "Booking Age Rule Tests"
Cohesion: 0.16
Nodes (8): test_adult_can_book_at_night(), test_age_comes_from_the_verified_iin(), test_around_the_18th_birthday(), test_minor_can_book_daytime(), test_minor_cannot_book_at_night(), test_night_is_judged_in_the_club_timezone(), test_night_window_is_configurable(), test_unverified_user_cannot_bypass_the_rule()

### Community 28 - "Test App & Mock SMS"
Cohesion: 0.32
Nodes (7): MockSmsSender, SentSms, _build_app(), client(), _client(), committed_client(), settings()

### Community 29 - "helpers.py"
Cohesion: 0.16
Nodes (6): book_and_pay(), test_cancel_paid_booking_refunds(), test_cannot_cancel_after_start(), test_failed_refund_keeps_the_booking(), test_cannot_pay_a_confirmed_or_cancelled_booking(), test_full_customer_flow()

### Community 30 - "Admin API Tests"
Cohesion: 0.16
Nodes (9): staff(), staff_login(), test_club_bookings_for_a_day(), ids(), test_customer_and_staff_tokens_are_not_interchangeable(), test_duplicates_and_foreign_zones(), test_organizations_are_isolated(), test_staff_login() (+1 more)

### Community 31 - "Mobile Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, expo@~58.0.24, expo-crypto@~58.0.8, expo-router@~58.0.31, expo-secure-store@~58.0.3, react@19.3.0, react-native@0.88.1, react-native-safe-area-context@~5.11.1 (+5 more)

### Community 32 - "pc_control.py"
Cohesion: 0.06
Nodes (20): call_admin(), CallAdminRequest, clear_alert(), CommandResult, extend_session(), ExtendRequest, list_admin_pcs(), list_admin_tariffs() (+12 more)

### Community 33 - "components.tsx"
Cohesion: 0.10
Nodes (29): Tokens, RootLayout(), styles, formatCountdown(), t, ru, ButtonProps, ChipProps (+21 more)

### Community 34 - "mobile/package.json"
Cohesion: 0.18
Nodes (10): expo-constants@~58.0.16, @expo/metro-runtime@~58.0.17, react-dom@19.3.0, react-dom, main, name, private, version (+2 more)

### Community 35 - "Alembic Environment"
Cohesion: 0.25
Nodes (5): _database_url(), _do_run_migrations(), _run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 36 - "Current User & Staff Dependencies"
Cohesion: 0.31
Nodes (3): _claims(), get_current_staff(), get_current_user()

### Community 38 - "Mobile npm Scripts"
Cohesion: 0.20
Nodes (10): scripts, android, build, gen:api, ios, lint, start, test (+2 more)

### Community 39 - "Mobile TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, types, extends, include, expo/tsconfig.base

### Community 41 - "register"
Cohesion: 0.09
Nodes (49): PcStatus, at(), book(), parse_dt(), register(), test_many_users_racing_for_overlapping_slots(), test_one_user_double_submitting(), test_two_users_racing_for_one_slot() (+41 more)

### Community 43 - "devDependencies"
Cohesion: 0.15
Nodes (13): { defineConfig }, expoConfig, devDependencies, eslint@^9.0.0, eslint-config-expo@~58.0.4, @types/node@^26.6.6, @types/react@~19.3.0, typescript@~6.0.3 (+5 more)

### Community 45 - "Mobile App Icons"
Cohesion: 0.40
Nodes (6): Android adaptive icon background layer (light-blue construction-guide grid: concentric circles, dashed centre line and diagonals), Android adaptive icon foreground layer (blue gradient chevron / 'A'-shaped logo mark on transparent background), Android adaptive icon monochrome layer (flat grey chevron / 'A'-shaped logo mark for themed icons), Web favicon (tiny blue chevron logo mark on light-blue square), Mobile app launcher icon (blue gradient chevron logo mark over light-blue construction-guide grid), Splash screen icon (grey placeholder: square grid with three concentric circles, no logo mark)

### Community 46 - "Generated OpenAPI Types"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 47 - "sqlalchemy"
Cohesion: 0.24
Nodes (5): upgrade(), upgrade(), _created_at(), downgrade(), upgrade()

### Community 48 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleDetection (+11 more)

### Community 49 - "test_slots_and_pricing.py"
Cohesion: 0.22
Nodes (11): booking_price_kzt(), at(), check(), test_24_7_club_accepts_any_time(), test_daytime_club(), test_invalid_slots(), test_overnight_club(), test_price() (+3 more)

### Community 50 - "validate_slot"
Cohesion: 0.20
Nodes (7): InvalidSlot, _is_aligned(), OutsideOpeningHours, validate_slot(), within_opening_hours(), test_alignment_is_checked_in_club_local_time(), test_naive_datetimes_are_rejected()

### Community 51 - "packages.py"
Cohesion: 0.14
Nodes (5): PackageTerms, _segments(), window_overlaps_night(), test_window_overlaps_a_daytime_restriction(), test_window_overlaps_night()

### Community 52 - "Dashboard.tsx"
Cohesion: 0.07
Nodes (35): App(), AdminPanel(), AdminPanelProps, styles, BrowserFallbackView(), Dashboard(), DashboardProps, KioskWebview() (+27 more)

### Community 62 - "seed_packages"
Cohesion: 0.47
Nodes (4): committed_packages(), Packages, packages(), seed_packages()

### Community 66 - "[bookingId].tsx"
Cohesion: 0.12
Nodes (32): api(), Booking, BookingPage, Club, createPayment(), getBooking(), getClub(), listPackages() (+24 more)

### Community 67 - "models/__init__.py"
Cohesion: 0.11
Nodes (7): BookingStatus, SessionStatus, SnackOrder, Transaction, StaffRole, Payment, PaymentStatus

### Community 70 - "🚀 PC Club (SENET-Style) LAN Deployment & Operator Guide"
Cohesion: 0.12
Nodes (15): 1. Find Your Server's LAN IP Address, 1. From the Kiosk Lock Screen, 2. From Any Browser on the LAN, 2. Start the Backend Server, 🏛️ Architecture Overview, Cashier Capabilities:, 🚨 Emergency Exit & Keyboard Shortcuts, 🌐 In-App Browser & Platform Restrictions (+7 more)

### Community 71 - "devDependencies"
Cohesion: 0.14
Nodes (13): devDependencies, concurrently@^8.2.2, electron-builder@^24.13.3, @types/react@^18.3.3, @types/react-dom@^18.3.0, vite@^5.4.2, @vitejs/plugin-react@^4.3.1, @types/react (+5 more)

### Community 72 - "mockServer.ts"
Cohesion: 0.13
Nodes (14): Booking, bookings, Club, currentUser, DEMO_CLUBS, DEMO_PCS, DEMO_ZONES, Payment (+6 more)

### Community 73 - "identity/base.py"
Cohesion: 0.23
Nodes (4): IdentityCheckStatus, IdentityResult, IdentityVerifierUnavailable, MockIdentityVerifier

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

## Knowledge Gaps
- **8 isolated node(s):** `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift`, `Slot rules (future, 30-min aligned, 1-12 h, max 14 days ahead, inside opening hours)`, `graphify knowledge graph usage rules` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 517 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `violates_night_restriction()` connect `Age Rule (Minor Night Restriction)` to `pytest`, `create_booking`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `Settings` (e.g. with `_claims()` and `pc_websocket()`) actually correct?**
  _`Settings` has 29 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Catalog & Admin Club Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.06626262626262626 - nodes in this community are weakly interconnected._
- **Why does `Settings` connect `Security: JWT & IIN Crypto` to `pc_control.py`, `IIN Identity Verification`, `Current User & Staff Dependencies`, `create_booking`, `Integration Test Fixtures`, `config.py`, `PaymentProviders`, `deps.py`, `main.py`, `Auth Service & Refresh Tokens`, `Operator CLI & Demo Seed`, `Test App & Mock SMS`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Payments & Provider Mocks` be split into smaller, more focused modules?**
  _Cohesion score 0.056179775280898875 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Auth Service & Refresh Tokens` to `Catalog & Admin Club Endpoints`, `Payments & Provider Mocks`, `IIN Identity Verification`, `Current User & Staff Dependencies`, `create_booking`, `deps.py`, `main.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._