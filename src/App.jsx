import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from '../supabaseClient.js';
import { ensureAppUser, getUsers, getProjects, getBills, getProjectTotals, getBillPaymentTotals, updateProjectFields, createBill, recordPayment, classifySupabaseError } from '../api.js';
import SignIn from './SignIn.jsx';

// ---------- Static data & constants ----------
const ROLES = ['Admin', 'Accounts', 'Team Lead', 'Member'];
const NAV = [
  { key: 'dashboard', label: 'Dashboard', roles: ROLES },
  { key: 'project', label: 'Projects', roles: ROLES },
  { key: 'billing', label: 'Bill & Payment Tracker', roles: ['Admin', 'Accounts'] },
  { key: 'users', label: 'User Management', roles: ['Admin'] },
];
const STATUS_COLORS = {
  Paid: '#5a7350', Billed: '#a1633c', Pending: '#a8822f', Overdue: '#9c4433',
  Approved: '#5a7350', 'In Review': '#a8822f', 'Partially Billed': '#b47a52', 'Partially Paid': '#8a5230',
};
const BANK_OPTIONS = ['Axis Bank', 'ICICI Bank', 'HDFC Bank', 'State Bank of India', 'Kotak Mahindra Bank', 'Federal Bank', 'Cash', 'Other'];
const DRAWING_STATUS_OPTIONS = ['Approved', 'In Review', 'Pending'];

function tagStyle(status) {
  const c = STATUS_COLORS[status] || '#7a5f4a';
  return { display: 'inline-block', padding: '4px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: c, background: c + '1F', border: '1px solid ' + c + '55' };
}

const PROJECTS = [
  { id: 'p1', number: 'PRJ-014', name: 'Fontana Hotel', category: 'Hospitality', totalArea: '42,000 sq.ft', contractValue: 48000000, revisedContractValue: 51000000, incharge: 'Arun Mathew', siteIncharge: 'Priya Nair', drawingIncharge: 'Divya Menon', drawingStatus: 'Approved', sitePercent: 62,
    billing: [
      { stage: 'Mobilization', pct: 10, amount: 4800000, status: 'Paid' },
      { stage: 'Foundation Completion', pct: 15, amount: 7200000, status: 'Paid' },
      { stage: 'Superstructure', pct: 25, amount: 12000000, status: 'Billed' },
      { stage: 'Finishing Works', pct: 30, amount: 14400000, status: 'Pending' },
      { stage: 'Handover', pct: 20, amount: 9600000, status: 'Pending' },
    ] },
  { id: 'p2', number: 'PRJ-011', name: 'Residence for Mr. Sathyan Anthikkad', category: 'Residences', totalArea: '6,800 sq.ft', contractValue: 18500000, revisedContractValue: 18500000, incharge: 'Divya Menon', siteIncharge: 'Rahul Varma', drawingIncharge: 'Arun Mathew', drawingStatus: 'In Review', sitePercent: 38,
    billing: [
      { stage: 'Mobilization', pct: 10, amount: 1850000, status: 'Paid' },
      { stage: 'Foundation', pct: 20, amount: 3700000, status: 'Paid' },
      { stage: 'Superstructure', pct: 30, amount: 5550000, status: 'Billed' },
      { stage: 'Finishing & Handover', pct: 40, amount: 7400000, status: 'Pending' },
    ] },
  { id: 'p3', number: 'PRJ-009', name: 'The House Of Three Courtyards', category: 'Villas', totalArea: '8,200 sq.ft', contractValue: 21000000, revisedContractValue: 21000000, incharge: 'Arun Mathew', siteIncharge: 'Meera Pillai', drawingIncharge: 'Divya Menon', drawingStatus: 'Approved', sitePercent: 100,
    billing: [
      { stage: 'Mobilization', pct: 15, amount: 3150000, status: 'Paid' },
      { stage: 'Construction', pct: 55, amount: 11550000, status: 'Paid' },
      { stage: 'Handover', pct: 30, amount: 6300000, status: 'Paid' },
    ] },
  { id: 'p4', number: 'PRJ-016', name: 'Villa Glory', category: 'Villas', totalArea: '5,400 sq.ft', contractValue: 14200000, revisedContractValue: 14200000, incharge: 'Divya Menon', siteIncharge: 'Sooraj Kumar', drawingIncharge: 'Arun Mathew', drawingStatus: 'Pending', sitePercent: 12,
    billing: [
      { stage: 'Mobilization', pct: 10, amount: 1420000, status: 'Billed' },
      { stage: 'Foundation', pct: 20, amount: 2840000, status: 'Pending' },
      { stage: 'Remaining Stages', pct: 70, amount: 9940000, status: 'Pending' },
    ] },
  { id: 'p5', number: 'PRJ-007', name: 'Kumbalangi Stories', category: 'Apartments', totalArea: '96,000 sq.ft', contractValue: 124000000, revisedContractValue: 131000000, incharge: 'Arun Mathew', siteIncharge: 'Priya Nair', drawingIncharge: 'Divya Menon', drawingStatus: 'Approved', sitePercent: 78,
    billing: [
      { stage: 'Mobilization', pct: 8, amount: 9920000, status: 'Paid' },
      { stage: 'Foundation', pct: 17, amount: 21080000, status: 'Paid' },
      { stage: 'Superstructure', pct: 35, amount: 43400000, status: 'Paid' },
      { stage: 'Finishing', pct: 25, amount: 31000000, status: 'Billed' },
      { stage: 'Handover', pct: 15, amount: 18600000, status: 'Pending' },
    ] },
];

const SEED_BILLS = [
  { billNo: 'BL-2026-041', project: 'Fontana Hotel', stage: 'Superstructure', amount: 12000000, tax: 2160000, total: 14160000, mode: 'Bank', status: 'Billed', date: '12 Aug 2026' },
  { billNo: 'BL-2026-038', project: 'Fontana Hotel', stage: 'Foundation Completion', amount: 7200000, tax: 1296000, total: 8496000, mode: 'Bank', status: 'Paid', date: '02 Jul 2026' },
  { billNo: 'BL-2026-035', project: 'Residence for Mr. Sathyan Anthikkad', stage: 'Superstructure', amount: 5550000, tax: 999000, total: 6549000, mode: 'Bank', status: 'Billed', date: '28 Jun 2026' },
  { billNo: 'BL-2026-030', project: 'The House Of Three Courtyards', stage: 'Handover', amount: 6300000, tax: 1134000, total: 7434000, mode: 'Cash', status: 'Paid', date: '14 May 2026' },
  { billNo: 'BL-2026-044', project: 'Villa Glory', stage: 'Mobilization', amount: 1420000, tax: 255600, total: 1675600, mode: 'Bank', status: 'Overdue', date: '18 Aug 2026' },
  { billNo: 'BL-2026-042', project: 'Kumbalangi Stories', stage: 'Finishing', amount: 31000000, tax: 5580000, total: 36580000, mode: 'Bank', status: 'Billed', date: '10 Aug 2026' },
  { billNo: 'BL-2026-033', project: 'Kumbalangi Stories', stage: 'Superstructure', amount: 43400000, tax: 7812000, total: 51212000, mode: 'Bank', status: 'Paid', date: '20 May 2026' },
  { billNo: 'BL-2026-020', project: 'Residence for Mr. Sathyan Anthikkad', stage: 'Mobilization', amount: 1850000, tax: 333000, total: 2183000, mode: 'Bank', status: 'Paid', date: '05 Feb 2026' },
];

const USERS = [
  { code: 'EMP-001', name: 'Arun Mathew', role: 'Admin' },
  { code: 'EMP-005', name: 'Meera Pillai', role: 'Accounts' },
  { code: 'EMP-014', name: 'Priya Nair', role: 'Team Lead' },
  { code: 'EMP-022', name: 'Divya Menon', role: 'Accounts' },
  { code: 'EMP-030', name: 'Rahul Varma', role: 'Member' },
  { code: 'EMP-011', name: 'Sooraj Kumar', role: 'Member' },
];

function fmtMoney(n, compact = true) {
  if (!compact) return '₹' + Math.round(n).toLocaleString('en-IN');
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

const filterInputStyle = { font: '12px Archivo, sans-serif', color: '#2c221b', background: '#fff', border: '1px solid rgba(44,34,27,0.18)', padding: '6px 8px', borderRadius: 2, width: '100%' };
const editSelectStyle = { font: '13px Archivo, sans-serif', color: '#2c221b', background: '#fff', border: '1px solid rgba(44,34,27,0.25)', padding: '5px 6px', borderRadius: 2, cursor: 'pointer' };

// ---------- App ----------
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
      window.removeEventListener('resize', onResize);
    };
  }, [breakpoint]);
  return isMobile;
}

export default function App({ defaultRole = 'Admin', currencyFormat = 'Compact', highlightOverdue = true }) {
  const compact = currencyFormat === 'Compact';
  const money = (n) => fmtMoney(n, compact);
  const isMobile = useIsMobile(768);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // role is derived from appUser — no local impersonation state
  const [screen, setScreen] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState('p1');
  const [overrides, setOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulk, setBulk] = useState({ siteIncharge: '', drawingIncharge: '', drawingStatus: '' });
  const [filters, setFilters] = useState({ q: '', category: 'All', drawingStatus: 'All', siteIncharge: '', drawingIncharge: '', minContract: '', minBilled: '', minReceived: '', minSite: '' });
  const [stageOverrides, setStageOverrides] = useState({});
  const [customBills, setCustomBills] = useState([]);
  const [billingContext, setBillingContext] = useState(null);
  const [billForm, setBillForm] = useState({ amount: '', date: '25 Aug 2026', taxes: [{ label: 'GST', pct: '18' }], deductions: [{ label: 'TDS', pct: '10' }], comments: '' });
  const [pbFilters, setPbFilters] = useState({ status: 'All', stage: 'All', q: '' });
  const [billingFilters, setBillingFilters] = useState({ project: '', status: 'All', mode: 'All', q: '' });
  const [paymentOverrides, setPaymentOverrides] = useState({});
  const [paymentContext, setPaymentContext] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'Cash', date: '25 Aug 2026' });
  const [newBillReturn, setNewBillReturn] = useState('billing');
  const [newBillForm, setNewBillForm] = useState({ projectName: 'Fontana Hotel', stage: 'Mobilization', customStage: '', amount: '', mode: 'Cash', date: '25 Aug 2026', status: 'Billed', taxes: [{ label: 'GST', pct: '18' }], deductions: [{ label: 'TDS', pct: '10' }], comments: '' });

  function capRole(r) { return r ? r.charAt(0).toUpperCase() + r.slice(1) : r; }
  function validRole(r) { const c = capRole(r); return ROLES.includes(c) ? c : 'Member'; }

  // ---------- Auth (reuse existing Supabase Google OAuth → public.users) ----------
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({ name: '', phone: '' });
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);
  const [onboardingClassified, setOnboardingClassified] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user) { setAppUser(null); setIsUnauthorized(false); setAuthError(null); setNeedsOnboarding(false); setOnboardingError(null); setOnboardingClassified(null); return; }
    let cancelled = false;
    async function resolveAppUser() {
      setAuthError(null); setIsUnauthorized(false); setNeedsOnboarding(false); setOnboardingError(null); setOnboardingClassified(null);
      const uid = session.user.id;
      const email = (session.user.email || '').trim();
      let res = await supabase.from('users').select('*').eq('auth_user_id', uid).maybeSingle();
      const needEmailFallback = res.error && (
        res.error.code === '42703' || res.error.code === '42P01' ||
        (res.error.message && res.error.message.toLowerCase().includes('auth_user_id'))
      );
      if (needEmailFallback) {
        const fallback = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        res = fallback;
      }
      if (cancelled) return;
      if (res.error) {
        console.error('[SilpiDB] appUser lookup failed', res.error);
        setAuthError(res.error.message);
        return;
      }
      if (!res.data) {
        // No public.users row — show onboarding form in dashboard shell (ask first, don't auto-insert)
        const meta = session.user.user_metadata || {};
        const displayName = (meta.full_name || meta.name || meta.user_name || '').trim();
        if (!cancelled) {
          setOnboardingForm({ name: displayName, phone: '' });
          setNeedsOnboarding(true);
          setIsUnauthorized(true);
        }
        return;
      }
      setAppUser(res.data);
      if (!cancelled) { setNeedsOnboarding(false); setIsUnauthorized(false); }
    }
    resolveAppUser();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => { if (!isMobile) setMobileNavOpen(false); }, [isMobile]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);
  const closeMobileNav = () => setMobileNavOpen(false);
  const handleNav = (key) => { setScreen(key); closeMobileNav(); };

  const handleOnboardingSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!session?.user) return;
    const uid = session.user.id;
    const email = (session.user.email || '').trim();
    const name = (onboardingForm.name || '').trim();
    const phone = (onboardingForm.phone || '').trim();
    if (!name) { setOnboardingError('Please enter your full name.'); return; }
    setOnboardingSaving(true);
    setOnboardingError(null);
    setOnboardingClassified(null);
    try {
      const created = await ensureAppUser({ authUserId: uid, email, name, phone: phone || undefined });
      let finalUser = created;
      const needsPatch = (created.name !== name) || (phone && created.phone !== phone);
      if (needsPatch && created.id) {
        try {
          const patch = {};
          if (created.name !== name) patch.name = name;
          if (phone && created.phone !== phone) patch.phone = phone;
          const upd = await supabase.from('users').update(patch).eq('id', created.id).select().single();
          if (!upd.error && upd.data) finalUser = upd.data;
        } catch (_) {}
      }
      setAppUser(finalUser);
      setNeedsOnboarding(false);
      setIsUnauthorized(false);
    } catch (err) {
      console.error('[SilpiDB] onboarding failed', err);
      const classified = classifySupabaseError(err);
      setOnboardingClassified(classified);
      setOnboardingError(err.message || String(err));
    } finally {
      setOnboardingSaving(false);
    }
  };

  // ---------- Live data (Supabase) — gated behind authorized session ----------
  const [liveUsers, setLiveUsers] = useState(null);
  const [liveProjects, setLiveProjects] = useState(null);
  const [liveBills, setLiveBills] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [classifiedError, setClassifiedError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { setDataLoading(false); setLiveUsers(null); setLiveProjects(null); setLiveBills(null); return; }
    if (!appUser) { setDataLoading(false); return; }
    let cancelled = false;
    async function load() {
      setDataLoading(true);
      setDataError(null);
      setClassifiedError(null);
      try {
        const [u, p, b] = await Promise.all([getUsers(), getProjects(), getBills()]);
        if (cancelled) return;
        setLiveUsers(u);
        setLiveProjects(p);
        setLiveBills(b);
        if (p && p[0]) {
          setSelectedProjectId((cur) => (cur === 'p1' ? p[0].id : cur));
        }
      } catch (e) {
        if (cancelled) return;
        const classified = classifySupabaseError(e);
        console.error('[SilpiDB] load error', e, classified);
        setDataError(e.message || String(e));
        setClassifiedError(classified);
        setLiveUsers([]);
        setLiveProjects([]);
        setLiveBills([]);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authLoading, session, appUser]);

  const refreshLive = async () => {
    if (!appUser) return;
    setDataError(null);
    setClassifiedError(null);
    try {
      const [u, p, b] = await Promise.all([getUsers(), getProjects(), getBills()]);
      setLiveUsers(u);
      setLiveProjects(p);
      setLiveBills(b);
    } catch (e) {
      const classified = classifySupabaseError(e);
      console.error('[SilpiDB] refresh error', e, classified);
      setDataError(e.message || String(e));
      setClassifiedError(classified);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    setIsUnauthorized(false);
    setNeedsOnboarding(false);
    setOnboardingError(null);
    setOnboardingClassified(null);
    setLiveUsers(null); setLiveProjects(null); setLiveBills(null);
  };

  // ---------- Actions ----------
  const openProject = (id) => { setSelectedProjectId(id); setScreen('project'); };
  const setOverride = async (id, field, value) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: value } }));
    if (!liveProjects) return;
    const map = { siteIncharge: 'site_incharge_id', drawingIncharge: 'drawing_incharge_id', drawingStatus: 'drawing_status', sitePercent: 'site_percent' };
    const dbField = map[field];
    if (!dbField) return;
    let dbValue = value;
    if (field === 'siteIncharge' || field === 'drawingIncharge') dbValue = userIdByName[value] || null;
    try { await updateProjectFields(id, { [dbField]: dbValue }); } catch (e) { console.error('[Supabase] setOverride', e); }
  };
  const toggleSelect = (id) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleSelectAll = (ids) => setSelectedIds((sel) => (ids.every((id) => sel.includes(id)) ? sel.filter((x) => !ids.includes(x)) : Array.from(new Set([...sel, ...ids]))));

  const openBillingPage = (projectId, stageName, remaining) => {
    setBillingContext({ projectId, stageName });
    setBillForm({ amount: String(remaining), date: new Date().toISOString().slice(0, 10), taxes: [{ label: 'GST', pct: '18' }], deductions: [{ label: 'TDS', pct: '10' }], comments: '' });
    setScreen('billStage');
  };
  const cancelBilling = () => { setScreen('project'); setBillingContext(null); };

  const addListRow = (setForm) => (listName) => setForm((f) => ({ ...f, [listName]: [...f[listName], { label: '', pct: '' }] }));
  const removeListRow = (setForm) => (listName, idx) => setForm((f) => ({ ...f, [listName]: f[listName].filter((_, i) => i !== idx) }));
  const setListRow = (setForm) => (listName, idx, field, value) => setForm((f) => ({ ...f, [listName]: f[listName].map((t, i) => (i === idx ? { ...t, [field]: value } : t)) }));

  const submitBill = async () => {
    if (!billingContext) return;
    const src = sourceProjects;
    const project = src.find((p) => p.id === billingContext.projectId);
    if (!project) return;
    const stage = project.billing.find((s) => s.stage === billingContext.stageName);
    if (!stage) return;
    const amt = Number(billForm.amount);
    if (!amt || amt <= 0) return;
    const taxes = billForm.taxes.filter((t) => t.label && Number(t.pct) > 0).map((t) => ({ label: t.label, pct: Number(t.pct) }));
    const deductions = billForm.deductions.filter((d) => d.label && Number(d.pct) > 0).map((d) => ({ label: d.label, pct: Number(d.pct) }));
    if (liveProjects) {
      try {
        const billNo = 'BL-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-4);
        await createBill({ projectId: project.id, billingStageId: stage.id || null, billNo, stageLabel: stage.stage, amount: amt, taxes, deductions, date: billForm.date, comments: billForm.comments });
        await refreshLive();
        setScreen('project'); setBillingContext(null);
        return;
      } catch (e) { console.error('[Supabase] submitBill', e); setDataError(e.message); }
    }
    const taxTotal = taxes.reduce((s, t) => s + Math.round(amt * t.pct / 100), 0);
    const deductionTotal = deductions.reduce((s, d) => s + Math.round(amt * d.pct / 100), 0);
    const total = amt + taxTotal - deductionTotal;
    const key = billingContext.projectId + '::' + billingContext.stageName;
    const prevBilled = (stageOverrides[key] && stageOverrides[key].billedAmount) || (stage.status !== 'Pending' ? stage.amount : 0);
    const newBilled = Math.min(stage.amount, prevBilled + amt);
    const newBill = { billNo: 'BL-2026-' + (100 + customBills.length), project: project.name, stage: stage.stage, amount: amt, taxes, deductions, total, mode: '—', status: 'Billed', date: billForm.date, comments: billForm.comments };
    setCustomBills((b) => [...b, newBill]);
    setStageOverrides((o) => ({ ...o, [key]: { billedAmount: newBilled, status: newBilled >= stage.amount ? 'Billed' : 'Partially Billed' } }));
    setScreen('project'); setBillingContext(null);
  };

  const openPaymentPage = (billNo, remaining, returnScreen) => {
    // billNo here is bill_no for live rows — works for both shapes
    setPaymentContext({ billNo, returnScreen: returnScreen || 'billing' });
    setPaymentForm({ amount: String(remaining), mode: 'Cash', date: new Date().toISOString().slice(0, 10) });
    setScreen('recordPayment');
  };
  const cancelPayment = () => { setScreen(paymentContext?.returnScreen || 'billing'); setPaymentContext(null); };
  const submitPayment = async () => {
    if (!paymentContext) return;
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) return;
    if (liveBills) {
      const liveRow = sourceSeedBills.find((b) => b.billNo === paymentContext.billNo);
      const billId = liveRow?.id || null;
      if (billId) {
        try {
          await recordPayment({ billId, amount: amt, receivedVia: paymentForm.mode, date: paymentForm.date });
          await refreshLive();
          setScreen(paymentContext.returnScreen || 'billing'); setPaymentContext(null);
          return;
        } catch (e) { console.error('[Supabase] submitPayment', e); setDataError(e.message); }
      }
    }
    setPaymentOverrides((po) => {
      const prev = po[paymentContext.billNo] || { paidSoFar: 0 };
      return { ...po, [paymentContext.billNo]: { paidSoFar: prev.paidSoFar + amt, mode: paymentForm.mode, date: paymentForm.date } };
    });
    setScreen(paymentContext.returnScreen || 'billing'); setPaymentContext(null);
  };

  const openNewBill = (projectName, returnScreen) => {
    const src = sourceProjects;
    const pn = projectName || src[0].name;
    const proj = src.find((p) => p.name === pn) || src[0];
    setNewBillReturn(returnScreen || 'billing');
    const firstStage = proj.billing[0]?.stage || 'Other (custom)';
    setNewBillForm({ projectName: pn, stage: firstStage, customStage: '', amount: '', mode: 'Cash', date: new Date().toISOString().slice(0, 10), status: 'Billed', taxes: [{ label: 'GST', pct: '18' }], deductions: [{ label: 'TDS', pct: '10' }], comments: '' });
    setScreen('newBill');
  };
  const cancelNewBill = () => setScreen(newBillReturn);
  const changeNewBillProject = (projectName) => {
    const proj = sourceProjects.find((p) => p.name === projectName);
    if (!proj) return;
    setNewBillForm((f) => ({ ...f, projectName, stage: proj.billing[0]?.stage || f.stage }));
  };
  const submitNewBill = async () => {
    const f = newBillForm;
    const amt = Number(f.amount);
    const stageValue = f.stage === 'Other (custom)' ? f.customStage : f.stage;
    if (!amt || amt <= 0 || !stageValue) return;
    const taxes = f.taxes.filter((t) => t.label && Number(t.pct) > 0).map((t) => ({ label: t.label, pct: Number(t.pct) }));
    const deductions = f.deductions.filter((d) => d.label && Number(d.pct) > 0).map((d) => ({ label: d.label, pct: Number(d.pct) }));
    if (liveProjects) {
      const proj = sourceProjects.find((p) => p.name === f.projectName);
      const matchedStage = proj?.billing.find((s) => s.stage === f.stage);
      try {
        const billNo = 'BL-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-4);
        await createBill({ projectId: proj.id, billingStageId: matchedStage?.id || null, billNo, stageLabel: stageValue, amount: amt, taxes, deductions, date: f.date, comments: f.comments });
        if (f.status === 'Paid') {
          const inserted = await getBills().then((rows) => rows.find((r) => r.bill_no === billNo));
          if (inserted) await recordPayment({ billId: inserted.id, amount: inserted.total, receivedVia: f.mode, date: f.date });
        }
        await refreshLive();
        setScreen(newBillReturn);
        return;
      } catch (e) { console.error('[Supabase] submitNewBill', e); setDataError(e.message); }
    }
    const taxTotal = taxes.reduce((s, t) => s + Math.round(amt * t.pct / 100), 0);
    const deductionTotal = deductions.reduce((s, d) => s + Math.round(amt * d.pct / 100), 0);
    const total = amt + taxTotal - deductionTotal;
    setCustomBills((b) => [...b, { billNo: 'BL-2026-' + (200 + b.length), project: f.projectName, stage: stageValue, amount: amt, taxes, deductions, total, mode: f.status === 'Paid' ? f.mode : '—', status: f.status, date: f.date, comments: f.comments }]);
    setScreen(newBillReturn);
  };

  const applyBulk = async () => {
    const patch = {};
    if (bulk.siteIncharge) patch.site_incharge_id = userIdByName[bulk.siteIncharge] || null;
    if (bulk.drawingIncharge) patch.drawing_incharge_id = userIdByName[bulk.drawingIncharge] || null;
    if (bulk.drawingStatus) patch.drawing_status = bulk.drawingStatus;
    if (liveProjects && Object.keys(patch).length) {
      try { await Promise.all(selectedIds.map((id) => updateProjectFields(id, patch))); await refreshLive(); } catch (e) { console.error('[Supabase] applyBulk', e); }
    }
    setOverrides((ov) => {
      const next = { ...ov };
      selectedIds.forEach((id) => {
        const cur = { ...next[id] };
        if (bulk.siteIncharge) cur.siteIncharge = bulk.siteIncharge;
        if (bulk.drawingIncharge) cur.drawingIncharge = bulk.drawingIncharge;
        if (bulk.drawingStatus) cur.drawingStatus = bulk.drawingStatus;
        next[id] = cur;
      });
      return next;
    });
    setBulk({ siteIncharge: '', drawingIncharge: '', drawingStatus: '' });
  };

  // ---------- Derived data (live DB → UI mapping) ----------
  const role = validRole(appUser?.role);
  const canEditSite = role === 'Admin' || role === 'Team Lead';
  const canEditDrawing = role === 'Admin' || role === 'Team Lead';

  // DB rows → same shape the UI already expects. Falls back to mocks when DB empty / error.
  function toUiProject(p) {
    if (p.billing) return p;
    const pi = p.project_incharge;
    const si = p.site_incharge;
    const di = p.drawing_incharge;
    return {
      id: p.id,
      number: p.number,
      name: p.name,
      category: p.category,
      totalArea: p.total_area || '—',
      contractValue: Number(p.contract_value ?? 0),
      revisedContractValue: Number(p.revised_contract_value ?? 0),
      incharge: pi ? (pi.name || pi.username || pi.email || '—') : '—',
      siteIncharge: si ? (si.name || si.username || si.email || '—') : '—',
      drawingIncharge: di ? (di.name || di.username || di.email || '—') : '—',
      drawingStatus: p.drawing_status || 'Pending',
      sitePercent: Number(p.site_percent ?? 0),
      billing: (p.billing_stages || []).slice().sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map((s) => ({ id: s.id, stage: s.stage, pct: Number(s.pct), amount: Number(s.amount), status: 'Pending' })),
      _live: true,
    };
  }
  function toUiBill(b, projectMap) {
    if (b.billNo) return b;
    const taxes = (b.bill_taxes || []).map((t) => ({ label: t.label, pct: Number(t.pct) }));
    const deductions = (b.bill_deductions || []).map((d) => ({ label: d.label, pct: Number(d.pct) }));
    const paidSoFar = (b.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const mode = (b.payments && b.payments[0]) ? b.payments[0].received_via : '—';
    const projName = b.project?.name || projectMap?.[b.project_id] || '—';
    return {
      id: b.id,
      billNo: b.bill_no,
      project: projName,
      stage: b.stage_label,
      amount: Number(b.amount ?? 0),
      taxes, deductions,
      tax: taxes.reduce((s, t) => s + Math.round(Number(b.amount) * t.pct / 100), 0),
      total: Number(b.total ?? 0),
      mode,
      status: b.status,
      date: b.date ? new Date(b.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      rawDate: b.date,
      comments: b.comments || '',
      paidSoFarLive: paidSoFar,
      _live: true,
    };
  }

  const isLiveLoaded = liveProjects !== null && liveUsers !== null && liveBills !== null;
  const sourceProjects = liveProjects === null ? [] : liveProjects.map(toUiProject);
  const sourceUsers = liveUsers === null ? [] : liveUsers.map((u) => ({ id: u.id, code: (u.employee_code || u.id.slice(0,8).toUpperCase()), name: u.name || u.username || u.email, email: u.email, role: capRole(u.role), _live: true }));
  const userIdByName = Object.fromEntries(sourceUsers.map((u) => [u.name, u.id]));
  // project id → name for bill mapping
  const projectNameById = Object.fromEntries(sourceProjects.map((p) => [p.id, p.name]));
  const sourceSeedBills = liveBills === null ? [] : liveBills.map((b) => toUiBill(b, projectNameById));

  const userNames = sourceUsers.map((u) => u.name);
  const allBills = [...sourceSeedBills, ...customBills];

  const withOverrides = sourceProjects.map((p) => {
    const ov = overrides[p.id] || {};
    const billed = allBills.filter((b) => b.project === p.name).reduce((s, b) => s + Number(b.total || 0), 0);
    const received = allBills.filter((b) => b.project === p.name).reduce((s, b) => {
      if (b._live) return s + Number(b.paidSoFarLive || 0);
      return s + (b.status === 'Paid' ? Number(b.total || 0) : 0);
    }, 0);
    return { ...p, siteIncharge: ov.siteIncharge ?? p.siteIncharge, drawingIncharge: ov.drawingIncharge ?? p.drawingIncharge, drawingStatus: ov.drawingStatus ?? p.drawingStatus, sitePercent: ov.sitePercent ?? p.sitePercent, billed, received };
  });

  const filteredProjects = withOverrides.filter((p) => {
    const f = filters;
    if (f.q && !(p.name.toLowerCase().includes(f.q.toLowerCase()) || p.number.toLowerCase().includes(f.q.toLowerCase()))) return false;
    if (f.category !== 'All' && p.category !== f.category) return false;
    if (f.drawingStatus !== 'All' && p.drawingStatus !== f.drawingStatus) return false;
    if (f.siteIncharge && !p.siteIncharge.toLowerCase().includes(f.siteIncharge.toLowerCase())) return false;
    if (f.drawingIncharge && !p.drawingIncharge.toLowerCase().includes(f.drawingIncharge.toLowerCase())) return false;
    if (f.minContract && p.revisedContractValue < Number(f.minContract) * 100000) return false;
    if (f.minBilled && p.billed < Number(f.minBilled) * 100000) return false;
    if (f.minReceived && p.received < Number(f.minReceived) * 100000) return false;
    if (f.minSite && p.sitePercent < Number(f.minSite)) return false;
    return true;
  });

  const filteredIds = filteredProjects.map((p) => p.id);
  const allVisibleChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const scope = selectedIds.length > 0 ? withOverrides.filter((p) => selectedIds.includes(p.id)) : withOverrides;
  const scopeNames = scope.map((p) => p.name);
  const scopeContract = scope.reduce((s, p) => s + p.revisedContractValue, 0);
  const scopeOutstanding = allBills.filter((b) => scopeNames.includes(b.project) && b.status !== 'Paid').reduce((s, b) => s + b.total, 0);
  const scopeAvgSite = scope.length ? Math.round(scope.reduce((s, p) => s + p.sitePercent, 0) / scope.length) : 0;
  const categoryOptions = ['All', ...new Set(sourceProjects.map((p) => p.category))];
  const bulkOptions = ['— no change —', ...userNames];
  const bulkStatusOptions = ['— no change —', ...DRAWING_STATUS_OPTIONS];

  const sel = withOverrides.find((p) => p.id === selectedProjectId) || withOverrides[0] || null;
  const selectedRows = sel ? sel.billing.map((b) => {
    const key = sel.id + '::' + b.stage;
    const ov = stageOverrides[key];
    const billedAmount = ov ? ov.billedAmount : (b.status !== 'Pending' ? b.amount : 0);
    const status = ov ? ov.status : b.status;
    const remaining = b.amount - billedAmount;
    return { ...b, status, billedAmount, remaining };
  }) : [];

  const resolvePayment = (b) => {
    const ov = paymentOverrides[b.billNo];
    const livePaid = b.paidSoFarLive ?? null;
    const basePaid = livePaid !== null ? livePaid : (b.status === 'Paid' ? b.total : 0);
    const paidSoFar = ov ? ov.paidSoFar : basePaid;
    const remaining = Math.max(0, b.total - paidSoFar);
    const status = remaining <= 0 ? 'Paid' : (paidSoFar > 0 ? 'Partially Paid' : b.status);
    return { ...b, status, paidSoFar, remaining };
  };
  const taxTotalOf = (b) => (b.taxes ? b.taxes.reduce((s, t) => s + Math.round(b.amount * t.pct / 100), 0) : b.tax);

  const pbAll = sel ? allBills.map(resolvePayment).filter((b) => b.project === sel.name) : [];
  const pbStageOptions = ['All', ...new Set(pbAll.map((b) => b.stage))];
  const pbStatusOptions = ['All', 'Paid', 'Partially Paid', 'Billed', 'Partially Billed', 'Pending', 'Overdue'];
  const pbRows = pbAll.filter((b) => {
    if (pbFilters.status !== 'All' && b.status !== pbFilters.status) return false;
    if (pbFilters.stage !== 'All' && b.stage !== pbFilters.stage) return false;
    if (pbFilters.q && !b.billNo.toLowerCase().includes(pbFilters.q.toLowerCase())) return false;
    return true;
  });

  const allBillsResolved = allBills.map(resolvePayment);
  const billingProjectOptions = sourceProjects.map((p) => p.name);
  const billingStatusOptions = ['All', 'Paid', 'Partially Paid', 'Billed', 'Partially Billed', 'Pending', 'Overdue'];
  const billingModeOptions = ['All', 'Bank', 'Cash', ...BANK_OPTIONS];
  const billRows = allBillsResolved.filter((b) => {
    const bf = billingFilters;
    if (bf.project && !b.project.toLowerCase().includes(bf.project.toLowerCase())) return false;
    if (bf.status !== 'All' && b.status !== bf.status) return false;
    if (bf.mode !== 'All' && b.mode !== bf.mode) return false;
    if (bf.q && !(b.billNo.toLowerCase().includes(bf.q.toLowerCase()) || b.stage.toLowerCase().includes(bf.q.toLowerCase()))) return false;
    return true;
  });

  // — derived only from appUser?.role (never bare appUser.) — role has safe fallback
  const navItems = NAV.filter((n) => n.roles.includes(role));
  // allowedKeys / effectiveScreen must be defined BEFORE any use of effectiveScreen
  const allowedKeys = NAV.filter((n) => n.roles.includes(role)).map((n) => n.key);
  const effectiveScreen = allowedKeys.includes(screen) ? screen : allowedKeys[0] || 'dashboard';
  // Single canonical displayName/currentUser — uses ?. only, placed after role and before guards
  const displayName = (appUser?.username || appUser?.name || appUser?.email || role || 'User');
  const currentUser = { name: displayName, initial: (displayName.charAt(0) || 'U').toUpperCase() };
  const isDashboard = effectiveScreen === 'dashboard', isProject = effectiveScreen === 'project', isBilling = effectiveScreen === 'billing', isUsers = effectiveScreen === 'users';
  const isBillStage = effectiveScreen === 'billStage', isNewBill = effectiveScreen === 'newBill', isRecordPayment = effectiveScreen === 'recordPayment';
  const nbProject = sourceProjects.find((p) => p.name === newBillForm.projectName) || sourceProjects[0] || null;

  const screenTitle = isDashboard ? 'Dashboard' : isProject ? (sel?.name ?? 'Project') : isBilling ? 'Bill & Payment Tracker'
    : isBillStage ? 'Initiate Billing' : isNewBill ? 'New Bill' : isRecordPayment ? 'Record Payment' : 'User Management';
  const screenEyebrow = isDashboard ? 'Overview' : isProject ? (sel?.number ?? '—') : isBilling ? 'Accounts'
    : isBillStage ? (sel?.number ?? '—') : isNewBill ? 'Accounts' : isRecordPayment ? 'Accounts' : 'Team';

  // ---------- Small reusable bits ----------
  const navBtnStyle = (active) => ({ display: 'block', width: '100%', textAlign: 'left', background: active ? 'rgba(251,248,242,0.10)' : 'transparent', color: active ? '#fbf8f2' : '#b39c86', border: 'none', padding: '10px 12px', font: (active ? '600' : '400') + ' 13px Archivo, sans-serif', cursor: 'pointer' });
  const StatCard = ({ value, label }) => (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', padding: 24 }}>
      <div style={{ font: '500 38px var(--font-serif-display)', color: 'var(--text-heading)' }}>{value}</div>
      <div style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 8 }}>{label}</div>
    </div>
  );

  const InfoCard = ({ label, children }) => (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', padding: 20 }}>
      <div style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );

  const TaxDeductionList = ({ title, rows, listName, setForm, addLabel }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
      <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Label" value={row.label} onChange={(e) => setListRow(setForm)(listName, i, 'label', e.target.value)} style={{ ...filterInputStyle, flex: 2 }} />
          <input type="number" placeholder="%" value={row.pct} onChange={(e) => setListRow(setForm)(listName, i, 'pct', e.target.value)} style={{ ...filterInputStyle, flex: 1 }} />
          <button onClick={() => removeListRow(setForm)(listName, i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '0 6px' }}>&times;</button>
        </div>
      ))}
      <button onClick={() => addListRow(setForm)(listName)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 12px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', padding: '4px 0' }}>{addLabel}</button>
    </div>
  );

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)', font: '13px var(--font-sans)', color: 'var(--text-muted)' }}>
        Loading session…
      </div>
    );
  }
  if (!session) {
    return <SignIn />;
  }
  // helper for the shell onboarding (reused in both branches)
  const renderOnboardingShell = () => {
    const accent = 'var(--clay-600)';
    return (
      <div className="silpi-shell">
        <aside className={`silpi-sidebar${mobileNavOpen ? ' silpi-sidebar--open' : ''}`} aria-hidden={isMobile && !mobileNavOpen ? true : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: '500 22px var(--font-serif-display)', color: 'var(--cream-50)' }}>silpi</span>
            <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Architects</span>
            <span style={{ font: '13px var(--font-sans)', color: 'var(--brown-300)', marginTop: 8 }}>Project Billing &amp; Tracking</span>
          </div>
          <div style={{ font: '11px var(--font-sans)', color: 'var(--brown-300)', opacity: 0.85, lineHeight: 1.5 }}>
            Signed in as<br /><strong style={{ color: 'var(--cream-50)', wordBreak: 'break-all' }}>{session.user.email}</strong>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(251,248,242,0.25)', color: 'var(--cream-50)', padding: '8px 12px', font: '600 11px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
        </aside>
        {mobileNavOpen && <button type="button" aria-label="Close navigation" onClick={closeMobileNav} className="silpi-overlay" />}
        <main className="silpi-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="silpi-mobile-topbar">
            <div><div className="silpi-mobile-topbar__brand">silpi</div><div className="silpi-mobile-topbar__sub">Architects</div></div>
            <button type="button" aria-label={mobileNavOpen ? "Close menu" : "Open menu"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(o => !o)} className="silpi-hamburger">{mobileNavOpen ? '✕' : '☰'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }}>
          <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', padding: 32 }}>
            <div style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>Welcome to silpi</div>
            <h1 style={{ font: '500 22px var(--font-serif-display)', color: 'var(--text-heading)', margin: '8px 0 6px' }}>Complete your profile</h1>
            <p style={{ font: '13px var(--font-sans)', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
              Your Google account <strong style={{ color: 'var(--text-heading)' }}>{session.user.email}</strong> is signed in but not yet linked to a silpiDB user record. Fill in your details to create your account and continue to the dashboard.
            </p>
            <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Full name *</span>
                <input value={onboardingForm.name} onChange={(e) => setOnboardingForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" required style={{ font: '13px Archivo, sans-serif', color: '#2c221b', background: '#fff', border: '1px solid rgba(44,34,27,0.2)', padding: '10px 12px', borderRadius: 2 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</span>
                <input value={session.user.email || ''} readOnly disabled style={{ font: '13px Archivo, sans-serif', color: '#6b5a4d', background: '#faf6f0', border: '1px solid rgba(44,34,27,0.15)', padding: '10px 12px', borderRadius: 2 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phone (optional)</span>
                <input value={onboardingForm.phone} onChange={(e) => setOnboardingForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. +91 98xxxxxxxx" style={{ font: '13px Archivo, sans-serif', color: '#2c221b', background: '#fff', border: '1px solid rgba(44,34,27,0.2)', padding: '10px 12px', borderRadius: 2 }} />
              </label>
              <div style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)', background: '#fdf8ef', border: '1px solid rgba(44,34,27,0.08)', padding: '10px 12px', borderRadius: 2 }}>
                You will be created as <strong style={{ color: 'var(--text-heading)' }}>Member</strong>. An Admin can change your role later in User Management.
              </div>
              {onboardingError && (
                <div style={{ background: '#fdf1ec', border: '1px solid #e8b4a0', padding: '10px 12px', font: '13px var(--font-sans)', color: '#7a2e1a', wordBreak: 'break-word' }}>
                  <div style={{ fontWeight: 700 }}>Could not create account</div>
                  <div style={{ marginTop: 4 }}>{onboardingError}</div>
                  {onboardingClassified && onboardingClassified.hint && <div style={{ marginTop: 6, fontStyle: 'italic', color: '#5a3a2a' }}>{onboardingClassified.hint}</div>}
                  {onboardingClassified && onboardingClassified.code && <div style={{ font: '12px var(--font-mono, monospace)', marginTop: 4 }}>code: {onboardingClassified.code}</div>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={onboardingSaving} style={{ flex: 1, background: onboardingSaving ? '#8a7a6e' : accent, color: 'var(--cream-50)', border: 'none', padding: '11px 18px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: onboardingSaving ? 'wait' : 'pointer', opacity: onboardingSaving ? 0.9 : 1 }}>
                  {onboardingSaving ? 'Creating…' : 'Create account & continue'}
                </button>
                <button type="button" onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid var(--border-hairline)', padding: '11px 14px', font: '600 12px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-body)', cursor: 'pointer' }}>Sign out</button>
              </div>
            </form>
          </div>
          </div>
        </main>
      </div>
    );
  };
  if (needsOnboarding || isUnauthorized) {
    return renderOnboardingShell();
  }
  if (authError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 480, background: 'var(--surface-card)', border: '1px solid #e8b4a0', padding: 24 }}>
          <div style={{ fontWeight: 700, color: '#7a2e1a', font: '600 13px var(--font-sans)', marginBottom: 8 }}>Could not verify account</div>
          <div style={{ font: '13px var(--font-sans)', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{authError}</div>
          <button onClick={handleSignOut} style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--border-hairline)', padding: '8px 14px', font: '600 12px var(--font-sans)', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
    );
  }
  // — must sit AFTER effectiveScreen/displayName but BEFORE main render —
  if (!appUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)', font: '13px var(--font-sans)', color: 'var(--text-muted)' }}>
        Verifying account…
      </div>
    );
  }

  return (
    <div className="silpi-shell">
      {/* Sidebar */}
      <aside className={`silpi-sidebar${mobileNavOpen ? ' silpi-sidebar--open' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: '500 22px var(--font-serif-display)', color: 'var(--cream-50)' }}>silpi</span>
          <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Architects</span>
          <span style={{ font: '13px var(--font-sans)', color: 'var(--brown-300)', marginTop: 8 }}>Project Billing & Tracking</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Your role</span>
          <span style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '6px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fbf8f2', background: 'rgba(251,248,242,0.14)', border: '1px solid rgba(251,248,242,0.28)' }}>{role}</span>
          <span style={{ font: '11px var(--font-sans)', color: 'var(--brown-300)', opacity: 0.85, wordBreak: 'break-all' }}>{appUser.email}</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((n) => (
            <button key={n.key} onClick={() => handleNav(n.key)} style={navBtnStyle(n.key === effectiveScreen)}>{n.label}</button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid rgba(251,248,242,0.15)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, flex: 'none', background: 'var(--clay-600)', color: 'var(--cream-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px var(--font-sans)' }}>{currentUser.initial}</div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ font: '600 13px var(--font-sans)', color: 'var(--cream-50)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</span>
              <span style={{ font: '11px var(--font-sans)', color: 'var(--brown-300)' }}>{role}</span>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid rgba(251,248,242,0.25)', color: 'var(--cream-50)', padding: '8px 12px', font: '600 11px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
        </div>
      </aside>

      {mobileNavOpen && <button type="button" aria-label="Close navigation" onClick={closeMobileNav} className="silpi-overlay" />}
      {/* Main */}
      <main className="silpi-main">
        <div className="silpi-mobile-topbar">
          <div>
            <div className="silpi-mobile-topbar__brand">silpi</div>
            <div className="silpi-mobile-topbar__sub">Architects</div>
          </div>
          <button type="button" aria-label={mobileNavOpen ? "Close menu" : "Open menu"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(o => !o)} className="silpi-hamburger">{mobileNavOpen ? '✕' : '☰'}</button>
        </div>
        <div className="silpi-header-row">
          <div>
            <span style={{ font: '500 12px var(--font-sans)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>{screenEyebrow}</span>
            <h1 style={{ font: '500 32px var(--font-serif-display)', color: 'var(--text-heading)', margin: '6px 0 0' }}>{screenTitle}</h1>
          </div>
          {isProject && (
            <button onClick={() => setScreen('dashboard')} style={{ flex: 'none', background: 'transparent', border: '1px solid var(--border-hairline)', padding: '10px 18px', font: '500 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-body)', cursor: 'pointer' }}>&larr; All Projects</button>
          )}
        </div>

        {dataLoading && (
          <div style={{ background: '#fdf8ef', border: '1px solid rgba(44,34,27,0.12)', padding: '10px 16px', font: '13px var(--font-sans)', color: 'var(--text-muted)', marginBottom: 20 }}>Loading live data from Supabase…</div>
        )}
        {!dataLoading && classifiedError && (
          <div style={{ background: '#fdf1ec', border: '1px solid #e8b4a0', padding: '12px 16px', font: '13px var(--font-sans)', color: '#7a2e1a', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Supabase request failed — {classifiedError.kind}</div>
            <div style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>{classifiedError.message}</div>
            {classifiedError.code && <div style={{ font: '12px var(--font-mono, monospace)', color: '#7a2e1a', marginTop: 4 }}>code: {classifiedError.code}</div>}
            {classifiedError.hint && <div style={{ color: '#5a3a2a', marginTop: 6, fontStyle: 'italic' }}>{classifiedError.hint}</div>}
            <button onClick={() => { setDataError(null); setClassifiedError(null); setDataLoading(true); refreshLive().finally(() => setDataLoading(false)); }} style={{ marginTop: 8, background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}
        {!dataLoading && dataError && !classifiedError && (
          <div style={{ background: '#fdf1ec', border: '1px solid #e8b4a0', padding: '10px 16px', font: '13px var(--font-sans)', color: '#7a2e1a', marginBottom: 20 }}>
            Supabase error: <span style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>{String(dataError).slice(0, 400)}</span>
            {' '}<button onClick={() => { setDataError(null); setDataLoading(true); refreshLive().finally(() => setDataLoading(false)); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}
        {!dataLoading && !dataError && !classifiedError && isLiveLoaded && sourceProjects.length === 0 && (
          <div style={{ background: '#fdf8ef', border: '1px solid rgba(44,34,27,0.12)', padding: '12px 16px', font: '13px var(--font-sans)', color: 'var(--text-muted)', marginBottom: 20 }}>
            No projects found — <code>public.projects</code> returned 0 rows. Seed data in Supabase → Table Editor or SQL Editor, then <button onClick={() => { setDataLoading(true); refreshLive().finally(() => setDataLoading(false)); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>reload</button>.
          </div>
        )}

        {/* ---------------- Dashboard ---------------- */}
        {isDashboard && (
          <>
            <div className="silpi-stat-grid">
              <StatCard value={String(scope.length)} label="Active Projects" />
              <StatCard value={money(scopeContract)} label="Total Contract Value" />
              <StatCard value={money(scopeOutstanding)} label="Outstanding Bills" />
              <StatCard value={scopeAvgSite + '%'} label="Avg. Site Progress" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '-16px 0 16px' }}>
              <span style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)' }}>{selectedIds.length > 0 ? `Totals for ${selectedIds.length} selected project${selectedIds.length > 1 ? 's' : ''}` : `Totals for all ${sourceProjects.length} projects`}</span>
              {selectedIds.length > 0 && <button onClick={() => setSelectedIds([])} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 12px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Clear selection</button>}
            </div>

            {selectedIds.length > 0 && (
              <div className="silpi-bulk-bar" style={{ background: 'var(--brown-900)', color: 'var(--cream-50)', padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Assign Site Incharge</span>
                  <select value={bulk.siteIncharge} onChange={(e) => setBulk((b) => ({ ...b, siteIncharge: e.target.value === '— no change —' ? '' : e.target.value }))} style={{ font: '13px Archivo, sans-serif', padding: '6px 8px', borderRadius: 2, border: '1px solid rgba(251,248,242,0.3)', background: '#fff', color: '#2c221b' }}>
                    {bulkOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Assign Drawing Incharge</span>
                  <select value={bulk.drawingIncharge} onChange={(e) => setBulk((b) => ({ ...b, drawingIncharge: e.target.value === '— no change —' ? '' : e.target.value }))} style={{ font: '13px Archivo, sans-serif', padding: '6px 8px', borderRadius: 2, border: '1px solid rgba(251,248,242,0.3)', background: '#fff', color: '#2c221b' }}>
                    {bulkOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brown-300)' }}>Set Drawing Status</span>
                  <select value={bulk.drawingStatus} onChange={(e) => setBulk((b) => ({ ...b, drawingStatus: e.target.value === '— no change —' ? '' : e.target.value }))} style={{ font: '13px Archivo, sans-serif', padding: '6px 8px', borderRadius: 2, border: '1px solid rgba(251,248,242,0.3)', background: '#fff', color: '#2c221b' }}>
                    {bulkStatusOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <button onClick={applyBulk} style={{ background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '9px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Apply</button>
              </div>
            )}

            <div className="silpi-table-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
              {/* Mobile Card View - Only on mobile devices (≤768px) */}
              {isMobile && (
                <div className="mobile-project-list">
                  {filteredProjects.map((p) => (
                    <div key={p.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <div className="project-name">{p.name}</div>
                        <div className="project-number">{p.number}</div>
                      </div>
                      <div className="metrics-row">
                        <div className="metric">
                          <span className="label">Contract</span>
                          <span className="value">{money(p.revisedContractValue)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Billed</span>
                          <span className="value">{money(p.billed)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Received</span>
                          <span className="value">{money(p.received)}</span>
                        </div>
                      </div>
                      <div className="site-progress">
                        <div className="progress-bar" style={{ width: p.sitePercent + '%' }} />
                        <span className="progress-percent">{p.sitePercent}%</span>
                      </div>
                      <button onClick={() => openProject(p.id)} className="view-button">View &rarr;</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Desktop Table - Only on desktop devices (>768px) */}
              {!isMobile && (
                <table style={{ minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}><input type="checkbox" checked={allVisibleChecked} onChange={() => toggleSelectAll(filteredIds)} /></th>
                      <th>Project</th><th>Contract Value</th><th>Total Billed</th><th>Total Received</th><th>Site Progress</th><th></th>
                    </tr>
                    <tr>
                      <th></th>
                      <th><input placeholder="Search name/no." value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} style={filterInputStyle} /></th>
                      <th><input type="number" placeholder="Min ₹L" value={filters.minContract} onChange={(e) => setFilters((f) => ({ ...f, minContract: e.target.value }))} style={filterInputStyle} /></th>
                      <th><input type="number" placeholder="Min ₹L" value={filters.minBilled} onChange={(e) => setFilters((f) => ({ ...f, minBilled: e.target.value }))} style={filterInputStyle} /></th>
                      <th><input type="number" placeholder="Min ₹L" value={filters.minReceived} onChange={(e) => setFilters((f) => ({ ...f, minReceived: e.target.value }))} style={filterInputStyle} /></th>
                      <th><input type="number" placeholder="Min %" value={filters.minSite} onChange={(e) => setFilters((f) => ({ ...f, minSite: e.target.value }))} style={filterInputStyle} /></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <tr key={p.id}>
                        <td><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                        <td>
                          <div style={{ font: '600 14px var(--font-sans)', color: 'var(--text-heading)' }}>{p.name}</div>
                          <div style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{p.number}</div>
                        </td>
                        <td>{money(p.revisedContractValue)}</td>
                        <td>{money(p.billed)}</td>
                        <td>{money(p.received)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 70, height: 6, background: 'var(--cream-200)' }}><div style={{ height: 6, width: p.sitePercent + '%', background: p.sitePercent >= 100 ? '#5a7350' : '#2c221b' }} /></div>
                            <span style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)' }}>{p.sitePercent}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}><button onClick={() => openProject(p.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 12px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>View &rarr;</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ---------------- Project detail ---------------- */}
        {isProject && !sel && isLiveLoaded && (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', padding: 24, font: '13px var(--font-sans)', color: 'var(--text-muted)' }}>
            No project selected — <code>public.projects</code> returned 0 rows.
          </div>
        )}
        {isProject && sel && (
          <>
            <div className="silpi-info-grid">
              <InfoCard label="Total Area"><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{sel.totalArea}</div></InfoCard>
              <InfoCard label="Contract Value"><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(sel.contractValue)}</div></InfoCard>
              <InfoCard label="Revised Contract Value"><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(sel.revisedContractValue)}</div></InfoCard>
              <InfoCard label="Project Incharge"><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)' }}>{sel.incharge}</div></InfoCard>
              <InfoCard label="Total Billed"><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(sel.billed)}</div></InfoCard>
              <InfoCard label="Total Received"><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(sel.received)}</div></InfoCard>
              <InfoCard label="Site Progress">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--cream-200)' }}><div style={{ height: 6, width: sel.sitePercent + '%', background: sel.sitePercent >= 100 ? '#5a7350' : '#2c221b' }} /></div>
                  <span style={{ font: '600 13px var(--font-sans)', color: 'var(--text-heading)' }}>{sel.sitePercent}%</span>
                </div>
              </InfoCard>
              <InfoCard label="Site Incharge">
                {canEditSite ? <select value={sel.siteIncharge} onChange={(e) => setOverride(sel.id, 'siteIncharge', e.target.value)} style={editSelectStyle}>{userNames.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                  : <div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)' }}>{sel.siteIncharge}</div>}
              </InfoCard>
              <InfoCard label="Drawing Status">
                {canEditDrawing ? <select value={sel.drawingStatus} onChange={(e) => setOverride(sel.id, 'drawingStatus', e.target.value)} style={editSelectStyle}>{DRAWING_STATUS_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                  : <span style={tagStyle(sel.drawingStatus)}>{sel.drawingStatus}</span>}
              </InfoCard>
              <InfoCard label="Drawing Incharge">
                {canEditDrawing ? <select value={sel.drawingIncharge} onChange={(e) => setOverride(sel.id, 'drawingIncharge', e.target.value)} style={editSelectStyle}>{userNames.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                  : <div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)' }}>{sel.drawingIncharge}</div>}
              </InfoCard>
            </div>

            <h3 style={{ font: '500 18px var(--font-serif-display)', color: 'var(--text-heading)', margin: '28px 0 12px' }}>Billing Schedule</h3>
            <div className="silpi-table-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', marginBottom: 32 }}>
              <table>
                <thead><tr><th>Billing Stage</th><th>Percentage</th><th>Amount</th><th>Billed</th><th>Remaining</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {selectedRows.map((s) => (
                    <tr key={s.stage}>
                      <td style={{ font: '600 14px var(--font-sans)', color: 'var(--text-heading)' }}>{s.stage}</td>
                      <td>{s.pct}%</td>
                      <td>{money(s.amount)}</td>
                      <td>{money(s.billedAmount)}</td>
                      <td>{money(s.remaining)}</td>
                      <td><span style={tagStyle(s.status)}>{s.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {s.remaining > 0 && <button onClick={() => openBillingPage(sel.id, s.stage, s.remaining)} style={{ background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '8px 16px', font: '600 11px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Initiate Billing</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ font: '500 18px var(--font-serif-display)', color: 'var(--text-heading)', margin: 0 }}>Bills & Payments</h3>
              <button onClick={() => openNewBill(sel.name, 'project')} style={{ background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '9px 18px', font: '600 11px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>+ New Bill / Payment</button>
            </div>
            <div className="silpi-table-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
              <table style={{ minWidth: 1100 }}>
                <thead>
                  <tr><th>Bill No.</th><th>Stage</th><th>Amount</th><th>Tax</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Mode</th><th>Date</th><th>Status</th><th>Comments</th><th></th></tr>
                  <tr>
                    <th><input placeholder="Search bill no." value={pbFilters.q} onChange={(e) => setPbFilters((f) => ({ ...f, q: e.target.value }))} style={filterInputStyle} /></th>
                    <th><select value={pbFilters.stage} onChange={(e) => setPbFilters((f) => ({ ...f, stage: e.target.value }))} style={filterInputStyle}>{pbStageOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></th>
                    <th></th><th></th><th></th><th></th><th></th><th></th>
                    <th><select value={pbFilters.status} onChange={(e) => setPbFilters((f) => ({ ...f, status: e.target.value }))} style={filterInputStyle}>{pbStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></th>
                    <th></th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pbRows.map((b) => (
                    <tr key={b.billNo}>
                      <td style={{ font: '600 13px var(--font-sans)', color: 'var(--text-heading)' }}>{b.billNo}</td>
                      <td>{b.stage}</td>
                      <td>{money(b.amount)}</td>
                      <td>{money(taxTotalOf(b))}</td>
                      <td style={{ font: '600 14px var(--font-sans)', color: 'var(--text-heading)' }}>{money(b.total)}</td>
                      <td>{money(b.paidSoFar)}</td>
                      <td>{money(b.remaining)}</td>
                      <td>{b.mode}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{b.date}</td>
                      <td><span style={tagStyle(b.status)}>{b.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200 }}>{b.comments || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {b.remaining > 0 && <button onClick={() => openPaymentPage(b.billNo, b.remaining, 'project')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 11px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Record Payment</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- Initiate Billing ---------------- */}
        {isBillStage && billingContext && (() => {
          const bp = withOverrides.find((p) => p.id === billingContext.projectId);
          const bs = bp.billing.find((s) => s.stage === billingContext.stageName);
          const key = bp.id + '::' + bs.stage;
          const ov = stageOverrides[key];
          const billedAmount = ov ? ov.billedAmount : (bs.status !== 'Pending' ? bs.amount : 0);
          const remaining = bs.amount - billedAmount;
          const amt = Number(billForm.amount) || 0;
          const taxTotal = billForm.taxes.reduce((s, t) => s + Math.round(amt * (Number(t.pct) || 0) / 100), 0);
          const deductionTotal = billForm.deductions.reduce((s, d) => s + Math.round(amt * (Number(d.pct) || 0) / 100), 0);
          const isPartial = amt > 0 && amt < remaining;
          return (
            <div className="silpi-form-card">
              <div style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)', marginBottom: 4 }}>{bp.name}</div>
              <h2 style={{ font: '500 24px var(--font-serif-display)', color: 'var(--text-heading)', margin: '0 0 24px' }}>{bs.stage}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-hairline)' }}>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Stage Amount</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)', marginTop: 4 }}>{money(bs.amount)}</div></div>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Billed So Far</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)', marginTop: 4 }}>{money(billedAmount)}</div></div>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Remaining</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--accent)', marginTop: 4 }}>{money(remaining)}</div></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bill Amount (₹)</span>
                <input type="number" value={billForm.amount} onChange={(e) => setBillForm((f) => ({ ...f, amount: e.target.value }))} style={{ ...filterInputStyle, fontSize: 15, padding: '10px 12px' }} />
                {isPartial && <span style={{ font: '12px var(--font-sans)', color: 'var(--clay-600)' }}>This is a partial bill — remaining balance stays pending for a later invoice.</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date</span>
                <input value={billForm.date} onChange={(e) => setBillForm((f) => ({ ...f, date: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px', maxWidth: 200 }} />
              </div>

              <TaxDeductionList title="Taxes" rows={billForm.taxes} listName="taxes" setForm={setBillForm} addLabel="+ Add Tax" />
              <TaxDeductionList title="Deductions (TDS, discounts, etc.)" rows={billForm.deductions} listName="deductions" setForm={setBillForm} addLabel="+ Add Deduction" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Comments</span>
                <textarea rows={2} placeholder="Notes for this invoice (optional)" value={billForm.comments} onChange={(e) => setBillForm((f) => ({ ...f, comments: e.target.value }))} style={{ ...filterInputStyle, fontFamily: 'Archivo, sans-serif', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border-hairline)', marginBottom: 24 }}>
                <div><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Taxes</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)' }}>{money(taxTotal)}</div></div>
                <div><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Deductions</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--red-600)' }}>&minus;{money(deductionTotal)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Net Invoice</div><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(amt + taxTotal - deductionTotal)}</div></div>
              </div>

              <div className="silpi-btn-row" style={{ display: 'flex', gap: 12 }}>
                <button onClick={submitBill} style={{ flex: 1, background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Record Bill</button>
                <button onClick={cancelBilling} style={{ background: 'transparent', border: '1px solid var(--border-hairline)', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-body)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          );
        })()}

        {/* ---------------- Bill & Payment Tracker ---------------- */}
        {isBilling && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => openNewBill()} style={{ background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '10px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>+ New Bill / Payment</button>
            </div>
            <div className="silpi-table-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
              <table style={{ minWidth: 1100 }}>
                <thead>
                  <tr><th>Bill No.</th><th>Project</th><th>Stage</th><th>Bill Amount</th><th>Tax</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Bank/Cash</th><th>Date</th><th>Status</th><th>Comments</th><th></th></tr>
                  <tr>
                    <th><input placeholder="Search bill/stage" value={billingFilters.q} onChange={(e) => setBillingFilters((f) => ({ ...f, q: e.target.value }))} style={filterInputStyle} /></th>
                    <th>
                      <input list="billing-project-options" placeholder="Type or pick a project" value={billingFilters.project} onChange={(e) => setBillingFilters((f) => ({ ...f, project: e.target.value }))} style={filterInputStyle} />
                      <datalist id="billing-project-options">{billingProjectOptions.map((p) => <option key={p} value={p} />)}</datalist>
                    </th>
                    <th></th><th></th><th></th><th></th><th></th>
                    <th><select value={billingFilters.mode} onChange={(e) => setBillingFilters((f) => ({ ...f, mode: e.target.value }))} style={filterInputStyle}>{billingModeOptions.map((m) => <option key={m} value={m}>{m}</option>)}</select></th>
                    <th></th>
                    <th><select value={billingFilters.status} onChange={(e) => setBillingFilters((f) => ({ ...f, status: e.target.value }))} style={filterInputStyle}>{billingStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select></th>
                    <th></th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {billRows.map((b) => (
                    <tr key={b.billNo} style={{ background: highlightOverdue && b.status === 'Overdue' ? 'rgba(156,68,51,0.06)' : 'transparent' }}>
                      <td style={{ font: '600 13px var(--font-sans)', color: 'var(--text-heading)' }}>{b.billNo}</td>
                      <td>{b.project}</td>
                      <td>{b.stage}</td>
                      <td>{money(b.amount)}</td>
                      <td>{money(taxTotalOf(b))}</td>
                      <td style={{ font: '600 14px var(--font-sans)', color: 'var(--text-heading)' }}>{money(b.total)}</td>
                      <td>{money(b.paidSoFar)}</td>
                      <td>{money(b.remaining)}</td>
                      <td>{b.mode}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{b.date}</td>
                      <td><span style={tagStyle(b.status)}>{b.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200 }}>{b.comments || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {b.remaining > 0 && <button onClick={() => openPaymentPage(b.billNo, b.remaining)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', font: '600 11px var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Record Payment</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- Record Payment ---------------- */}
        {isRecordPayment && paymentContext && (() => {
          const targetBill = resolvePayment(allBills.find((b) => b.billNo === paymentContext.billNo));
          if (!targetBill) return null;
          const isPartial = Number(paymentForm.amount) > 0 && Number(paymentForm.amount) < targetBill.remaining;
          return (
            <div className="silpi-form-card">
              <div style={{ font: '12px var(--font-sans)', color: 'var(--text-muted)', marginBottom: 4 }}>{targetBill.project} &middot; {targetBill.billNo}</div>
              <h2 style={{ font: '500 24px var(--font-serif-display)', color: 'var(--text-heading)', margin: '0 0 24px' }}>{targetBill.stage}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-hairline)' }}>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Invoice Total</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)', marginTop: 4 }}>{money(targetBill.total)}</div></div>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Received So Far</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)', marginTop: 4 }}>{money(targetBill.paidSoFar)}</div></div>
                <div><div style={{ font: '500 10px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Remaining</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--accent)', marginTop: 4 }}>{money(targetBill.remaining)}</div></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Payment Amount (₹)</span>
                <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} style={{ ...filterInputStyle, fontSize: 15, padding: '10px 12px' }} />
                {isPartial && <span style={{ font: '12px var(--font-sans)', color: 'var(--clay-600)' }}>This is a partial payment — the remaining balance stays outstanding.</span>}
              </div>

              <div className="silpi-form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Received Via</span>
                  <select value={paymentForm.mode} onChange={(e) => setPaymentForm((f) => ({ ...f, mode: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }}>{BANK_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date</span>
                  <input value={paymentForm.date} onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }} />
                </div>
              </div>

              <div className="silpi-btn-row" style={{ display: 'flex', gap: 12 }}>
                <button onClick={submitPayment} style={{ flex: 1, background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Record Payment</button>
                <button onClick={cancelPayment} style={{ background: 'transparent', border: '1px solid var(--border-hairline)', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-body)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          );
        })()}

        {/* ---------------- New Bill / Payment ---------------- */}
        {isNewBill && (() => {
          const nb = newBillForm;
          const amt = Number(nb.amount) || 0;
          const taxTotal = nb.taxes.reduce((s, t) => s + Math.round(amt * (Number(t.pct) || 0) / 100), 0);
          const deductionTotal = nb.deductions.reduce((s, d) => s + Math.round(amt * (Number(d.pct) || 0) / 100), 0);
          const stageOptionsForProject = [...nbProject.billing.map((b) => b.stage), 'Other (custom)'];
          const isOtherStage = nb.stage === 'Other (custom)';
          const isPaidType = nb.status === 'Paid';
          return (
            <div className="silpi-form-card">
              <h2 style={{ font: '500 24px var(--font-serif-display)', color: 'var(--text-heading)', margin: '0 0 20px' }}>Manually Record an Entry</h2>

              <div style={{ display: 'flex', marginBottom: 24, border: '1px solid var(--border-hairline)' }}>
                <button onClick={() => setNewBillForm((f) => ({ ...f, status: 'Billed' }))} style={{ flex: 1, padding: 12, border: 'none', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: !isPaidType ? '#2c221b' : 'transparent', color: !isPaidType ? '#fbf8f2' : '#2c221b' }}>Bill (Invoice Raised)</button>
                <button onClick={() => setNewBillForm((f) => ({ ...f, status: 'Paid' }))} style={{ flex: 1, padding: 12, border: 'none', borderLeft: '1px solid var(--border-hairline)', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: isPaidType ? '#2c221b' : 'transparent', color: isPaidType ? '#fbf8f2' : '#2c221b' }}>Payment (Received)</button>
              </div>

              <div className="silpi-form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Project</span>
                  <select value={nb.projectName} onChange={(e) => changeNewBillProject(e.target.value)} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }}>{sourceProjects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Billing Stage / Description</span>
                  <select value={nb.stage} onChange={(e) => setNewBillForm((f) => ({ ...f, stage: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }}>{stageOptionsForProject.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                  {isOtherStage && <input placeholder="Describe the stage" value={nb.customStage} onChange={(e) => setNewBillForm((f) => ({ ...f, customStage: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px', marginTop: 6 }} />}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount (₹)</span>
                <input type="number" value={nb.amount} onChange={(e) => setNewBillForm((f) => ({ ...f, amount: e.target.value }))} style={{ ...filterInputStyle, fontSize: 15, padding: '10px 12px' }} />
              </div>

              <div className="silpi-form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date</span>
                  <input value={nb.date} onChange={(e) => setNewBillForm((f) => ({ ...f, date: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }} />
                </div>
                {isPaidType && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Received Via</span>
                    <select value={nb.mode} onChange={(e) => setNewBillForm((f) => ({ ...f, mode: e.target.value }))} style={{ ...filterInputStyle, fontSize: 14, padding: '10px 12px' }}>{BANK_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
                )}
              </div>

              <TaxDeductionList title="Taxes" rows={nb.taxes} listName="taxes" setForm={setNewBillForm} addLabel="+ Add Tax" />
              <TaxDeductionList title="Deductions (TDS, discounts, etc.)" rows={nb.deductions} listName="deductions" setForm={setNewBillForm} addLabel="+ Add Deduction" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                <span style={{ font: '500 11px var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Comments</span>
                <textarea rows={2} placeholder="Notes for this entry (optional)" value={nb.comments} onChange={(e) => setNewBillForm((f) => ({ ...f, comments: e.target.value }))} style={{ ...filterInputStyle, fontFamily: 'Archivo, sans-serif', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border-hairline)', marginBottom: 24 }}>
                <div><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Taxes</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--text-heading)' }}>{money(taxTotal)}</div></div>
                <div><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Deductions</div><div style={{ font: '600 15px var(--font-sans)', color: 'var(--red-600)' }}>&minus;{money(deductionTotal)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ font: '11px var(--font-sans)', color: 'var(--text-muted)' }}>Net Total</div><div style={{ font: '600 18px var(--font-sans)', color: 'var(--text-heading)' }}>{money(amt + taxTotal - deductionTotal)}</div></div>
              </div>

              <div className="silpi-btn-row" style={{ display: 'flex', gap: 12 }}>
                <button onClick={submitNewBill} style={{ flex: 1, background: 'var(--clay-600)', color: 'var(--cream-50)', border: 'none', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                <button onClick={cancelNewBill} style={{ background: 'transparent', border: '1px solid var(--border-hairline)', padding: '12px 20px', font: '600 12px var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-body)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          );
        })()}

        {/* ---------------- User Management ---------------- */}
        {isUsers && (
          <div className="silpi-table-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
            <table>
              <thead><tr><th>Employee Code</th><th>Name</th><th>Privilege</th></tr></thead>
              <tbody>
                {sourceUsers.map((u) => (
                  <tr key={u.code}>
                    <td style={{ font: '600 13px var(--font-sans)', color: 'var(--text-heading)' }}>{u.code}</td>
                    <td>{u.name}</td>
                    <td>
                      <span style={u.role === 'Admin'
                        ? { display: 'inline-block', padding: '4px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fbf8f2', background: '#2c221b', border: '1px solid #2c221b' }
                        : { display: 'inline-block', padding: '4px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4e3c2e', background: 'transparent', border: '1px solid rgba(44,34,27,0.25)' }}>{u.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
