# BEKA Academy Bus Portal

School bus registration, fare calculation, and digital pass system for BEKA Academy (Umuahia).

**Payment model:** Manual — parent registers online, pays fees at the school, accounts office confirms payment, system auto-generates a QR bus pass.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres + RLS + Storage)
- Resend (transactional email)
- qrcode.react (bus pass QR generation)

## How to use this folder with Kiro

1. Open this folder in Kiro.
2. Work through `KIRO_PROMPTS.md` **in order** — each prompt builds on the last. Paste one at a time, let Kiro finish, review/test, then move to the next.
3. `supabase/migrations/0001_init.sql` already has the full schema + RLS — run it in your Supabase project before Prompt 2 (or have Kiro run it via Supabase CLI).
4. Copy `.env.example` to `.env.local` and fill in real keys before running `npm run dev`.
5. `lib/fare.ts` has the fare calculation stub — Prompt 3 wires it up.

## Folder structure
```
beka-bus-portal/
├── app/                    # Next.js App Router pages (empty — Kiro builds this out)
├── components/             # Shared UI components
├── lib/
│   └── fare.ts             # Fare calculation logic (shared client + server)
├── types/
│   └── database.ts         # Supabase generated types (placeholder)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql   # Full schema + RLS policies
├── public/                 # Static assets (BEKA logo, etc.)
├── .env.example
├── PROJECT_SCAFFOLD.md      # Full architecture reference (routes, schema notes, flow)
└── KIRO_PROMPTS.md          # Step-by-step prompts to paste into Kiro
```

## Open items before/during build
- [ ] Real Umuahia route list + fare amounts (schema ships with 2 seed placeholder routes)
- [ ] Discount tier percentages for multiple children
- [ ] School's payment instructions (bank details / bursary hours) for confirmation email
- [ ] Term dates (for bus pass `valid_until`)
- [ ] BEKA branding — logo, colors
