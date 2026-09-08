# BEKA Academy Bus Portal — Project Scaffold

**Location:** Umuahia
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Resend
**Payment model:** Manual — parent pays school directly, accounts office confirms, pass auto-generates on confirmation.

---

## 1. Route Map

```
/                           → Landing + fare calculator
/register                   → Public registration form (parent + child + route)
/registration/[id]/status   → Check status by reference (no login needed)

/parent/login
/parent/signup
/parent/dashboard           → List of registered children + statuses
/parent/dashboard/[studentId]/pass   → View/download QR pass (only if confirmed)

/accounts/login
/accounts/dashboard         → Queue: pending / confirmed / expired registrations
/accounts/dashboard/[id]    → Registration detail, confirm/reject action
/accounts/routes            → CRUD for routes + fare config

/api/webhooks/none          → (not needed — no payment gateway)
/api/pass/verify            → Scan-lookup endpoint (accounts staff, mobile-friendly)
```

---

## 2. Database Schema (Supabase / Postgres)

```sql
-- ─────────────────────────────
-- ROUTES
-- ─────────────────────────────
create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- e.g. "Umuahia Town / World Bank"
  area_description text,
  base_fare_one_way numeric not null,
  base_fare_round_trip numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- FEE DISCOUNT TIERS (multi-child)
-- ─────────────────────────────
create table discount_tiers (
  id uuid primary key default gen_random_uuid(),
  min_children int not null,             -- e.g. 2
  discount_percent numeric not null,     -- e.g. 10
  term text,                              -- optional: scope to a term, null = always
  active boolean default true
);

-- ─────────────────────────────
-- PARENTS (linked to Supabase auth.users)
-- ─────────────────────────────
create table parents (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  address text,
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- STUDENTS
-- ─────────────────────────────
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id) on delete cascade,
  full_name text not null,
  class_level text not null,             -- e.g. "JSS2"
  route_id uuid references routes(id),
  trip_type text check (trip_type in ('one_way','round_trip')) default 'round_trip',
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- REGISTRATIONS (one per student per term)
-- ─────────────────────────────
create table registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  route_id uuid references routes(id),
  term text not null,                    -- e.g. "2026/2027 Term 1"
  computed_fare numeric not null,
  status text check (status in ('pending','confirmed','rejected','expired')) default 'pending',
  proof_of_payment_url text,             -- optional Supabase Storage upload
  reference_code text unique not null,   -- shown to parent for status lookup
  confirmed_by uuid references staff(id),
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- STAFF (accounts office — separate auth from parents)
-- ─────────────────────────────
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text check (role in ('accounts','admin')) default 'accounts',
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- BUS PASSES (created only on confirmation)
-- ─────────────────────────────
create table bus_passes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id) on delete cascade,
  student_id uuid references students(id),
  qr_token text unique not null,         -- signed/random token encoded in QR
  term text not null,
  issued_at timestamptz default now(),
  valid_until date not null
);
```

**RLS notes for Kiro:**
- `parents` / `students` / `registrations`: parent can only `select`/`insert` rows where `parent_id = auth.uid()` (via join for students/registrations).
- `staff` table: only accessible to authenticated staff; use a `is_staff()` helper function checking `auth.uid()` against `staff`.
- `routes`, `discount_tiers`: public `select` (needed for fare calculator on landing page, no auth), `insert`/`update` restricted to staff with `role = 'admin'`.
- `bus_passes`: parent can `select` only their own; staff can `select` all (for scan verification).

---

## 3. Fare Calculation Logic

```
fare = route.base_fare[trip_type]
if children_count >= discount_tier.min_children:
    fare *= (1 - discount_tier.discount_percent / 100)
total = sum(fare per child)
```

Keep this as a single shared function (`lib/fare.ts`) used by both the public calculator (client-side estimate) and the server-side registration handler (authoritative calculation — never trust client-submitted fare amounts).

---

## 4. Status & Notification Flow

1. Parent submits registration → status `pending`, `reference_code` generated (e.g. `BEKA-2026-0001`), confirmation email sent ("we've received your registration, please pay at the school accounts office, reference X").
2. Parent can check `/registration/[reference_code]/status` anytime without login.
3. Accounts staff sees pending queue, opens registration, clicks **Confirm** (or **Reject** with a reason).
4. On confirm: trigger inserts `bus_passes` row with signed `qr_token`, sets `valid_until` (end of term), sends email via Resend with QR pass attached/linked.
5. Parent portal now shows the pass as downloadable.

---

## 5. Kiro Prompts (paste in order)

### Prompt 1 — Project init
```
Create a new Next.js 15 App Router project with TypeScript and Tailwind CSS v4 called "beka-bus-portal". Set up Supabase client utilities (browser + server) following the standard @supabase/ssr pattern. Set up a lib/ folder with fare.ts (empty for now), and a types/ folder with a database.ts for Supabase generated types (placeholder). Configure .env.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
```

### Prompt 2 — Database schema
```
Add a Supabase SQL migration file (supabase/migrations/0001_init.sql) with the following tables: routes, discount_tiers, parents, students, registrations, staff, bus_passes. [paste schema from section 2 above]. Include RLS policies: public read on routes and discount_tiers; parents can only access their own parents/students/registrations rows via auth.uid(); staff table gated to authenticated staff; bus_passes readable by owning parent or any staff. Add a helper SQL function is_staff(uid uuid) returns boolean.
```

### Prompt 3 — Fare calculator (public, no auth)
```
Build the landing page (app/page.tsx) with a hero section for "BEKA Academy Student Transit" and a fare calculator component. It should fetch active routes from Supabase (public read), let the user pick a route, number of children, and trip type (one-way/round-trip), then call a shared calculateFare() function from lib/fare.ts to show an estimate. Style with Tailwind v4, clean and modern, mobile-first. Do not require login for this page.
```

### Prompt 4 — Registration flow
```
Build app/register/page.tsx: a multi-step form where a parent enters their own details (name, phone, email, address), then adds one or more children (name, class level, route, trip type). On submit: create/find the parent's Supabase auth account (magic link or password), insert parents/students/registrations rows, compute fare server-side using lib/fare.ts (never trust client fare), generate a unique reference_code, and send a confirmation email via Resend with payment instructions and the reference code. Redirect to a success page showing the reference code and a link to check status.
```

### Prompt 5 — Status lookup (public)
```
Build app/registration/[reference]/status/page.tsx — a public page where anyone with a reference code can see the registration status (pending/confirmed/rejected) without logging in. Query registrations by reference_code only, return minimal info (student first name, route, status, fare — no sensitive parent data).
```

### Prompt 6 — Parent portal
```
Build app/parent/login and app/parent/dashboard. Dashboard lists all of the logged-in parent's children with their registration status. If a registration is 'confirmed', show a "View Bus Pass" button linking to app/parent/dashboard/[studentId]/pass, which renders the QR pass (use a QR code library like qrcode.react) with student name, route, term, and valid_until date, plus a download-as-image button.
```

### Prompt 7 — Accounts office portal
```
Build app/accounts/login and app/accounts/dashboard, gated to users present in the staff table. Dashboard shows a table/queue of registrations filterable by status (pending/confirmed/rejected), with columns: reference code, student name, route, fare, submitted date. Clicking a row opens app/accounts/dashboard/[id] with full detail (parent contact, proof of payment if uploaded) and Confirm/Reject buttons. Confirm should: update registration status, insert a bus_passes row with a generated qr_token and valid_until, and trigger a Resend email to the parent with the pass. Reject should prompt for a reason and email the parent.
```

### Prompt 8 — Route management (admin)
```
Build app/accounts/routes/page.tsx, staff-only (role='admin'), for CRUD on routes (name, area description, base fares) and discount_tiers (min children, discount percent). Simple table + modal form pattern.
```

### Prompt 9 — Pass verification endpoint
```
Build app/api/pass/verify/route.ts — a POST endpoint accepting a qr_token, checking it against bus_passes, and returning student name, route, term, and validity (valid_until >= today). This will back a simple scan-lookup page for staff at the bus gate, app/accounts/verify/page.tsx, with a manual token input (camera QR scan can be added later with a library like html5-qrcode).
```

---

## 6. Open items to fill in before/during build
- [ ] Actual Umuahia route list + fare amounts (currently placeholder-driven via `routes` table — safe to launch with 1–2 seed routes and expand)
- [ ] Discount tier percentages for multiple children
- [ ] School's payment instructions text (bank details / bursary hours) to embed in confirmation email
- [ ] Term dates (for `valid_until` on passes)
- [ ] Branding — BEKA logo, colors (currently unspecified, will default to a clean neutral palette)
