# Vidya Vriddhi — Sales CRM

A focused, production-ready Sales CRM built with the Next.js App Router, TypeScript, Tailwind CSS 4, and MongoDB (Mongoose). It is designed around the daily workflow of a calling team: import leads, distribute them, call and message prospects, log outcomes, and see what is converting.

The interface is intentionally minimal: a black canvas, dark `border-slate-200` cards, clean Roboto typography, and green WhatsApp accents.

---

## Highlights

- **Role-based access control** — `SUPER_ADMIN`, `ADMIN`, and `SALES_EXEC` with server-enforced data boundaries.
- **Lead ingestion** — paste scraped GMB/PDF text or upload CSV. Flexible delimiter/header detection, optional category tagging, phone normalization, duplicate skipping, and optional load-balanced auto-distribution.
- **Calling workflow** — one-click `tel:` dialer with a quick call logger, inline status updates, follow-up dates, and a notes/activity drawer.
- **WhatsApp outreach** — pre-filled sales templates opened through `wa.me`, with a live message preview.
- **Follow-up queue** — every rep gets a focused "today" list with overdue items highlighted.
- **Analytics** — per-rep scorecards built from real call logs: calls this week/today, connected calls, unique leads called, meetings, proposals, conversions, follow-ups, stale leads, and stage-change auditing. Open any rep for a 14-day call trend and drill-down.
- **Team management** — create reps/admins, deactivate accounts, and automatically unassign a deactivated rep's leads.
- **Secure sessions** — stateless JWT in an HttpOnly, SameSite=Lax cookie; bcrypt password hashing.
- **Dual interface** — React Server Actions power the UI, and a parallel REST API is available for integrations.

---

## Tech stack

| Layer      | Choice                                      |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)          |
| Language   | TypeScript (strict)                         |
| UI         | Tailwind CSS 4, lucide-react, clsx          |
| Database   | MongoDB with Mongoose 9                     |
| Auth       | `jose` (JWT) + `bcryptjs`                   |
| Validation | `zod`                                       |
| Tooling    | ESLint 9, `tsx`                             |

---

## Getting started

**Requirements:** Node.js 22+, and MongoDB 6+ (local or Atlas). No MongoDB installed? Use the built-in dev database:

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env.local
# then edit .env.local (see below)

# 3. Start a local MongoDB (first run downloads a mongod binary)
npm run db
# keep this running in its own terminal

# 4. Create the first SUPER_ADMIN account
npm run seed

# 5. Start the app (in another terminal)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the `SUPER_ADMIN_*` credentials.

`npm run db` starts MongoDB on `127.0.0.1:27017` and stores data in `.mongo-data/`, so records survive restarts. It is a development convenience only — production deployments should set `MONGODB_URI` to Atlas or a managed MongoDB server.

`npm run dev` also starts the local database automatically when `MONGODB_URI` points at localhost and nothing is listening yet, so step 3 is optional once the admin exists. Remote/cluster URIs are never auto-started. Use `npm run dev:next` if you only want Next.js.

Next.js loads `.env.local` first, then `.env`. The seed script uses the same loader, so either file works.

### Environment variables

| Variable                          | Required | Purpose                                                        |
| --------------------------------- | :------: | -------------------------------------------------------------- |
| `MONGODB_URI`                     |   yes    | MongoDB connection string.                                     |
| `JWT_SECRET`                      |   yes    | Session signing secret. Use **32+ random characters**.         |
| `NEXT_PUBLIC_APP_URL`             |    no    | Canonical app URL used for metadata. Defaults to localhost.    |
| `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE`|    no    | Country code added to 10-digit phone numbers. Defaults to `91`. |
| `SUPER_ADMIN_NAME`                |    no    | Display name for the super admin. Defaults to `Super Admin`.   |
| `SUPER_ADMIN_USERNAME`            |   yes    | Super admin username (3–32 chars).                             |
| `SUPER_ADMIN_EMAIL`               |    no    | Optional email for the super admin.                            |
| `SUPER_ADMIN_PASSWORD`            |   yes    | Super admin password (8+ characters).                          |

Generate a secret with:

```bash
openssl rand -base64 32
```

> **Values containing `#` must be quoted** (`SUPER_ADMIN_PASSWORD="abc#123"`). Unquoted, dotenv treats `#` and everything after it as a comment, which silently truncates the value.

The super admin is **defined in the environment**, not created in the UI. Signing in with `SUPER_ADMIN_USERNAME` + `SUPER_ADMIN_PASSWORD` provisions (or repairs) that account on the spot, so a brand-new or reset database still lets the owner in. Changing the env password and signing in again rotates it. `npm run seed` does the same thing ahead of time and is safe to re-run.

The database starts empty — sign in as the super admin and create your sales reps from the Team page. New team members are always sales reps; there is no admin/role picker. No demo leads or demo accounts are seeded.

### Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the app (auto-starts local MongoDB).   |
| `npm run dev:next`  | Start only Next.js.                          |
| `npm run build`     | Production build.                            |
| `npm start`         | Serve the production build.                  |
| `npm run lint`      | Run ESLint.                                  |
| `npm run typecheck` | Run `tsc --noEmit`.                          |
| `npm run db`        | Start the local dev MongoDB (persistent).    |
| `npm run seed`      | Create/upgrade the initial super admin.      |

---

## Roles and permissions

| Capability                          | SUPER_ADMIN | ADMIN | SALES_EXEC |
| ----------------------------------- | :---------: | :---: | :--------: |
| View organization-wide leads        |      ✓      |   ✓   |     —      |
| View only own assigned leads        |      ✓      |   ✓   |     ✓      |
| Import leads                        |      ✓      |   ✓   |     —      |
| Auto / bulk assign leads            |      ✓      |   ✓   |     —      |
| Assign all matching leads (split or one rep) | ✓ |   ✓   |     —      |
| Log calls, notes, status, follow-up |      ✓      |   ✓   |     ✓      |
| View analytics                      |      ✓      |   ✓   | own only   |
| Create sales reps                   |      ✓      |   ✓   |     —      |
| Create/manage admins                |      ✓      |   —   |     —      |
| Deactivate accounts                 |      ✓      | reps  |     —      |

Sales execs are scoped in the data layer and service layer — not just the UI. A rep requesting another rep's lead receives a `404`.

---

## Project structure

```text
my-app/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Centered auth shell
│   │   └── login/page.tsx          # Sign-in page
│   ├── api/                        # REST interface (parallel to Server Actions)
│   │   ├── analytics/route.ts
│   │   ├── auth/{login,logout,me}/route.ts
│   │   ├── leads/route.ts
│   │   ├── leads/[id]/route.ts
│   │   ├── leads/[id]/calls/route.ts
│   │   ├── leads/[id]/notes/route.ts
│   │   ├── leads/assign/route.ts
│   │   ├── leads/import/route.ts
│   │   ├── leads/intake/route.ts      # API-key intake for external sites
│   │   ├── users/route.ts
│   │   └── users/[id]/route.ts
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar + auth guard
│   │   ├── loading.tsx
│   │   ├── page.tsx                # Role-aware overview
│   │   ├── analytics/page.tsx      # Admin analytics
│   │   ├── leads/page.tsx          # Lead table, filters, pagination
│   │   ├── team/page.tsx           # User management
│   │   ├── team/[id]/page.tsx      # Per-rep performance drill-down
│   │   └── today/page.tsx          # Follow-up queue
│   ├── globals.css                 # Theme + component classes
│   ├── layout.tsx
│   └── page.tsx                    # Session-aware root redirect
├── components/crm/
│   ├── AnalyticsSummary.tsx        # KPI cards
│   ├── AssignSelect.tsx            # Inline assignment
│   ├── CallTrendChart.tsx          # 14-day call/connect bars
│   ├── EmptyState.tsx
│   ├── ImportLeadsModal.tsx        # Paste/CSV import
│   ├── LeadFilters.tsx
│   ├── LeadTable.tsx               # Table + bulk bar + modals
│   ├── LoginForm.tsx
│   ├── Logo.tsx
│   ├── Modal.tsx                   # Modal + slide-over primitives
│   ├── NotesDrawer.tsx             # Activity timeline + add note
│   ├── PageHeader.tsx
│   ├── QuickCallModal.tsx          # Call outcome logger
│   ├── RepPerformanceTable.tsx
│   ├── Sidebar.tsx
│   ├── StatCard.tsx
│   ├── StatusBadge.tsx
│   ├── StatusSelect.tsx            # Optimistic inline status
│   ├── TeamManager.tsx             # Create/deactivate accounts
│   └── WhatsAppModal.tsx           # Template picker + wa.me link
├── lib/
│   ├── actions/                    # Server Actions
│   │   ├── auth.ts
│   │   ├── leads.ts
│   │   └── users.ts
│   ├── auth/
│   │   ├── jwt.ts                  # Sign/verify session token
│   │   └── session.ts              # getCurrentUser, requireUser, requireAdmin
│   ├── data/                       # Read/query layer
│   │   ├── analytics.ts
│   │   ├── leads.ts
│   │   └── users.ts
│   ├── db/connect.ts               # Cached Mongoose connection
│   ├── models/
│   │   ├── Lead.ts
│   │   └── User.ts
│   ├── services/                   # Write/business logic layer
│   │   ├── errors.ts
│   │   ├── leads.ts
│   │   └── users.ts
│   ├── api.ts                      # REST helpers + auth guards
│   ├── constants.ts                # Roles, statuses, templates
│   ├── csv.ts                      # Lead text/CSV parser
│   ├── types.ts                    # Shared DTOs and action states
│   ├── utils.ts                    # Phone, date, formatting helpers
│   └── validators.ts               # Zod schemas
├── scripts/
│   ├── dev.ts                      # Dev launcher (Next + local MongoDB)
│   ├── dev-db.ts                   # Persistent local MongoDB for development
│   └── seed.ts                     # Create/upgrade the initial super admin
├── proxy.ts                        # Route protection for /dashboard
├── next.config.ts
└── .env.example
```

### Layering

- **`lib/models`** — Mongoose schemas, indexes, password hashing.
- **`lib/services`** — mutations and authorization. Shared by Server Actions and REST routes so both interfaces behave identically.
- **`lib/data`** — typed read queries, aggregations, and DTO mapping.
- **`lib/actions`** — thin Server Action wrappers: auth check → validation → service → `revalidatePath`.
- **`app/api`** — thin REST wrappers: auth guard → validation → service.

---

## Data models

### User

```ts
{
  name: string;
  username: string;              // unique, lowercase, 3–32 chars
  email: string | null;          // optional, sparse-unique
  password: string;              // bcrypt hash, select: false
  role: "SUPER_ADMIN" | "ADMIN" | "SALES_EXEC";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Users sign in with their **username** (or their email, for accounts that have one). A `pre("save")` hook hashes changed passwords with bcrypt (12 rounds). `comparePassword()` is available on documents. Passwords are stripped from JSON output.

### Lead

```ts
{
  businessName: string;
  phoneNumber: string;           // normalized digits
  cityState: string | null;
  category: string | null;
  source: string | null;         // "head": Google My Business, Google Ads, ...
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "MEETING" | "PROPOSAL" | "CONVERTED" | "LOST";
  assignedTo: ObjectId | null;   // ref User
  followUpDate: Date | null;
  notes: {
    comment: string;
    createdBy: ObjectId;         // ref User
    createdAt: Date;
  }[];
  callLogs: {
    calledBy: ObjectId;          // ref User
    calledAt: Date;
    resultStatus: string;
  }[];
  statusHistory: {
    from: LeadStatus;
    to: LeadStatus;
    changedBy: ObjectId;         // ref User
    changedAt: Date;
    source: "manual" | "call";   // call logger vs status dropdown
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `businessName`, `phoneNumber`, `status`, `assignedTo`, `followUpDate`, `source`, plus compound `{ assignedTo, status }`, `{ followUpDate, status }`, `{ createdAt: -1 }`, and `{ "statusHistory.changedBy": 1, "statusHistory.changedAt": -1 }`.

---

## Lead import

Admins can paste raw text or upload a `.csv` / `.txt` file (up to 2 MB).

**Accepted shapes**

```csv
businessName,phoneNumber,cityState,category,source
Sharma Dental Clinic,9876543210,Jaipur,Clinic,Google My Business
Metro Fitness | 9812345678 | Delhi | Gym | Meta Ads
Green Leaf Cafe; 9823456789; Pune; Cafe; Referral
```

- Headers are optional. The parser looks for business/company/name, phone/mobile/contact, city/state/location/address, category/segment/industry/vertical, and source/channel/platform/campaign columns.
- Category is free text, so you can import any segment you use (for example `School`, `Coaching`, `Clinic`). Existing categories appear in the leads filter and are suggested while importing.
- For headerless rows the order is: business name, phone, city, category, source.
- `source` records where the lead came from. It is a fixed list: **Google My Business, Google Ads, Meta Ads, Instagram, Facebook, WhatsApp, Website, Referral, Walk-in, Cold Call, JustDial, IndiaMART, LinkedIn, YouTube, Event, Other**. Common spellings (`gmb`, `google_ads`, `facebook ads`, `insta`, …) are normalized; an unrecognized value is stored as `Other`.
- Delimiters `,`, tab, `|`, and `;` are detected per line.
- Loose lines such as `Sharma Dental Clinic 9876543210 Jaipur` are also parsed.
- 10-digit numbers are prefixed with `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE` (default `91`); leading zeros are removed.
- Duplicate phone numbers within the paste and against the database are skipped.
- **Auto-distribute evenly** assigns new leads to active reps with the lightest current load (not naive round-robin).
- Binary PDFs are rejected by design. Open the PDF, copy its text, and paste it.

Import limits: 5,000 rows per request.

---

## REST API

All routes return `{ "data": ... }` on success and `{ "error": "..." }` on failure. Authentication uses the `crm_session` cookie set by `POST /api/auth/login`.

| Method   | Route                    | Access            | Description                                    |
| -------- | ------------------------ | ----------------- | ---------------------------------------------- |
| `POST`   | `/api/auth/login`        | public            | Sign in and set the session cookie.            |
| `POST`   | `/api/auth/logout`       | public            | Clear the session cookie.                      |
| `GET`    | `/api/auth/me`           | authenticated     | Current session user.                          |
| `GET`    | `/api/leads`             | authenticated     | List leads (rep-scoped). Filters below.        |
| `POST`   | `/api/leads`             | admin             | Create a lead.                                 |
| `GET`    | `/api/leads/:id`         | authenticated     | Fetch one lead (rep-scoped).                   |
| `PATCH`  | `/api/leads/:id`         | authenticated     | Update status / follow-up date / assignee.     |
| `DELETE` | `/api/leads/:id`         | admin             | Delete a lead.                                 |
| `POST`   | `/api/leads/:id/calls`   | authenticated     | Log a call outcome (+ optional note/date).     |
| `POST`   | `/api/leads/:id/payments` | rep (own lead) / admin | Record a full or partial payment.        |
| `DELETE` | `/api/leads/:id/payments/:paymentId` | admin | Remove a payment entry.              |
| `POST`   | `/api/leads/:id/notes`   | authenticated     | Add a note.                                    |
| `POST`   | `/api/leads/assign`      | admin             | Bulk assign/unassign up to 500 leads.          |
| `POST`   | `/api/leads/import`      | admin             | Import from raw text/CSV.                      |
| `POST`   | `/api/leads/intake`      | `LEAD_API_KEY`    | External lead intake from another website.     |
| `GET`    | `/api/users`             | admin             | List users with lead and call counts.          |
| `POST`   | `/api/users`             | admin             | Create a user.                                 |
| `PATCH`  | `/api/users/:id`         | admin             | Update name, role, or active state.            |
| `GET`    | `/api/analytics`         | admin             | Org-wide analytics and rep performance.        |

**Lead list query parameters:** `q`, `status`, `assigned` (`unassigned` or a user id), `category`, `source`, `payment` (`UNPAID` | `PARTIAL` | `PAID`), `page`, `limit` (max 100).

**Example**

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"admin","password":"your-password"}'

curl -b cookies.txt 'http://localhost:3000/api/leads?status=FOLLOW_UP&page=1'
```

### External lead intake (`POST /api/leads/intake`)

A route handler (not a Server Action) for other websites — landing pages, ad platforms, Zapier, Google Apps Script, etc. It does **not** use the session cookie; it authenticates with the `LEAD_API_KEY` environment variable.

Send the key as `x-api-key: <key>` or `Authorization: Bearer <key>`. CORS is open, so a browser form on another origin can call it directly.

**Body:** either one lead object, an array of leads, or `{ "leads": [...], "autoAssign": true }` (max 500 leads per request).

| Field          | Required | Notes                                                    |
| -------------- | -------- | -------------------------------------------------------- |
| `businessName` | yes      | 2–200 characters.                                        |
| `phoneNumber`  | yes      | 10–15 digits; normalized to digits.                      |
| `cityState`    | no       | City / state / area.                                     |
| `category`     | no       | Free text segment.                                       |
| `source`       | no       | Where it came from (aliases accepted). Missing/unknown → `Other`. |
| `autoAssign`   | no       | `true` distributes new leads to active reps with the lightest load. |

```bash
curl -X POST http://localhost:3000/api/leads/intake \
  -H 'content-type: application/json' \
  -H 'x-api-key: your-lead-api-key' \
  -d '{
    "leads": [
      {
        "businessName": "Sharma Dental Clinic",
        "phoneNumber": "9876543210",
        "cityState": "Jaipur",
        "category": "Clinic",
        "source": "Google Ads"
      }
    ],
    "autoAssign": true
  }'
```

Success returns `201` (or `200` when nothing new was created):

```json
{
  "data": {
    "created": [{ "id": "...", "businessName": "Sharma Dental Clinic", "phoneNumber": "919876543210" }],
    "skipped": [],
    "createdCount": 1,
    "skippedCount": 0
  }
}
```

Duplicate phone numbers are **not** an error — they come back in `skipped` with `reason: "duplicate"` (invalid numbers use `reason: "invalid"`), so a retried webhook is safe. `401` means a wrong/missing key, `422` a malformed payload, and `503` means `LEAD_API_KEY` is not set on the server.

### Server Actions

Used by the UI; all are `"use server"` and re-validate the session server-side.

| File               | Actions                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/actions/auth.ts`  | `loginAction`, `logoutAction`                                                                                                                                                                       |
| `lib/actions/leads.ts` | `updateLeadStatusAction`, `setLeadFollowUpDateAction`, `logCallAction`, `addNoteAction`, `recordPaymentAction`, `setDealValueAction`, `deletePaymentAction`, `assignLeadAction`, `bulkAssignLeadsAction`, `assignAllLeadsAction`, `createLeadAction`, `deleteLeadAction`, `bulkDeleteLeadsAction`, `importLeadsAction` |
| `lib/actions/users.ts` | `createUserAction`, `updateUserIncentiveAction`, `toggleUserActiveAction`                                                                                                                                                        |

---

## Workflow notes

- **Deactivating a rep** immediately blocks sign-in and unassigns all of their leads so they can be redistributed.
- **Deleting leads is admin-only and always confirmed.** The trash icon on a lead row (or the bulk "Delete" button after selecting leads) opens an "Are you sure?" dialog that warns the lead and its notes, call logs, status history, and payments will be permanently removed. Mark a lead `Lost` instead if history should be kept.
- **Admins can only manage sales reps.** Only a `SUPER_ADMIN` can create or change `ADMIN` / `SUPER_ADMIN` accounts, change roles, or deactivate an admin.
- **Incentive settings are super-admin only.** Only a `SUPER_ADMIN` can change a rep's incentive rate or switch incentives on/off; admins created by a super admin start with incentives off until enabled.
- **Status changes** to anything other than `FOLLOW_UP` clear `followUpDate`.
- **Logging a call** appends to `callLogs`, updates the lead status, optionally sets a follow-up date, and can attach a note in one step.
- **Stage changes are audited.** Every status move writes a `statusHistory` entry with the previous stage, the new stage, the user, and a `source` of `call` (call logger) or `manual` (status dropdown / follow-up date). This is what makes "contacted without a call" detectable.
- **Follow-up analytics** count leads currently in `FOLLOW_UP` whose date falls in the window.
- **Conversion rate** is `converted leads ÷ assigned (or total) leads` for the relevant scope.

---

## Performance tracking

The admin analytics page (`/dashboard/analytics`) is built from **call logs and stage history**, not from reps simply marking a lead as "Contacted". Each sales rep row shows:

| Metric | Definition |
| --- | --- |
| Leads assigned | Current leads owned by the rep. |
| Calls this week / today | Entries in `callLogs` made by the rep since Monday / today. |
| Connected calls | Calls with an outcome in `Connected`, `Callback requested`, `Not interested`, or `Converted`. `No answer`, `Busy`, and `Wrong number` do not count. |
| Unique leads called | Distinct leads the rep called this week (stops one lead inflating the call count). |
| Meetings / proposals | Leads currently sitting in `MEETING` / `PROPOSAL`. |
| Converted | Leads currently in `CONVERTED`, plus conversion rate against assigned leads. |
| Follow-ups due / overdue | `FOLLOW_UP` leads dated today or earlier than today. |
| Manual stage changes | `statusHistory` entries this week with `source: "manual"` — stage moves with no call attached. |
| Contacted without a call | Leads in an advanced stage (`CONTACTED` onward) that have zero call logs. |
| Stale leads | Open leads with no call in the last 7 days (never-called leads count). |
| Last activity | Most recent call logged against any of the rep's leads. |
| Payments collected | Sum of payment entries credited to this rep (payments received, not deal value). |
| Incentive | `collected payments × rep incentive rate`, or **Fixed salary** when the super admin has turned incentive off. |

**Coaching flags** are shown inline: `N manual`, `N no-call`, and `N stale`. A rep who marks every lead "Contacted" without dialing will show high manual/no-call counts and few or zero calls.

Open a rep's row (or the bar-chart button on the Team page) to see the drill-down at `/dashboard/team/[id]`:

- 14-day call trend split into connected vs other outcomes.
- Recent calls with outcomes and timestamps.
- Leads needing attention (never called, or no call in 7+ days).
- Recent stage changes, labelled **Call** or **Manual**, with before/after status badges.
- The same coaching signals and follow-up load for that rep.

The lead activity drawer also merges notes, calls, payments, and stage changes into one timeline, so the conversation history and the audit trail sit side by side.

---

## Payments & incentives

Payments are recorded **after the developer meeting**. A deal becomes payable once the lead reaches `MEETING`, `PROPOSAL`, or `CONVERTED`; earlier stages show a hint instead of the payment button.

| Field | Notes |
| --- | --- |
| `dealValue` | Total final contract value for the lead. **Admin-only** so reps cannot inflate their own incentives. |
| `payments[]` | Each entry stores `amount`, `paidAt`, `mode` (Cash / UPI / Bank transfer / Cheque / Card / Other), optional `reference` and `note`, the credited `repId`, and `recordedBy`. |
| `amountPaid` / `amountDue` | Derived on read from the payments array and `dealValue`. |
| `paymentStatus` | `UNPAID` (no payments), `PARTIAL` (paid < deal value), `PAID` (paid ≥ deal value). |

Rules enforced in the service layer:

- The deal value must be set before the first payment.
- A payment cannot exceed the remaining due amount; a fully paid deal rejects new entries.
- A 30% advance and a single full payment are both just payment entries — the system does not force a schedule.
- Reps can record payments on their own leads; admins can record on any lead. Each payment stores who recorded it.
- Only admins can delete a payment, and the total deal value cannot be reduced below the amount already received.
- The rep who owns the lead at payment time is credited (`repId`), even when an admin records it on their behalf. Reassigning the lead later does not move historical incentives.

### Incentive calculation

- Incentives are calculated on **money actually received**, not on the total deal value: `incentive = collected payments × incentive rate`.
- The super admin sets each rep's rate (default 5%) and can switch incentives **off** entirely for reps on a fixed salary. The team table shows an `Incentive` / `Fixed` toggle per sales rep.
- A rate change applies to the rep's current collected total (the rate is not snapshotted per payment).
- Deleting a payment immediately reduces the collected total and therefore the incentive.
- Dashboards, analytics, rep performance, and the rep drill-down show collected amount and earned incentive for the current rate.

---

## Security

- Sessions are signed with HS256 and stored in an HttpOnly cookie (`crm_session`, 7 days).
- `JWT_SECRET` must be at least 32 characters; the app refuses to sign/verify otherwise.
- Passwords are hashed with bcrypt (12 rounds) and never selected by default.
- Every Server Action and API route re-checks the current user and role — client-side hiding is never the only control.
- Reps are scoped by `assignedTo` in database queries, so cross-rep access returns `404`.
- Inputs are validated with Zod before reaching the service layer.
- `secure` cookies are enabled automatically in production; serve the app over HTTPS there.

---

## Design notes

- Global theme tokens live in `app/globals.css` (`.card`, `.input`, `.btn-primary`, `.badge`, etc.). The Tailwind color scales are remapped for the dark theme there — low steps are dark surfaces, high steps are light text.
- Sales pipeline: New (slate) → Contacted (sky) → Follow up (amber) → Developer meeting (violet) → Proposal sent (orange) → Converted (emerald) / Lost (rose).
- WhatsApp actions use `#128C7E` accents; calls use the brand orange.
- Tables are horizontally scrollable on small screens; the sidebar collapses into a slide-over.
- Status and assignment controls update optimistically and refresh server data after the mutation.

---

## Troubleshooting

| Symptom                              | Fix                                                                 |
| ------------------------------------ | ------------------------------------------------------------------- |
| `MONGODB_URI is missing`             | Create `.env.local` from `.env.example`.                            |
| `ECONNREFUSED 127.0.0.1:27017`       | Start MongoDB, or run `npm run db` in a separate terminal.          |
| `JWT_SECRET is missing or too short` | Use 32+ random characters.                                          |
| Cannot sign in as the super admin | Confirm `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` in `.env`; the account is provisioned automatically on the next sign-in (or run `npm run seed`). |
| Import says "No valid leads found"   | Ensure each row has a business name and a 10–15 digit phone number. |
| PDF upload rejected                  | Copy the PDF text and paste it instead.                             |
| Rep sees no leads                    | Leads must be assigned; deactivation unassigns leads.               |
