# Silpi Architects — Project Billing & Tracking (React export)

Plain React (function component + hooks) conversion of the Design Component prototype. No external UI library — styling is inline `style={{}}` objects reading CSS custom properties from `tokens.css` (the Silpi Architects design tokens: browns/cream/clay palette, Cormorant Garamond + Archivo type).

## Files
- `App.jsx` — the whole app: sidebar nav + role switcher, Dashboard, Project detail, Bill & Payment Tracker, Initiate Billing / Record Payment / New Bill forms, User Management. All data is in-memory mock data (`PROJECTS`, `SEED_BILLS`, `USERS` at the top of the file) — swap these for real API calls / a data layer (see `database/schema.sql` in the parent project for a matching Supabase schema).
- `tokens.css` — design tokens (colors, type, fonts import).
- `main.jsx`, `index.html` — Vite entry points.

## Run it
```bash
npm create vite@latest my-app -- --template react
# copy App.jsx, tokens.css into src/, replacing src/main.jsx and index.html with the ones here
npm install
npm run dev
```

## Notes for a real backend
- Role switching, project edits, bills, and payments are all local component state — none of it persists. Wire the `set*` handlers to API calls / Supabase mutations and replace the mock arrays with fetched data.
- `fmtMoney` formats Indian currency (₹ Cr/L compact, or full with `en-IN` grouping) — a `currencyFormat` prop toggles this, matching the original DC's tweak.
- Partial billing/payment logic (`stageOverrides`, `paymentOverrides`) tracks amount-so-far client-side; a real implementation should compute this server-side from a `payments` table (see the schema).

## Connecting to Supabase

1. **Install the client**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Add your `.env`** (Vite reads `VITE_*` vars) — copy `.env.example` to `.env` and fill in your project's URL + anon key from Supabase → Settings → API:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
   `.env` is never committed — add it to `.gitignore`.

3. **Run the schema, then the seed data**, in the Supabase SQL editor (or `psql`), in this order:
   - `database/schema.sql` (from the project root) — creates all tables, views, edit-history triggers.
   - `database/seed.sql` — inserts the same 5 mock projects / stages / bills / payments used in this prototype, so the UI has real rows to render immediately.

4. **`supabaseClient.js`** creates the client from those env vars; **`api.js`** has the read/write functions (`getProjects`, `getBills`, `createBill`, `recordPayment`, `updateProjectFields`, etc.) built against the schema's tables and views (`project_billing_totals`, `bill_payment_totals`).

5. **Wire it into `App.jsx`**: replace the `PROJECTS` / `SEED_BILLS` / `USERS` constants with `useEffect` calls to `getProjects()` / `getBills()` / `getUsers()` into `useState`, and swap the local `set*` mutators (`setOverride`, `submitBill`, `submitNewBill`, `submitPayment`, `applyBulk`) for calls to `updateProjectFields` / `createBill` / `recordPayment`, refetching (or updating local state) on success. Example for the project list:
   ```jsx
   import { useEffect, useState } from 'react';
   import { getProjects } from './api';

   const [projects, setProjects] = useState([]);
   useEffect(() => { getProjects().then(setProjects).catch(console.error); }, []);
   ```

6. **Row Level Security**: `schema.sql` enables RLS with only a starter "authenticated read" policy. Add write policies (and Supabase Auth for `auth.uid()`) before going further than a prototype — currently no client can insert/update until you add policies for `projects`, `bills`, `bill_taxes`, `bill_deductions`, `payments`.
