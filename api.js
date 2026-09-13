import { supabase } from './supabaseClient';

// ---------- Reads ----------

export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      incharge:project_incharge_id ( id, name ),
      site_incharge:site_incharge_id ( id, name ),
      drawing_incharge:drawing_incharge_id ( id, name ),
      billing_stages ( * )
    `)
    .order('number');
  if (error) throw error;
  return data;
}

export async function getProjectTotals() {
  const { data, error } = await supabase.from('project_billing_totals').select('*');
  if (error) throw error;
  return data; // [{ project_id, total_billed, total_received }]
}

export async function getBills(projectId) {
  let query = supabase
    .from('bills')
    .select(`
      *,
      project:project_id ( name ),
      bill_taxes ( * ),
      bill_deductions ( * ),
      payments ( * )
    `)
    .order('date', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ---------- Writes ----------

export async function updateProjectFields(projectId, fields) {
  // fields: { site_incharge_id, drawing_incharge_id, drawing_status, site_percent, ... }
  const { data, error } = await supabase.from('projects').update(fields).eq('id', projectId).select().single();
  if (error) throw error;
  return data;
}

export async function updateBillingStage(stageId, fields) {
  const { data, error } = await supabase.from('billing_stages').update(fields).eq('id', stageId).select().single();
  if (error) throw error;
  return data;
}

// Create a bill (invoice) with its tax and deduction line items in one call.
export async function createBill({ projectId, billingStageId, billNo, stageLabel, amount, taxes, deductions, date, comments, createdBy }) {
  const taxTotal = (taxes || []).reduce((s, t) => s + Math.round(amount * t.pct / 100), 0);
  const deductionTotal = (deductions || []).reduce((s, d) => s + Math.round(amount * d.pct / 100), 0);
  const total = amount + taxTotal - deductionTotal;

  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      bill_no: billNo,
      project_id: projectId,
      billing_stage_id: billingStageId || null,
      stage_label: stageLabel,
      amount,
      total,
      status: 'Billed',
      date,
      comments,
      created_by: createdBy || null,
    })
    .select()
    .single();
  if (billError) throw billError;

  if (taxes?.length) {
    const rows = taxes.map((t) => ({ bill_id: bill.id, label: t.label, pct: t.pct, amount: Math.round(amount * t.pct / 100) }));
    const { error } = await supabase.from('bill_taxes').insert(rows);
    if (error) throw error;
  }
  if (deductions?.length) {
    const rows = deductions.map((d) => ({ bill_id: bill.id, label: d.label, pct: d.pct, amount: Math.round(amount * d.pct / 100) }));
    const { error } = await supabase.from('bill_deductions').insert(rows);
    if (error) throw error;
  }
  return bill;
}

// Record a (possibly partial) payment against a bill.
export async function recordPayment({ billId, amount, receivedVia, date, recordedBy }) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ bill_id: billId, amount, received_via: receivedVia, date, recorded_by: recordedBy || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markBillStatus(billId, status) {
  const { data, error } = await supabase.from('bills').update({ status }).eq('id', billId).select().single();
  if (error) throw error;
  return data;
}
