# Kiro Prompts — BEKA Bus Portal

Paste these one at a time, in order. Let each finish and review before moving to the next.
The schema migration (`supabase/migrations/0001_init.sql`) already exists in this folder —
run it against your Supabase project before Prompt 2.

---

### Prompt 1 — Project init
```
Create a new Next.js 15 App Router project with TypeScript and Tailwind CSS v4 called "beka-bus-portal" in this folder (don't overwrite lib/fare.ts, types/database.ts, supabase/, README.md, or PROJECT_SCAFFOLD.md — they already exist). Set up Supabase client utilities (browser + server) following the standard @supabase/ssr pattern. Wire .env.example values into a working config.
```

### Prompt 2 — Confirm schema
```
The Supabase schema is already defined in supabase/migrations/0001_init.sql. Apply this migration to the connected Supabase project (via Supabase CLI or dashboard SQL editor), then generate TypeScript types into types/database.ts.
```

### Prompt 3 — Fare calculator (public landing page)
```
Build the landing page (app/page.tsx) with a hero section for "BEKA Academy Student Transit" and a fare calculator component. Fetch active routes from Supabase (public read). Let the user pick a route, number of children, and trip type (one-way/round-trip), then use the existing calculateFare() function from lib/fare.ts to show an estimate, including any applicable discount tier. Style with Tailwind v4, clean and modern, mobile-first. No login required for this page.
```

### Prompt 4 — Registration flow
```
Build app/register/page.tsx: a multi-step form where a parent enters their own details (name, phone, email, address), then adds one or more children (name, class level, route, trip type). On submit: create/find the parent's Supabase auth account (magic link or password), insert parents/students/registrations rows, compute fare server-side using lib/fare.ts (never trust client fare), generate a unique reference_code using generateReferenceCode() from lib/fare.ts, and send a confirmation email via Resend with payment instructions and the reference code. Redirect to a success page showing the reference code and a link to check status.
```

### Prompt 5 — Status lookup (public)
```
Build app/registration/[reference]/status/page.tsx — a public page where anyone with a reference code can see the registration status (pending/confirmed/rejected) without logging in. Query registrations by reference_code only, return minimal info (student first name, route, status, fare — no sensitive parent data).
```

### Prompt 6 — Parent portal
```
Build app/parent/login and app/parent/dashboard. Dashboard lists all of the logged-in parent's children with their registration status. If a registration is 'confirmed', show a "View Bus Pass" button linking to app/parent/dashboard/[studentId]/pass, which renders the QR pass (use qrcode.react) with student name, route, term, and valid_until date, plus a download-as-image button.
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
Build app/api/pass/verify/route.ts — a POST endpoint accepting a qr_token, checking it against bus_passes, and returning student name, route, term, and validity (valid_until >= today). Back this with a simple scan-lookup page for staff at the bus gate, app/accounts/verify/page.tsx, with a manual token input field (camera QR scan can be added later with html5-qrcode).
```

---

## After Prompt 9 (polish pass, optional)
- Real Umuahia routes + fares swapped into seed data
- BEKA branding (logo, color palette) applied across all portals
- Loading/empty states reviewed on all dashboards
- Email templates reviewed for tone/branding consistency
