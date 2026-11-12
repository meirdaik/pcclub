# Graph Report - pcclub  (2026-11-12)

## Corpus Check
- 124 files · ~48,127 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .ini 1)

## Summary
- 1346 nodes · 3904 edges · 70 communities (47 shown, 23 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 282 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7894cc0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Catalog & Admin Club Endpoints
- Payments & Provider Mocks
- Project Docs & Domain Rules
- IIN Identity Verification
- create_booking
- Mobile API Client & Auth Session
- test_booking.py
- Age Rule (Minor Night Restriction)
- Packages Domain Rules
- Mobile Booking Screen & Time Helpers
- Mobile Club & Booking Detail Screens
- Bookings Router & Schemas
- Integration Test Fixtures
- Security: JWT & IIN Crypto
- Mobile Login & Identity Screens
- registry.py
- Auth & Expiry Clock Tests
- Expo App Config
- Auth Routers & Token Schemas
- ORM Models & Enums
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
- packages.test.ts
- Zone
- Mobile Package & Dev Dependencies
- Alembic Environment
- Current User & Staff Dependencies
- Injectable Clock
- Mobile npm Scripts
- Mobile TypeScript Config
- Migration Drift Tests
- register
- Phone Normalization
- Mobile ESLint Config
- v1/auth.py
- Mobile App Icons
- Generated OpenAPI Types
- sqlalchemy
- Expo Package
- Expo Constants Package
- Expo Crypto Package
- Expo Metro Runtime Package
- React DOM Package
- seed_packages
- Backend Project Metadata
- PaymentPanel
- StaffRole

## God Nodes (most connected - your core abstractions)
1. `register()` - 77 edges
2. `code()` - 74 edges
3. `at()` - 69 edges
4. `book()` - 66 edges
5. `Settings` - 43 edges
6. `BookPcScreen()` - 33 edges
7. `AppError` - 32 edges
8. `violates_night_restriction()` - 29 edges
9. `pay()` - 25 edges
10. `StaffUser` - 24 edges

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

## Communities (70 total, 23 thin omitted)

### Community 0 - "Catalog & Admin Club Endpoints"
Cohesion: 0.07
Nodes (58): create_club(), create_pc(), create_zone(), get_club(), list_club_bookings(), list_clubs(), list_pcs(), list_zones() (+50 more)

### Community 1 - "Payments & Provider Mocks"
Cohesion: 0.07
Nodes (36): get_payment(), mock_complete(), mock_fail(), provider_webhook(), _simulate(), CreatedPayment, InvalidWebhook, PaymentProviderError (+28 more)

### Community 2 - "Project Docs & Domain Rules"
Cohesion: 0.06
Nodes (35): Admin panel for club owners (React + Vite) - phase 3, Architecture rules, Auth: customers phone + SMS code, staff email + password, JWT access token (30 min), Automatic refunds for late, duplicate or cancelled-booking payments, Backend API (FastAPI, PostgreSQL 17, SQLAlchemy 2 async, Alembic) - phase 1 done, Backend commands (venv, alembic, uvicorn, pytest, ruff, app.cli), Backend layout (main, cli, core, domain, models, schemas, integrations, services, api), can_play_at() - single-instant age check for the future PC client (+27 more)

### Community 3 - "IIN Identity Verification"
Cohesion: 0.07
Nodes (30): get_me(), submit_identity(), update_me(), build_iin(), check_digit(), IINInfo, InvalidIIN, is_valid_iin() (+22 more)

### Community 4 - "create_booking"
Cohesion: 0.21
Nodes (6): cancel_booking(), create_booking(), expire_stale_holds(), get_booking(), list_bookings(), _violated_constraint()

### Community 5 - "Mobile API Client & Auth Session"
Cohesion: 0.07
Nodes (46): api(), API_URL, ApiError, buildUrl(), currentRefreshToken(), endSession(), parse(), Query (+38 more)

### Community 6 - "test_booking.py"
Cohesion: 0.12
Nodes (19): test_unknown_ids_are_404(), test_packages_of_an_unknown_club_are_404(), test_back_to_back_and_other_pcs_are_fine(), test_booking_requires_authentication(), test_booking_requires_verified_identity(), test_bookings_are_private(), test_cancelled_booking_frees_the_slot(), test_confirmed_booking_blocks_the_slot() (+11 more)

### Community 7 - "Age Rule (Minor Night Restriction)"
Cohesion: 0.12
Nodes (27): adult_from(), can_play_at(), is_minor_at(), _local(), _require_aware(), violates_night_restriction(), local(), test_adult_from_leap_day_in_leap_year() (+19 more)

### Community 8 - "Packages Domain Rules"
Cohesion: 0.06
Nodes (41): OutsidePackageWindow, package_end(), PackageTerms, _segments(), window_overlaps_night(), booking_price_kzt(), InvalidSlot, _is_aligned() (+33 more)

### Community 9 - "Mobile Booking Screen & Time Helpers"
Cohesion: 0.15
Nodes (38): createBooking(), getPcAvailability(), BookPcScreen(), submit(), describePackage(), styles, formatDay(), formatDuration() (+30 more)

### Community 10 - "Mobile Club & Booking Detail Screens"
Cohesion: 0.12
Nodes (47): cancelBooking(), getClub(), listClubs(), listPcs(), listZones(), BookingScreen(), cancel(), METHODS (+39 more)

### Community 11 - "Bookings Router & Schemas"
Cohesion: 0.12
Nodes (8): cancel_booking(), create_booking(), create_payment(), get_booking(), list_bookings(), BookingCreate, BookingOut, BookingPage

### Community 12 - "Integration Test Fixtures"
Cohesion: 0.13
Nodes (15): alembic_config(), clock(), committed_session_factory(), committed_world(), connection(), Database, database(), db() (+7 more)

### Community 13 - "Security: JWT & IIN Crypto"
Cohesion: 0.10
Nodes (16): constant_time_equals(), create_access_token(), decode_access_token(), decrypt_iin(), encrypt_iin(), _fernet(), generate_otp_code(), hash_iin() (+8 more)

### Community 14 - "Mobile Login & Identity Screens"
Cohesion: 0.20
Nodes (20): requestOtp(), submitIdentity(), verifyOtp(), IdentityScreen(), submit(), Navigator(), RootLayout(), styles (+12 more)

### Community 15 - "registry.py"
Cohesion: 0.13
Nodes (12): IdentityVerifier, PaymentMethod, PaymentProvider, build_identity_verifier(), build_payment_providers(), build(), get_identity_verifier(), get_payment_providers() (+4 more)

### Community 16 - "Auth & Expiry Clock Tests"
Cohesion: 0.24
Nodes (21): code(), _request(), test_access_token_expires(), test_blocked_user(), test_code_expires(), test_code_is_locked_after_too_many_attempts(), test_code_is_single_use(), test_first_login_creates_unverified_user() (+13 more)

### Community 17 - "Expo App Config"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 18 - "Auth Routers & Token Schemas"
Cohesion: 0.29
Nodes (4): logout(), refresh(), request_otp(), verify_otp()

### Community 19 - "ORM Models & Enums"
Cohesion: 0.17
Nodes (7): Booking, BookingStatus, Club, Pc, PcStatus, PaymentStatus, test_list_and_get_clubs()

### Community 20 - "Model Base & Columns"
Cohesion: 0.24
Nodes (3): created_at_column(), uuid_pk(), IdentityStatus

### Community 21 - "Identity Integration Tests"
Cohesion: 0.33
Nodes (12): iin_for(), login(), _submit(), test_cannot_verify_twice(), test_identity_requires_authentication(), test_identity_verification(), test_iin_cannot_be_used_by_two_accounts(), test_iin_not_found_then_retry() (+4 more)

### Community 22 - "deps.py"
Cohesion: 0.13
Nodes (4): build_sms_sender(), get_sms_sender(), SmsSender, PaymentCreate

### Community 23 - "main.py"
Cohesion: 0.08
Nodes (17): _envelope(), register_error_handlers(), _app_error(), _http_error(), _validation_error(), _cors_origin_regex(), create_app(), _lifespan() (+9 more)

### Community 24 - "Auth Service & Refresh Tokens"
Cohesion: 0.19
Nodes (13): Clock, hash_token(), SmsDeliveryError, _get_or_create_user(), _issue_tokens(), logout(), _otp_invalid(), refresh_tokens() (+5 more)

### Community 25 - "Operator CLI & Demo Seed"
Cohesion: 0.15
Nodes (9): create_owner(), main(), _run(), seed_demo(), get_engine(), get_session(), get_sessionmaker(), Package (+1 more)

### Community 26 - "Docker Compose Database"
Cohesion: 0.12
Nodes (16): environment, healthcheck, image, ports, volumes, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER (+8 more)

### Community 27 - "Booking Age Rule Tests"
Cohesion: 0.12
Nodes (15): book(), test_adult_can_book_at_night(), test_age_comes_from_the_verified_iin(), test_around_the_18th_birthday(), test_minor_can_book_daytime(), test_minor_cannot_book_at_night(), test_night_is_judged_in_the_club_timezone(), test_night_window_is_configurable() (+7 more)

### Community 28 - "Test App & Mock SMS"
Cohesion: 0.16
Nodes (9): Settings, MockSmsSender, SentSms, _build_app(), _session(), client(), _client(), committed_client() (+1 more)

### Community 29 - "helpers.py"
Cohesion: 0.11
Nodes (11): book_and_pay(), test_cancel_paid_booking_refunds(), test_cannot_cancel_after_start(), test_failed_refund_keeps_the_booking(), test_paid_booking_does_not_expire(), test_availability_flag_for_a_window(), test_unknown_or_inactive_club_is_404(), test_unpaid_hold_stops_blocking_after_expiry() (+3 more)

### Community 30 - "Admin API Tests"
Cohesion: 0.18
Nodes (8): staff(), staff_login(), test_club_bookings_for_a_day(), ids(), test_customer_and_staff_tokens_are_not_interchangeable(), test_duplicates_and_foreign_zones(), test_organizations_are_isolated(), test_staff_login()

### Community 31 - "Mobile Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, expo-linking@~58.0.17, expo-router@~58.0.31, expo-secure-store@~58.0.3, expo-status-bar@~58.0.5, react@19.3.0, react-native@0.88.1, react-native-safe-area-context@~5.11.1 (+7 more)

### Community 32 - "packages.test.ts"
Cohesion: 0.16
Nodes (6): VALID, WEIGHTS_1, WEIGHTS_2, at(), DAY, NIGHT

### Community 33 - "Zone"
Cohesion: 0.15
Nodes (7): Base, OtpCode, RefreshToken, Zone, Payment, User, test_zones()

### Community 34 - "Mobile Package & Dev Dependencies"
Cohesion: 0.21
Nodes (11): devDependencies, @types/node@^26.6.6, @types/react@~19.3.0, typescript@~6.0.3, main, name, private, version (+3 more)

### Community 35 - "Alembic Environment"
Cohesion: 0.24
Nodes (6): _database_url(), _do_run_migrations(), _run_async_migrations(), run_migrations_offline(), run_migrations_online(), get_settings()

### Community 36 - "Current User & Staff Dependencies"
Cohesion: 0.31
Nodes (3): _claims(), get_current_staff(), get_current_user()

### Community 37 - "Injectable Clock"
Cohesion: 0.27
Nodes (3): FixedClock, get_clock(), SystemClock

### Community 38 - "Mobile npm Scripts"
Cohesion: 0.22
Nodes (9): scripts, android, gen:api, ios, lint, start, test, typecheck (+1 more)

### Community 39 - "Mobile TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowImportingTsExtensions, paths, strict, types, extends, include, expo/tsconfig.base

### Community 41 - "register"
Cohesion: 0.12
Nodes (28): at(), parse_dt(), register(), test_many_users_racing_for_overlapping_slots(), test_one_user_double_submitting(), test_two_users_racing_for_one_slot(), test_adult_can_book_a_night_package(), test_duration_package_sets_the_end_and_the_price() (+20 more)

### Community 43 - "Mobile ESLint Config"
Cohesion: 0.29
Nodes (6): { defineConfig }, expoConfig, eslint@^9.0.0, eslint-config-expo@~58.0.4, eslint, eslint-config-expo

### Community 44 - "v1/auth.py"
Cohesion: 0.22
Nodes (6): staff_login(), OtpRequest, OtpVerify, RefreshRequest, StaffLogin, TokenPair

### Community 45 - "Mobile App Icons"
Cohesion: 0.40
Nodes (6): Android adaptive icon background layer (light-blue construction-guide grid: concentric circles, dashed centre line and diagonals), Android adaptive icon foreground layer (blue gradient chevron / 'A'-shaped logo mark on transparent background), Android adaptive icon monochrome layer (flat grey chevron / 'A'-shaped logo mark for themed icons), Web favicon (tiny blue chevron logo mark on light-blue square), Mobile app launcher icon (blue gradient chevron logo mark over light-blue construction-guide grid), Splash screen icon (grey placeholder: square grid with three concentric circles, no logo mark)

### Community 46 - "Generated OpenAPI Types"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 62 - "seed_packages"
Cohesion: 0.47
Nodes (4): committed_packages(), Packages, packages(), seed_packages()

### Community 66 - "PaymentPanel"
Cohesion: 0.60
Nodes (6): createPayment(), simulateMockPayment(), PaymentPanel(), run(), simulate(), start()

## Knowledge Gaps
- **8 isolated node(s):** `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift`, `Slot rules (future, 30-min aligned, 1-12 h, max 14 days ahead, inside opening hours)`, `graphify knowledge graph usage rules` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 361 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Settings` connect `Test App & Mock SMS` to `Alembic Environment`, `Current User & Staff Dependencies`, `create_booking`, `IIN Identity Verification`, `Integration Test Fixtures`, `Security: JWT & IIN Crypto`, `registry.py`, `ORM Models & Enums`, `deps.py`, `main.py`, `Auth Service & Refresh Tokens`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Settings` (e.g. with `_claims()` and `create_access_token()`) actually correct?**
  _`Settings` has 28 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pcclub-backend`, `expo/tsconfig.base`, `Schema changes via Alembic; test_migrations.py fails on model/migration drift` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Catalog & Admin Club Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.0654241894777713 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Catalog & Admin Club Endpoints` to `Payments & Provider Mocks`, `IIN Identity Verification`, `Current User & Staff Dependencies`, `create_booking`, `ORM Models & Enums`, `deps.py`, `main.py`, `Auth Service & Refresh Tokens`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Payments & Provider Mocks` be split into smaller, more focused modules?**
  _Cohesion score 0.06738245094409478 - nodes in this community are weakly interconnected._
- **Why does `StaffUser` connect `Catalog & Admin Club Endpoints` to `Zone`, `Current User & Staff Dependencies`, `Integration Test Fixtures`, `ORM Models & Enums`, `Model Base & Columns`, `deps.py`, `Auth Service & Refresh Tokens`, `Operator CLI & Demo Seed`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._