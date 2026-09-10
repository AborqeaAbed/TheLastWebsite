# The Last Website — Project Context

## What it is

A novelty internet monument. Users pay to permanently claim one of **1,000,000 spots** on a grid. Each spot holds a name and message. The first 1,000 spots are "Founding" tier ($1); all remaining 999,000 are "Standard" ($5). Once claimed, a spot is permanent and public.

---

## Architecture

```
Browser ──► Caddy (TLS + reverse proxy)
               ├──► frontend:3000   (Next.js)
               ├──► backend:8080    (Spring Boot / Java)
               └──► n8n:5678        (workflow automation, optional)
                        │
                        └──► postgres:5432
```

All four services run via `docker-compose.yml`. Caddy handles HTTPS automatically (Let's Encrypt). The `api.` subdomain proxies to the backend; the apex domain proxies to the frontend; `n8n.` proxies to n8n.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind + custom CSS |
| Backend | Java 21 / Spring Boot 3, Spring Data JPA |
| Database | PostgreSQL 15, Flyway migrations |
| Payments | Stripe Checkout (webhook-confirmed) |
| Email | Resend API |
| Proxy | Caddy 2 |
| Automation | n8n (optional workflows) |

---

## How it works — the claim flow

```
1. User opens site → hero modal shows pricing tiers + live count
2. User clicks a spot on the canvas map → ClaimForm modal opens
3. User submits name, message, email
   → POST /api/spots/{n}/reserve  (backend holds spot for 5 min)
4. PaymentModal shown → user picks Stripe
   → POST /api/payments/create-checkout/{n}
   → redirected to Stripe Checkout
5. Stripe completes → webhook fires checkout.session.completed
   → backend: spot status → PENDING_VERIFICATION
   → backend sends 6-digit OTP to user's email
6. User lands on /verify?email=... → enters 6-digit code
   → POST /api/auth/verify-code
   → spot status → CLAIMED, session token issued, confirmation email sent
```

**Dev / mock mode:** if `STRIPE_SECRET_KEY` is blank or a placeholder, the backend skips real Stripe and goes straight to step 5. The OTP verify modal appears in-page on the homepage (no redirect needed).

---

## Spot statuses

| Status | Meaning |
|---|---|
| `AVAILABLE` | Free to claim |
| `RESERVED` | Held during payment (5-min timeout, auto-released by scheduler) |
| `PENDING_VERIFICATION` | Payment succeeded, waiting for OTP confirm |
| `CLAIMED` | Permanently owned |
| `LOCKED` | Admin-locked, cannot be claimed |

The `expireReservations()` job in `SpotService` runs every 30 s and releases any `RESERVED` or `PENDING_VERIFICATION` spots whose `reserved_until` has passed.

---

## Auth

No passwords. Two flows, both OTP-based:

- **CLAIM** — triggered automatically after payment. 6-digit code, 15-min expiry. Completing it finalises the spot.
- **MANAGE** — user requests code via "My Spot" panel to edit their spot's name/message.

Sessions are stored in the `auth_sessions` table as hashed tokens, expire after 14 days. The raw token is passed as a cookie (`credentials: 'include'` in `api.ts`).

---

## Pricing logic

Defined in `Constants.java`:

```java
LAUNCH_PRICE_CENTS  = 100   // $1
STANDARD_PRICE_CENTS = 500  // $5
LAUNCH_SUBSCRIBER_LIMIT = 1000
```

`currentPriceCents()` in `PaymentService` counts `CLAIMED` spots live at checkout time. If `< 1000` claimed → $1, otherwise → $5.

---

## Database schema (key tables)

```
users            id, email, email_verified
spots            spot_number (1–1,000,000), x, y, status, user_id,
                 name, message, reserved_until, claimed_at, moderation_status, locked
payments         spot_id, user_id, stripe_payment_id, amount, status
verification_tokens  user_id, spot_id, purpose (CLAIM|MANAGE), token_hash, expires_at, used_at
auth_sessions    user_id, spot_id, token_hash, expires_at
audit_logs       user_id, spot_id, action, metadata (JSONB)
```

Spots are seeded by the V1 migration — all 1,000,000 rows inserted at init with deterministic `(x, y)` coordinates. `x = (n % 1000) * 0.001`, `y = floor(n / 1000) * 0.001`, so the grid is 1000×1000 cells.

---

## Map rendering

The canvas map (`useMapEngine.ts`, `map/camera.ts`) renders spots client-side on a `<canvas>`. It calls `/api/spots/viewport` with the current bounding box and zoom level. The backend returns one of three modes:

| Zoom | Mode | Response |
|---|---|---|
| ≤1 | `universe` | Just aggregate counts |
| 2 | `regions` | Buckets of 20×20 grid cells with claim counts |
| ≥3 | `spots` | Up to 2,500 individual spot DTOs |

---

## Admin API

All endpoints under `/api/admin/*` require `X-Admin-Token: <ADMIN_TOKEN>` header.

| Endpoint | What it does |
|---|---|
| `GET /api/admin/stats` | Claimed count, revenue, claims today |
| `GET /api/admin/users?q=email` | List or search users |
| `GET /api/admin/spots?spotNumber=N` | List claimed or look up one spot |
| `GET /api/admin/moderation` | Spots with `PENDING` moderation status |
| `POST /api/admin/spots/{n}/lock` | Lock a spot so it can't be claimed |
| `POST /api/admin/spots/{n}/moderate?status=APPROVED\|REJECTED` | Override moderation status |
| `GET /api/admin/audit` | Last 100 audit log entries |
| `POST /api/admin/payments/{sessionId}/apply` | Manually apply a succeeded Stripe payment |

The frontend has an admin page at `/admin` (protected by token).

---

## Content moderation

`ContentModerationService` sanitizes name/message on write (strip HTML, truncate) and evaluates them to `PENDING`, `APPROVED`, or `REJECTED`. Rejected content is stored but not shown publicly. Admins can override via the moderation endpoint.

---

## Analytics

`POST /api/analytics` accepts `{ eventName, metadata }`. Events are stored in `analytics_events` table. Tracked events from the frontend include `homepage_view`, `map_loaded`, `claim_started`, `checkout_started`, `email_verification`, `spot_claimed`, `search_started`, `random_spot_clicked`.

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `APP_DOMAIN` | Root domain (e.g. `thelastwebsite.com`) |
| `DB_NAME / DB_USERNAME / DB_PASSWORD` | Postgres credentials |
| `RESEND_API_KEY` | Email delivery |
| `EMAIL_FROM` | Sender address |
| `STRIPE_SECRET_KEY` | Stripe backend key (blank → mock mode) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `ADMIN_TOKEN` | Bearer token for `/api/admin/*` |
| `N8N_USER / N8N_PASSWORD` | n8n basic auth |

---

## Running locally

```bash
# Start everything (Postgres + backend + frontend + Caddy)
docker compose up --build

# Frontend only (no Docker, for fast iteration)
cd frontend && npm install && npm run dev

# Backend only
cd backend && ./mvnw spring-boot:run

# Check backend logs
docker logs the-last-website-backend -f

# Check DB directly
docker exec -it the-last-website-db psql -U postgres -d thelastwebsite

# Run backend tests
cd backend && ./mvnw test
```

**Mock payment mode** is automatic when `STRIPE_SECRET_KEY` is blank. The checkout call returns immediately; OTP verify appears in-page.

---

## Key file map

```
frontend/
  app/page.tsx              Main page — map, hero, all modals
  app/verify/page.tsx       Post-Stripe verify page
  app/admin/page.tsx        Admin dashboard
  app/spot/[number]/page.tsx  Shareable spot permalink
  components/Modal.tsx       ClaimForm, PaymentModal
  components/Overlays.tsx    SearchOverlay, ManageSpot, ShareButtons
  hooks/useMapEngine.ts      Canvas map state and rendering
  services/api.ts            All backend API calls
  types/index.ts             Shared TS types (Spot, Stats, ViewportResponse)
  styles/variables.css       Design tokens (colors, radii, fonts)

backend/src/main/java/com/thelastwebsite/
  spots/SpotService.java     Core spot lifecycle logic
  payments/PaymentService.java  Stripe checkout + webhook
  auth/AuthService.java      OTP create/verify, session management
  admin/AdminController.java Admin endpoints
  common/Constants.java      All magic numbers and status strings
  moderation/ContentModerationService.java  Name/message sanitize + eval

backend/src/main/resources/
  application.yml            All config with env-var fallbacks
  db/migration/V1__*.sql     Schema + 1M spot seed
  db/migration/V2–V5__*.sql  Subsequent schema additions
```
