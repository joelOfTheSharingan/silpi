-- ============================================================
-- Silpi — RLS Policies (apply AFTER verifying anon works)
-- Project: nvayoiarsbsrzwbcszen
-- Apply in Supabase SQL Editor. Idempotent.
-- ============================================================
-- Current live state: RLS DISABLED on all 7 tables (seed mode).
-- Keep disabled until Google OAuth is verified, then enable.
-- App uses anon key for reads; after enabling, anon SELECT must stay allowed
-- via permissive SELECT policy, writes require authenticated session.

-- ── Enable RLS ──────────────────────────────────────────────
alter table public.users           enable row level security;
alter table public.projects        enable row level security;
alter table public.billing_stages  enable row level security;
alter table public.bills           enable row level security;
alter table public.bill_taxes      enable row level security;
alter table public.bill_deductions enable row level security;
alter table public.payments        enable row level security;

-- ── Drop existing (idempotent) ──────────────────────────────
drop policy if exists "anon_select_users"           on public.users;
drop policy if exists "auth_select_users"           on public.users;
drop policy if exists "auth_self_provision_users"   on public.users;
drop policy if exists "auth_update_users"           on public.users;

drop policy if exists "anon_select_projects"        on public.projects;
drop policy if exists "auth_select_projects"        on public.projects;
drop policy if exists "auth_write_projects"         on public.projects;

drop policy if exists "anon_select_billing_stages"  on public.billing_stages;
drop policy if exists "auth_select_billing_stages"  on public.billing_stages;
drop policy if exists "auth_write_billing_stages"   on public.billing_stages;

drop policy if exists "anon_select_bills"           on public.bills;
drop policy if exists "auth_select_bills"           on public.bills;
drop policy if exists "auth_write_bills"            on public.bills;

drop policy if exists "anon_select_bill_taxes"      on public.bill_taxes;
drop policy if exists "auth_select_bill_taxes"      on public.bill_taxes;
drop policy if exists "auth_write_bill_taxes"       on public.bill_taxes;

drop policy if exists "anon_select_bill_deductions" on public.bill_deductions;
drop policy if exists "auth_select_bill_deductions" on public.bill_deductions;
drop policy if exists "auth_write_bill_deductions"  on public.bill_deductions;

drop policy if exists "anon_select_payments"        on public.payments;
drop policy if exists "auth_select_payments"        on public.payments;
drop policy if exists "auth_write_payments"         on public.payments;

-- ── users ───────────────────────────────────────────────────
-- Anon can read (dashboard needs user list before auth wall is removed in future)
create policy "anon_select_users" on public.users
  for select to anon, authenticated using (true);
create policy "auth_select_users" on public.users
  for select to authenticated using (true);
-- Self-provision: any authenticated user can insert their own row (ensureAppUser)
create policy "auth_self_provision_users" on public.users
  for insert to authenticated with check (auth_user_id = auth.uid());
-- Allow authenticated to update own row; Admin updates handled via service_role or elevated policy later
create policy "auth_update_users" on public.users
  for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- ── projects —───────────────────────────────────────────────
create policy "anon_select_projects" on public.projects
  for select to anon, authenticated using (true);
create policy "auth_select_projects" on public.projects
  for select to authenticated using (true);
create policy "auth_write_projects" on public.projects
  for all to authenticated using (true) with check (true);

-- ── billing_stages ──────────────────────────────────────────
create policy "anon_select_billing_stages" on public.billing_stages
  for select to anon, authenticated using (true);
create policy "auth_select_billing_stages" on public.billing_stages
  for select to authenticated using (true);
create policy "auth_write_billing_stages" on public.billing_stages
  for all to authenticated using (true) with check (true);

-- ── bills ───────────────────────────────────────────────────
create policy "anon_select_bills" on public.bills
  for select to anon, authenticated using (true);
create policy "auth_select_bills" on public.bills
  for select to authenticated using (true);
create policy "auth_write_bills" on public.bills
  for all to authenticated using (true) with check (true);

-- ── bill_taxes ──────────────────────────────────────────────
create policy "anon_select_bill_taxes" on public.bill_taxes
  for select to anon, authenticated using (true);
create policy "auth_select_bill_taxes" on public.bill_taxes
  for select to authenticated using (true);
create policy "auth_write_bill_taxes" on public.bill_taxes
  for all to authenticated using (true) with check (true);

-- ── bill_deductions ─────────────────────────────────────────
create policy "anon_select_bill_deductions" on public.bill_deductions
  for select to anon, authenticated using (true);
create policy "auth_select_bill_deductions" on public.bill_deductions
  for select to authenticated using (true);
create policy "auth_write_bill_deductions" on public.bill_deductions
  for all to authenticated using (true) with check (true);

-- ── payments ────────────────────────────────────────────────
create policy "anon_select_payments" on public.payments
  for select to anon, authenticated using (true);
create policy "auth_select_payments" on public.payments
  for select to authenticated using (true);
create policy "auth_write_payments" on public.payments
  for all to authenticated using (true) with check (true);

-- Notes:
-- - Views (project_billing_totals, bill_payment_totals) inherit from base tables; no separate policy needed.
-- - To tighten later: replace anon SELECT with authenticated-only, and scope writes by role:
--     exists (select 1 from public.users where users.auth_user_id = auth.uid() and users.role in ('Admin','Accounts'))
-- - Keep service_role bypassing RLS for admin scripts.
