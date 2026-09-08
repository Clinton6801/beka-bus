-- ═══════════════════════════════════════════
-- BEKA Academy Bus Portal — Initial Schema
-- ═══════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────────
-- ROUTES
-- ─────────────────────────────
create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area_description text,
  base_fare_one_way numeric not null,
  base_fare_round_trip numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- DISCOUNT TIERS (multi-child)
-- ─────────────────────────────
create table discount_tiers (
  id uuid primary key default gen_random_uuid(),
  min_children int not null,
  discount_percent numeric not null,
  term text,
  active boolean default true
);

-- ─────────────────────────────
-- PARENTS
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
-- STAFF (accounts office)
-- ─────────────────────────────
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text check (role in ('accounts','admin')) default 'accounts',
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- STUDENTS
-- ─────────────────────────────
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id) on delete cascade,
  full_name text not null,
  class_level text not null,
  route_id uuid references routes(id),
  trip_type text check (trip_type in ('one_way','round_trip')) default 'round_trip',
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- REGISTRATIONS
-- ─────────────────────────────
create table registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  route_id uuid references routes(id),
  term text not null,
  computed_fare numeric not null,
  status text check (status in ('pending','confirmed','rejected','expired')) default 'pending',
  proof_of_payment_url text,
  reference_code text unique not null,
  confirmed_by uuid references staff(id),
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

-- ─────────────────────────────
-- BUS PASSES
-- ─────────────────────────────
create table bus_passes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id) on delete cascade,
  student_id uuid references students(id),
  qr_token text unique not null,
  term text not null,
  issued_at timestamptz default now(),
  valid_until date not null
);

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

create or replace function is_staff(uid uuid)
returns boolean as $$
  select exists (select 1 from staff where id = uid);
$$ language sql security definer stable;

create or replace function is_admin_staff(uid uuid)
returns boolean as $$
  select exists (select 1 from staff where id = uid and role = 'admin');
$$ language sql security definer stable;

-- ═══════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════

alter table routes enable row level security;
alter table discount_tiers enable row level security;
alter table parents enable row level security;
alter table staff enable row level security;
alter table students enable row level security;
alter table registrations enable row level security;
alter table bus_passes enable row level security;

-- ROUTES: public read, admin write
create policy "routes_public_select" on routes for select using (true);
create policy "routes_admin_write" on routes for all using (is_admin_staff(auth.uid()));

-- DISCOUNT TIERS: public read, admin write
create policy "discount_tiers_public_select" on discount_tiers for select using (true);
create policy "discount_tiers_admin_write" on discount_tiers for all using (is_admin_staff(auth.uid()));

-- PARENTS: parent can see/update only their own row; staff can see all
create policy "parents_self_select" on parents for select using (id = auth.uid() or is_staff(auth.uid()));
create policy "parents_self_insert" on parents for insert with check (id = auth.uid());
create policy "parents_self_update" on parents for update using (id = auth.uid());

-- STAFF: staff can see staff table (for role checks); only admin can write
create policy "staff_select" on staff for select using (is_staff(auth.uid()));
create policy "staff_admin_write" on staff for all using (is_admin_staff(auth.uid()));

-- STUDENTS: parent sees only their own children; staff sees all
create policy "students_parent_select" on students for select using (
  parent_id = auth.uid() or is_staff(auth.uid())
);
create policy "students_parent_insert" on students for insert with check (parent_id = auth.uid());
create policy "students_parent_update" on students for update using (parent_id = auth.uid());

-- REGISTRATIONS: parent sees only their children's registrations; staff sees all
create policy "registrations_select" on registrations for select using (
  exists (select 1 from students s where s.id = student_id and s.parent_id = auth.uid())
  or is_staff(auth.uid())
);
create policy "registrations_parent_insert" on registrations for insert with check (
  exists (select 1 from students s where s.id = student_id and s.parent_id = auth.uid())
);
create policy "registrations_staff_update" on registrations for update using (is_staff(auth.uid()));

-- BUS PASSES: parent sees only their children's passes; staff sees all
create policy "bus_passes_select" on bus_passes for select using (
  exists (select 1 from students s where s.id = student_id and s.parent_id = auth.uid())
  or is_staff(auth.uid())
);
create policy "bus_passes_staff_insert" on bus_passes for insert with check (is_staff(auth.uid()));

-- ═══════════════════════════════════════════
-- SEED DATA (placeholder — replace with real Umuahia routes)
-- ═══════════════════════════════════════════

insert into routes (name, area_description, base_fare_one_way, base_fare_round_trip) values
  ('Route A — Placeholder', 'Update with real Umuahia route name/area', 8000, 15000),
  ('Route B — Placeholder', 'Update with real Umuahia route name/area', 10000, 18000);

insert into discount_tiers (min_children, discount_percent) values
  (2, 10),
  (3, 15);
