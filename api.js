import { supabase, silpi } from './supabaseClient.js';

/*
  SilpiDB — Supabase data layer — ALL tables in public schema (single schema)
    public.users                (id, auth_user_id, employee_code, name, email, role, username, phone, created_at, updated_at)
    public.projects             (id, number, name, category, total_area, contract_value, revised_contract_value, project_incharge_id, site_incharge_id, drawing_incharge_id, drawing_status, site_percent, created_at, updated_at)
    public.billing_stages       (id, project_id, stage, pct, amount, sort_order, created_at, updated_at)
    public.bills                (id, bill_no, project_id, billing_stage_id, stage_label, amount, total, status, date, comments, created_by, created_at, updated_at)
    public.bill_taxes           (id, bill_id, label, pct, amount, created_at)
    public.bill_deductions      (id, bill_id, label, pct, amount, created_at)
    public.payments             (id, bill_id, amount, received_via, date, recorded_by, created_at)
    public.bill_payment_totals  VIEW (bill_id, total, paid_so_far, remaining)
    public.project_billing_totals VIEW (project_id, total_billed, total_received)

  Access: all via public (default schema) — supabase.from('…') or supabase.schema('public').from('…').
  The alias `silpi` in supabaseClient.js points to public for compat.
  Views are read-only.
*/

// ──────────────────────── helpers ───────────────────────
export function classifySupabaseError(err) {
  if (!err) return null;
  const msg = err.message || String(err);
  const code = err.code || '';
  if (code === 'PGRST106' || msg.includes('schema must be one of') || msg.includes('exposed_schemas')) {
    return { kind: 'schema_not_exposed', code, message: msg, hint: 'Exposed schemas mismatch. Ensure public is in Supabase → Settings → API → Exposed schemas.' };
  }
  if (code === '42P01' || msg.includes('does not exist') || msg.includes('relation') && msg.includes('does not exist')) {
    return { kind: 'table_not_exist', code, message: msg, hint: 'Table/view missing in public. Re-run ~/.openclaw/workspace/silpi-supabase-setup.sql in Supabase SQL Editor.' };
  }
  if (code === '42501' || msg.includes('permission denied') || msg.includes('row-level security') || msg.includes('RLS') || code === 'PGRST301') {
    return { kind: 'rls', code, message: msg, hint: 'RLS is blocking anon. Create SELECT/INSERT policies for anon or authenticated, or verify auth session.' };
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || code === 'NETWORK') {
    return { kind: 'network', code, message: msg, hint: 'Network/CORS failure. Check VITE_SUPABASE_URL and that the project is not paused.' };
  }
  return { kind: 'unknown', code, message: msg, hint: '' };
}

function handleError(res, context) {
  if (res.error) {
    console.error(`[Supabase] ${context}:`, res.error);
    throw res.error;
  }
  return res.data;
}

// ──────────────────────── users (public) ───────────────────────
// Checklist requires: supabase.from('users') — public is default, do NOT use silpidb

/**
 * Ensure a public.users row exists for the authenticated Supabase user.
 * Called on first Google login when no row is found by auth_user_id.
 * Idempotent — on unique-violation (concurrent tab) re-selects by auth_user_id.
 */
export async function ensureAppUser({ authUserId, email, name, phone }) {
  const displayName = (name || '').trim() || (email ? email.split('@')[0] : 'User');
  const safeEmail = (email || '').trim() || null;
  const safePhone = (phone || '').trim() || null;

  function newId() {
    try { return globalThis.crypto?.randomUUID?.() || authUserId; } catch { return authUserId; }
  }

  async function tryInsert(employeeCode) {
    const row = {
      id: newId(),
      auth_user_id: authUserId,
      name: displayName,
      employee_code: employeeCode,
      role: 'Member',
    };
    if (safeEmail) row.email = safeEmail;
    if (safePhone) row.phone = safePhone;
    const res = await supabase.from('users').insert(row).select().single();
    return res;
  }

  function genCode() {
    const hex = authUserId ? authUserId.replace(/-/g, '').slice(0, 8).toUpperCase() : '';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const base = hex || rand + Math.random().toString(36).slice(2, 4).toUpperCase();
    return `EMP-${base}${rand.slice(0, 2)}`.slice(0, 12);
  }

  let employeeCode = genCode();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await tryInsert(employeeCode);
    if (!res.error) return res.data;

    const code = res.error.code || '';
    const msg = (res.error.message || '').toLowerCase();

    // Unique violation — employee_code or auth_user_id collision (concurrent insert)
    if (code === '23505' || msg.includes('duplicate key') || msg.includes('already exists')) {
      // If auth_user_id already exists, another tab won — just fetch it
      if (msg.includes('auth_user_id')) {
        const existing = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle();
        if (existing.data) return existing.data;
        if (existing.error) throw existing.error;
      }
      // Otherwise employee_code collision — retry with new code
      employeeCode = genCode();
      continue;
    }

    // Legacy schema without email/phone column — retry without those fields
    if ((msg.includes('email') || msg.includes('phone')) && (safeEmail || safePhone)) {
      const retryRow = {
        id: newId(),
        auth_user_id: authUserId,
        name: displayName,
        employee_code: employeeCode,
        role: 'Member',
      };
      // try without phone first if phone caused it
      if (safeEmail && !msg.includes('phone')) retryRow.email = safeEmail;
      else if (safeEmail && msg.includes('phone')) retryRow.email = safeEmail;
      const retry = await supabase.from('users').insert(retryRow).select().single();
      if (!retry.error) return retry.data;
      // if still failing due to phone column missing, try bare minimum
      if ((retry.error.message || '').toLowerCase().includes('phone')) {
        const retry2 = await supabase.from('users').insert({
          id: newId(),
          auth_user_id: authUserId,
          name: displayName,
          employee_code: employeeCode,
          role: 'Member',
          ...(safeEmail ? { email: safeEmail } : {}),
        }).select().single();
        if (!retry2.error) return retry2.data;
        throw retry2.error;
      }
      throw retry.error;
    }

    throw res.error;
  }
  throw new Error('Failed to create user row after retries');
}

export async function getUsers({ search, role, limit = 100 } = {}) {
  let q = supabase.from('users').select('*').limit(limit);
  if (search) q = q.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
  if (role) q = q.eq('role', role);
  q = q.order('email', { ascending: true });
  const res = await q;
  return handleError(res, 'getUsers');
}

export async function getUserById(id) {
  const res = await supabase.from('users').select('*').eq('id', id).single();
  return handleError(res, 'getUserById');
}

// ──────────────────────── projects (public) ───────────────────────
export async function getProjects({ search, category, drawingStatus, limit = 200 } = {}) {
  let q = silpi
    .from('projects')
    .select('*, billing_stages(*)')
    .order('number', { ascending: true })
    .limit(limit);

  if (search) q = q.or(`name.ilike.%${search}%,number.ilike.%${search}%`);
  if (category) q = q.eq('category', category);
  if (drawingStatus) q = q.eq('drawing_status', drawingStatus);

  const res = await q;
  const projects = handleError(res, 'getProjects');

  // stitch incharge names from public.users (best-effort) — live users has name, username, email, role
  const ids = [...new Set(projects.flatMap((p) => [p.project_incharge_id, p.site_incharge_id, p.drawing_incharge_id]).filter(Boolean))];
  if (ids.length) {
    const { data: users } = await supabase.from('users').select('id, name, email, username, role').in('id', ids);
    const byId = Object.fromEntries((users || []).map((u) => [u.id, u]));
    for (const p of projects) {
      p.project_incharge = byId[p.project_incharge_id] || null;
      p.site_incharge = byId[p.site_incharge_id] || null;
      p.drawing_incharge = byId[p.drawing_incharge_id] || null;
    }
  }
  return projects;
}

export async function getProjectById(id) {
  const res = await silpi.from('projects').select('*, billing_stages(*)').eq('id', id).single();
  return handleError(res, 'getProjectById');
}

export async function getBillingStages(projectId) {
  let q = silpi.from('billing_stages').select('*').order('sort_order', { ascending: true });
  if (projectId) q = q.eq('project_id', projectId);
  const res = await q;
  return handleError(res, 'getBillingStages');
}

// ──────────────────────── views (aggregates) ───────────────────────
export async function getProjectTotals() {
  const res = await silpi.from('project_billing_totals').select('*');
  if (res.error) throw res.error;
  return res.data;
}

export async function getBillPaymentTotals(billId) {
  let q = silpi.from('bill_payment_totals').select('*');
  if (billId) q = q.eq('bill_id', billId);
  const res = await q;
  return handleError(res, 'getBillPaymentTotals');
}

// ──────────────────────── bills + line items + payments ───────────────────────
export async function getBills({ projectId, status, limit = 200 } = {}) {
  let q = silpi.from('bills').select('*, bill_taxes(*), bill_deductions(*), payments(*)').order('date', { ascending: false }).limit(limit);
  if (projectId) q = q.eq('project_id', projectId);
  if (status) q = q.eq('status', status);
  const res = await q;
  const bills = handleError(res, 'getBills');

  const pIds = [...new Set(bills.map((b) => b.project_id).filter(Boolean))];
  if (pIds.length) {
    const { data: projects } = await silpi.from('projects').select('id, name, number').in('id', pIds);
    const byId = Object.fromEntries((projects || []).map((p) => [p.id, p]));
    for (const b of bills) b.project = byId[b.project_id] || null;
  }
  return bills;
}

export async function getBillById(id) {
  const res = await silpi.from('bills').select('*, bill_taxes(*), bill_deductions(*), payments(*)').eq('id', id).single();
  return handleError(res, 'getBillById');
}

export async function getPayments({ billId, limit = 200 } = {}) {
  let q = silpi.from('payments').select('*').order('date', { ascending: false }).limit(limit);
  if (billId) q = q.eq('bill_id', billId);
  const res = await q;
  return handleError(res, 'getPayments');
}

export async function getBillTaxes(billId) {
  let q = silpi.from('bill_taxes').select('*').order('created_at');
  if (billId) q = q.eq('bill_id', billId);
  const res = await q;
  return handleError(res, 'getBillTaxes');
}

export async function getBillDeductions(billId) {
  let q = silpi.from('bill_deductions').select('*').order('created_at');
  if (billId) q = q.eq('bill_id', billId);
  const res = await q;
  return handleError(res, 'getBillDeductions');
}

// ──────────────────────── writes ───────────────────────
export async function updateProjectFields(projectId, fields) {
  const res = await silpi.from('projects').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', projectId).select().single();
  return handleError(res, 'updateProjectFields');
}

export async function updateBillingStage(stageId, fields) {
  const res = await silpi.from('billing_stages').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', stageId).select().single();
  return handleError(res, 'updateBillingStage');
}

export async function createBillingStage({ projectId, stage, pct, amount, sortOrder = 0 }) {
  const res = await silpi.from('billing_stages').insert({ project_id: projectId, stage, pct, amount, sort_order: sortOrder }).select().single();
  return handleError(res, 'createBillingStage');
}

export async function createBill({ projectId, billingStageId, billNo, stageLabel, amount, taxes, deductions, date, comments, createdBy }) {
  const taxTotal = (taxes || []).reduce((s, t) => s + Math.round(amount * Number(t.pct) / 100), 0);
  const deductionTotal = (deductions || []).reduce((s, d) => s + Math.round(amount * Number(d.pct) / 100), 0);
  const total = amount + taxTotal - deductionTotal;

  const res = await silpi.from('bills').insert({
    bill_no: billNo,
    project_id: projectId,
    billing_stage_id: billingStageId || null,
    stage_label: stageLabel,
    amount,
    total,
    status: 'Billed',
    date: date || new Date().toISOString().slice(0, 10),
    comments: comments || null,
    created_by: createdBy || null,
  }).select().single();
  const bill = handleError(res, 'createBill');

  if (taxes?.length) {
    const rows = taxes.map((t) => ({ bill_id: bill.id, label: t.label, pct: Number(t.pct), amount: Math.round(amount * Number(t.pct) / 100) }));
    const r = await silpi.from('bill_taxes').insert(rows);
    if (r.error) throw r.error;
  }
  if (deductions?.length) {
    const rows = deductions.map((d) => ({ bill_id: bill.id, label: d.label, pct: Number(d.pct), amount: Math.round(amount * Number(d.pct) / 100) }));
    const r = await silpi.from('bill_deductions').insert(rows);
    if (r.error) throw r.error;
  }
  return bill;
}

export async function recordPayment({ billId, amount, receivedVia = 'Cash', date, recordedBy }) {
  const res = await silpi.from('payments').insert({ bill_id: billId, amount, received_via: receivedVia, date: date || new Date().toISOString().slice(0, 10), recorded_by: recordedBy || null }).select().single();
  return handleError(res, 'recordPayment');
}

export async function markBillStatus(billId, status) {
  const res = await silpi.from('bills').update({ status, updated_at: new Date().toISOString() }).eq('id', billId).select().single();
  return handleError(res, 'markBillStatus');
}

export async function deleteBill(billId) {
  const res = await silpi.from('bills').delete().eq('id', billId);
  if (res.error) throw res.error;
  return true;
}

// ──────────────────────── realtime helpers ───────────────────────
export function subscribeToProjects(callback) {
  return silpi.channel('projects-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, callback).subscribe();
}
export function subscribeToBills(callback) {
  return silpi.channel('bills-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, callback).subscribe();
}

// ──────────────────────── search helpers ───────────────────────
export async function searchProjects(q) { return getProjects({ search: q }); }
export async function searchBills({ q, projectId } = {}) {
  let query = silpi.from('bills').select('*, bill_taxes(*), bill_deductions(*), payments(*)').order('date', { ascending: false });
  if (q) query = query.or(`bill_no.ilike.%${q}%,stage_label.ilike.%${q}%`);
  if (projectId) query = query.eq('project_id', projectId);
  const res = await query;
  return handleError(res, 'searchBills');
}

// ──────────────────────── dashboard aggregates (view-first) ───────────────────────
export async function getDashboardStats(projectIds = null) {
  try {
    const [projects, totals] = await Promise.all([getProjects(), getProjectTotals().catch(() => null)]);
    const scope = projectIds ? projects.filter((p) => projectIds.includes(p.id)) : projects;
    const totalMap = totals ? Object.fromEntries(totals.map((t) => [t.project_id, t])) : {};
    let totalBilled = 0, totalReceived = 0;
    for (const p of scope) {
      if (totalMap[p.id]) {
        totalBilled += Number(totalMap[p.id].total_billed || 0);
        totalReceived += Number(totalMap[p.id].total_received || 0);
      }
    }
    if (!totals) {
      const bills = await getBills();
      const inScope = projectIds ? bills.filter((b) => projectIds.includes(b.project_id)) : bills;
      totalBilled = inScope.reduce((s, b) => s + Number(b.total || 0), 0);
      totalReceived = inScope.reduce((s, b) => s + (b.payments || []).reduce((a, p) => a + Number(p.amount || 0), 0), 0);
    }
    const avgSite = scope.length ? Math.round(scope.reduce((s, p) => s + Number(p.site_percent || 0), 0) / scope.length) : 0;
    const contractValue = scope.reduce((s, p) => s + Number(p.revised_contract_value || p.contract_value || 0), 0);
    return { projectCount: scope.length, contractValue, totalBilled, totalReceived, outstanding: totalBilled - totalReceived, avgSite };
  } catch (e) { throw e; }
}
