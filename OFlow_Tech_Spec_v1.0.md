# ⚙️ OFlow Universal Platform — Technical Specification (v1.0)
> Scope: Frontend, Backend, Database, APIs, Integrations, Workflows, Security, DevOps  
> Focus verticals: Dessert (orders/shipments) & Beauty (appointments/services) — same core, different modes.

---

## 0) System Overview
**Goal:** AI‑assisted back‑office that converts chat into structured orders/appointments, automates payments verification, scheduling/shipments, and produces daily reports + insights.

**Core Engines**
- Marketing (post generation + scheduling)
- Customer (multichannel inbox + AI replies)
- **Order/Appointment Center (Smart Order Hub)** ← *primary focus*
- Logistics/Service (shipments or attend-in-person services)
- Analytics (daily/weekly/monthly KPIs, dashboards)
- Advisor (insights + action suggestions)

**Tenancy:** Multi-tenant SaaS. Each account (org) owns its data via RLS.

**Primary stack**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, React Query, Recharts.
- **Backend:** NestJS (REST + Webhooks) or Supabase Edge Functions for light endpoints. Background workers via Supabase Scheduler / n8n.
- **DB:** Supabase Postgres 15 (+ pgvector). RLS enabled per org_id.
- **AI:** OpenAI (GPT for text; vision for receipt/transfer OCR fallback) + optional Azure Vision OCR.
- **Messaging/Channels:** LINE Messaging/Notify, Meta Graph (IG/FB DM & posts), Buffer (scheduling).
- **Files:** Supabase Storage (receipts, labels).
- **Infra:** Vercel (web), Supabase (db/auth/storage), n8n/Make (optional glue), Cloudflare for edge caching.
- **Observability:** OpenTelemetry + Logflare/Logtail, Supabase Logs, Sentry.

---

## 1) Frontend (Web Dashboard)
### 1.1 Information Architecture
- **Dashboard:** KPIs (revenue, orders done, unpicked, top items), alerts.
- **Marketing:** Composer (AI text/image), Calendar, Post list, Performance.
- **Inbox:** LINE/IG/FB unified threads, AI suggested replies, order lookup panel.
- **Orders / Appointments:** Table + Kanban (by status), Calendar view (beauty mode).
- **Logistics/Service:** Shipments, pickup schedule, label print preview.
- **Analytics:** Daily/weekly/monthly, product/service rankings, cohort & repeat rate.
- **Advisor:** Insights feed + “Apply” (creates tasks, posts, reminders).
- **Settings:** Brand profile, tone presets, channel connections, staff & roles.

### 1.2 UI Framework & Conventions
- shadcn/ui components; Tailwind tokens; dark/light themes.
- React Query for data fetching; optimistic updates for status toggles (paid, shipped).
- Feature flags via `config_features` (db table) to toggle vertical features.

### 1.3 State & Caching
- React Query caches per org scope key: `['orders', org_id, filters]`.
- WebSocket/Supabase Realtime subscriptions for order updates & inbox messages.
- Client-side Zod validation for forms; shared DTOs with backend types.

### 1.4 Accessibility & i18n
- i18n router: zh-TW default; en/ja optional. Date/number formatting via Intl API.
- Keyboard nav, focus states, ARIA for data tables and chat composer.

---

## 2) Backend (API + Workers)
### 2.1 Services
- **API Gateway (NestJS):** REST endpoints `/api/*`, JWT auth from Supabase.
- **Webhook Handlers:** `/webhooks/line`, `/webhooks/meta`, `/webhooks/buffer`, `/webhooks/logistics`.
- **Workers:** queue jobs (BullMQ or Supabase cron) for OCR, scheduling, post publishing, report aggregation.
- **Scheduler:** cron: daily report @ 00:05; advisor @ 08:00; reminders hourly.
- **Secrets:** Supabase secrets store / environment variables (per environment).

### 2.2 Request Flow Examples
**A) LINE message → Order inference**
```
LINE → /webhooks/line
  → intent_parser (LLM) + slot_extractor
  → upsert customer (by channel_user_id + org_id)
  → create order (status=pending) + optional suborders (pickups)
  → reply confirmation to LINE
```
**B) Payment proof → Verification**
```
LINE image → /webhooks/line
  → detect receipt vs chat image
  → OCR → amount/date → compare to order.total
  → if ok: status=paid; notify staff; schedule shipment/pickup
  → else: ask customer to confirm amount or resend
```
**C) Daily report**
```
cron 00:05 → aggregate metrics (orders, revenue, unpicked, top items)
  → store reports.daily
  → push summary to LINE Notify & email
```

---

## 3) Multi‑Tenant Auth & Roles
- Supabase Auth (email/oauth). `org_users` connects users to orgs.
- Roles: `owner`, `admin`, `staff`, `viewer`.
- JWT includes `org_id`, `role`, `scopes`.
- RLS: all tables filtered by `org_id` & membership.

---

## 4) Database Schema (Postgres/Supabase)
> All tables include: `id uuid`, `org_id uuid`, `created_at`, `updated_at`, `created_by`, `updated_by`.

### 4.1 Organizations & Users
```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text check (business_type in ('dessert','beauty','retail','other')) default 'other'
);

create table org_users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid not null,
  role text check (role in ('owner','admin','staff','viewer')) not null
);
```

### 4.2 Customers & Channels
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text,
  phone text,
  email text,
  tags text[] default '{}',
  channel_user_id text, -- LINE or IG id
  last_seen_at timestamptz
);

create table channel_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  provider text check (provider in ('line','meta','buffer','twitter','threads')),
  access_token text,
  refresh_token text,
  meta jsonb
);
```

### 4.3 Products / Services (unified)
```sql
create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  type text check (type in ('product','service')),
  name text not null,
  sku text,
  price numeric(12,2) not null,
  duration_minutes int,          -- for services
  inventory int,                 -- for products
  options jsonb default '{}',    -- e.g., temperature: chilled|ambient
  active boolean default true
);
```

### 4.4 Orders & Suborders (for split pickups)
```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  type text check (type in ('order','appointment')) default 'order',
  total numeric(12,2) not null,
  currency text default 'TWD',
  status text check (status in ('pending','paid','scheduled','shipped','delivered','completed','cancelled')) default 'pending',
  delivery_method text check (delivery_method in ('pickup','delivery','service')),
  notes text,
  source text, -- 'line','shopify','form','manual'
  channel_thread_id text,
  paid_at timestamptz,
  completed_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  catalog_item_id uuid references catalog_items(id),
  name text,
  quantity int not null,
  unit_price numeric(12,2) not null,
  options jsonb default '{}'
);

create table suborders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  schedule_at timestamptz not null,  -- pickup/delivery/service time
  quantity int,
  status text check (status in ('scheduled','ready','done','missed')) default 'scheduled',
  notes text
);
```

### 4.5 Payments & Proofs
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  method text, -- transfer, cash, card
  amount numeric(12,2) not null,
  status text check (status in ('pending','confirmed','failed')) default 'pending',
  proof_url text,       -- uploaded image
  recognized jsonb,     -- OCR results {amount, time, bank}
  confirmed_at timestamptz
);
```

### 4.6 Messaging & Inbox
```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  provider text,             -- line/meta
  thread_id text,
  from_customer boolean,
  customer_id uuid references customers(id),
  text text,
  media_url text,
  intent text,               -- 'order','payment','question'
  slots jsonb,               -- extracted {item, qty, date, temp}
  order_id uuid,
  received_at timestamptz default now()
);
```

### 4.7 Reports & Insights
```sql
create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  date date not null,
  revenue numeric(12,2),
  orders_count int,
  completed_count int,
  unpicked_count int,
  top_items jsonb, -- [{name, qty}]
  metrics jsonb
);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  date date,
  summary text,
  actions jsonb, -- [{title,cta,type}]
  priority text check (priority in ('low','medium','high')) default 'medium'
);
```

### 4.8 RLS (examples)
```sql
alter table orders enable row level security;
create policy org_isolation on orders
  for all using (org_id = auth.jwt() ->> 'org_id');

-- replicate for all org-scoped tables
```

---

## 5) APIs (REST)
> All endpoints require Authorization: Bearer <jwt> with org_id scope.

### 5.1 Orders
**GET `/api/orders`** — list (filters: status, date_from, date_to, q)  
**GET `/api/orders/:id`** — detail (items, suborders, payments)  
**POST `/api/orders`** — create manual order  
```json
{
  "customerId":"uuid",
  "deliveryMethod":"pickup",
  "items":[{"catalogItemId":"uuid","quantity":2,"options":{"temp":"chilled"}}],
  "notes":"母親節預購"
}
```
**PATCH `/api/orders/:id`** — update status, notes  
**POST `/api/orders/:id/suborders`** — add split pickups  
**POST `/api/orders/:id/mark-paid`** — mark paid (if manual)  

### 5.2 Payments
**POST `/api/payments/:orderId/proof`** — upload proof (returns payment record)  
**POST `/api/payments/:id/confirm`** — confirm (override AI)  
**GET `/api/payments?orderId=...`** — list by order

### 5.3 Messaging (internal)
**POST `/webhooks/line`** — receive LINE events (message, image, postback)  
**POST `/webhooks/meta`** — IG/FB webhook  
**POST `/api/inbox/reply`** — send reply with optional templates

### 5.4 Reports
**GET `/api/reports/daily?date=YYYY-MM-DD`**  
**GET `/api/reports/range?from=&to=`**  
**POST `/api/reports/trigger`** — admin re-run aggregation

### 5.5 Catalog
**GET/POST/PATCH `/api/catalog`** — manage products/services

### 5.6 Advisor
**POST `/api/advisor/analyze?date=YYYY-MM-DD`** — recompute insights
**GET `/api/advisor/feed`** — list suggestions

---

## 6) Integrations (non-exhaustive)
- **LINE Messaging/Notify:** receive DM, reply, push reminders.
- **Meta Graph (IG/FB):** DM & post performance, optional publishing via Buffer.
- **Buffer:** multi-network scheduling; we store post_id for analytics.
- **Logistics:** Yamato/Black Cat, 7‑Eleven logistics (when available). Fallback: label PDF only.
- **Google Calendar:** beauty vertical to block staff timeslots.

---

## 7) Workflows (Business)
### 7.1 Order from Chat
1. Customer chats in LINE (“兩顆原味，週五拿”).
2. Intent+slots extraction → create `orders` (pending) + `order_items` + optional `suborders`.
3. Bot replies summary; asks for transfer receipt.
4. On image webhook → OCR → match total. If matched → `payments.status=confirmed`, `orders.status=paid`.
5. Schedule pickup reminder (T‑24h) via Notify.
6. Next day 00:05 aggregate → `daily_reports`, 08:00 advisor pushes suggestion.

### 7.2 Split Pickup
- For each requested date/qty create `suborders` rows.
- Pickup reminder per suborder; mark `done` on staff confirmation.

### 7.3 Appointment (Beauty mode)
- `orders.type='appointment'`, `delivery_method='service'`.
- Required fields: `staff_id`, `schedule_at`, `duration_minutes` (from item).

---

## 8) Security & Compliance
- RLS for all org data; JWT validation on gateway.
- OAuth flows for LINE/Meta/Buffer; token rotation & encrypted at rest.
- File uploads: signed URLs with short TTL; virus scan optional.
- Audit trail on critical mutations (`_audits` table or pgMemento).

---

## 9) Observability
- Request traces (OpenTelemetry), error tracking (Sentry).
- Business dashboards: order status funnel, payment match rate, unpicked trend.
- Alerting on cron failures and webhook errors.

---

## 10) Performance & Limits
- Indexes: `orders(org_id, created_at desc)`, `messages(org_id, thread_id, received_at)`.
- Pagination: cursor-based (`?cursor=...&limit=50`).
- Rate limits: 60 rpm / token; 10 rps burst per org for webhooks.
- Large tenants: move heavy OCR/LLM calls to queues with retry/backoff.

---

## 11) Deployment & CI/CD
- **Environments:** dev / staging / prod.
- **CI:** lint (eslint), typecheck (tsc), test (vitest), schema migration (Prisma or SQL).
- **CD:** Vercel auto-deploy; Supabase migrations via `dbmate` or `supabase db push`.
- **Secrets:** per env via Vercel/Supabase secrets.

---

## 12) Testing Strategy
- Unit: intent parser (fixtures of chat texts), slot extractor, price matching.
- Integration: webhook → DB assertions; OCR mocked images; payment state machine.
- E2E: Cypress flows (create order from chat, upload receipt, split pickup, report).

---

## 13) Data Migrations & Backfill
- Idempotent ETL to import historical orders from Google Sheets/CSV.
- Backfill daily reports from historical orders for analytics continuity.

---

## 14) Appendix
### 14.1 Example DTOs
```ts
// Create manual order DTO
type CreateOrderDto = {
  customerId: string;
  deliveryMethod: 'pickup'|'delivery'|'service';
  items: { catalogItemId: string; quantity: number; options?: any }[];
  notes?: string;
  suborders?: { scheduleAt: string; quantity?: number; notes?: string }[];
};
```

### 14.2 Advisor Output
```json
{
  "date": "2025-10-17",
  "summary": "週五下午訂單最高 (+22%)",
  "actions": [
    {"title":"下週五 14:00 發促銷貼文","type":"marketing.post.schedule"},
    {"title":"提醒 3 筆未取單","type":"notify.customer.remind"}
  ],
  "priority":"high"
}
```

### 14.3 RLS Pattern Snippet
```sql
create policy org_read on orders for select
 using (org_id = auth.jwt() ->> 'org_id');

create policy org_write on orders for insert with check
 (org_id = auth.jwt() ->> 'org_id');
```

---

**End of Spec**