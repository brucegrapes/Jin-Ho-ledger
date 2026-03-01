'use client';

import { useState, useEffect, useMemo } from 'react';

interface PaymentMethod {
  id: number;
  type: 'debit' | 'credit' | 'upi' | 'bank';
  name: string;
  last_four?: string | null;
  upi_id?: string | null;
  bank_name?: string | null;
  color: string;
}

interface Subscription {
  id: number;
  name: string;
  amount: number;
  billing_cycle: string;
  next_charge_date?: string | null;
  payment_method_id?: number | null;
  status: string;
  category: string;
  url?: string | null;
  notes?: string | null;
}

const BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'annually'];
const CATEGORIES = ['Entertainment', 'Development', 'Productivity', 'Health', 'Finance', 'News', 'Education', 'Other'];
const METHOD_TYPES = [
  { value: 'debit', label: 'Debit Card' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Account' },
];
const PRESET_COLORS = ['#1F4E79', '#2E7D32', '#C62828', '#E65100', '#6A1B9A', '#00695C', '#4527A0', '#37474F'];

function toMonthly(amount: number, cycle: string): number {
  if (cycle === 'weekly') return (amount * 52) / 12;
  if (cycle === 'quarterly') return amount / 3;
  if (cycle === 'annually' || cycle === 'yearly') return amount / 12;
  return amount;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function ChargeDate({ date }: { date?: string | null }) {
  if (!date) return <span className="text-xs text-text-tertiary italic">No date</span>;
  const days = daysUntil(date);
  if (days === null) return null;
  let colorClass = 'text-text-tertiary';
  let label = date;
  if (days < 0) { colorClass = 'text-error'; label = `${Math.abs(days)}d overdue`; }
  else if (days === 0) { colorClass = 'text-error font-semibold'; label = 'Today!'; }
  else if (days <= 3) { colorClass = 'text-error'; label = `in ${days}d (${date})`; }
  else if (days <= 7) { colorClass = 'text-warning'; label = `in ${days}d`; }
  return <span className={`text-xs tabular-nums ${colorClass}`}>{label}</span>;
}

function TypeIcon({ type, className = 'w-4 h-4' }: { type: string; className?: string }) {
  if (type === 'upi') return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  if (type === 'bank') return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 9l8-4 8 4M4 9v10h16V9M9 13v4m3-4v4m3-4v4" />
    </svg>
  );
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

const emptySubForm = { name: '', amount: '', billing_cycle: 'monthly', next_charge_date: '', payment_method_id: '', status: 'active', category: 'Other', url: '', notes: '' };
const emptyMethodForm = { type: 'debit', name: '', last_four: '', upi_id: '', bank_name: '', color: '#1F4E79' };

export default function SubscriptionTracker() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showSubModal, setShowSubModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<number | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Pre-fill payment method id when adding subscription from a card
  const [prefillMethodId, setPrefillMethodId] = useState<number | null>(null);

  const [subForm, setSubForm] = useState({ ...emptySubForm });
  const [methodForm, setMethodForm] = useState({ ...emptyMethodForm });

  const fetchAll = async () => {
    const [mRes, sRes] = await Promise.all([
      fetch('/api/payment-methods', { credentials: 'include' }),
      fetch('/api/subscriptions', { credentials: 'include' }),
    ]);
    const mData = await mRes.json();
    const sData = await sRes.json();
    setMethods(mData.methods ?? []);
    setSubs(sData.subscriptions ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  // ---------- SUMMARIES ----------
  const activeSubs = useMemo(() => subs.filter(s => s.status === 'active'), [subs]);
  const totalMonthly = useMemo(() =>
    activeSubs.reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle), 0),
    [activeSubs]
  );
  const dueThisWeek = useMemo(() =>
    activeSubs.filter(s => {
      const d = daysUntil(s.next_charge_date);
      return d !== null && d >= 0 && d <= 7;
    }).length,
    [activeSubs]
  );

  // ---------- SAVE SUB ----------
  const saveSub = async () => {
    if (!subForm.name.trim() || !subForm.amount || !subForm.billing_cycle) {
      notify('Name, amount and billing cycle are required.', false);
      return;
    }
    setSaving(true);
    const body = {
      name: subForm.name.trim(),
      amount: parseFloat(subForm.amount),
      billing_cycle: subForm.billing_cycle,
      next_charge_date: subForm.next_charge_date || null,
      payment_method_id: subForm.payment_method_id ? parseInt(subForm.payment_method_id) : null,
      status: subForm.status,
      category: subForm.category,
      url: subForm.url.trim() || null,
      notes: subForm.notes.trim() || null,
    };
    try {
      if (editingSub) {
        await fetch(`/api/subscriptions/${editingSub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
        notify('Subscription updated.');
      } else {
        await fetch('/api/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
        notify('Subscription added.');
      }
      await fetchAll();
      closeSubModal();
    } catch {
      notify('Failed to save.', false);
    } finally {
      setSaving(false);
    }
  };

  // ---------- TOGGLE STATUS ----------
  const toggleStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    await fetch(`/api/subscriptions/${sub.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...sub, status: newStatus, payment_method_id: sub.payment_method_id ?? null }),
    });
    await fetchAll();
  };

  // ---------- DELETE SUB ----------
  const deleteSub = async (id: number) => {
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE', credentials: 'include' });
    setDeletingSubId(null);
    await fetchAll();
    notify('Subscription removed.');
  };

  // ---------- SAVE METHOD ----------
  const saveMethod = async () => {
    if (!methodForm.name.trim()) {
      notify('Name is required.', false);
      return;
    }
    setSaving(true);
    const body = {
      type: methodForm.type,
      name: methodForm.name.trim(),
      last_four: methodForm.last_four.trim() || null,
      upi_id: methodForm.upi_id.trim() || null,
      bank_name: methodForm.bank_name.trim() || null,
      color: methodForm.color,
    };
    try {
      if (editingMethod) {
        await fetch(`/api/payment-methods/${editingMethod.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
        notify('Payment method updated.');
      } else {
        await fetch('/api/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
        notify('Payment method added.');
      }
      await fetchAll();
      closeMethodModal();
    } catch {
      notify('Failed to save.', false);
    } finally {
      setSaving(false);
    }
  };

  // ---------- DELETE METHOD ----------
  const deleteMethod = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: 'DELETE', credentials: 'include' });
    setDeletingMethodId(null);
    await fetchAll();
    notify('Payment method removed. Subscriptions were unlinked, not deleted.');
  };

  // ---------- MODAL HELPERS ----------
  const openAddSub = (methodId?: number) => {
    setEditingSub(null);
    setSubForm({ ...emptySubForm, payment_method_id: methodId ? String(methodId) : '' });
    setPrefillMethodId(methodId ?? null);
    setShowSubModal(true);
  };
  const openEditSub = (sub: Subscription) => {
    setEditingSub(sub);
    setSubForm({
      name: sub.name,
      amount: String(sub.amount),
      billing_cycle: sub.billing_cycle,
      next_charge_date: sub.next_charge_date ?? '',
      payment_method_id: sub.payment_method_id ? String(sub.payment_method_id) : '',
      status: sub.status,
      category: sub.category,
      url: sub.url ?? '',
      notes: sub.notes ?? '',
    });
    setShowSubModal(true);
  };
  const closeSubModal = () => { setShowSubModal(false); setEditingSub(null); setPrefillMethodId(null); setSubForm({ ...emptySubForm }); };

  const openAddMethod = () => { setEditingMethod(null); setMethodForm({ ...emptyMethodForm }); setShowMethodModal(true); };
  const openEditMethod = (m: PaymentMethod) => {
    setEditingMethod(m);
    setMethodForm({ type: m.type, name: m.name, last_four: m.last_four ?? '', upi_id: m.upi_id ?? '', bank_name: m.bank_name ?? '', color: m.color });
    setShowMethodModal(true);
  };
  const closeMethodModal = () => { setShowMethodModal(false); setEditingMethod(null); setMethodForm({ ...emptyMethodForm }); };

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-tertiary text-sm">Loading subscriptions…</div>
      </div>
    );
  }

  const subsForMethod = (methodId: number | null) =>
    subs.filter(s => (methodId === null ? !s.payment_method_id : s.payment_method_id === methodId));

  const monthlyForMethod = (methodId: number) =>
    subsForMethod(methodId)
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle), 0);

  const inputCls = 'w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-sm font-medium text-text-secondary mb-1.5';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm font-medium shadow-lg ${msg.ok ? 'bg-accent-surface text-accent border border-accent/20' : 'bg-error-surface text-error border border-error/20'}`}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          {msg.text}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Monthly Cost</div>
          <div className="text-2xl font-semibold text-text-primary mt-2 tabular-nums">₹{totalMonthly.toFixed(2)}</div>
          <div className="text-xs text-text-tertiary mt-1">active subscriptions</div>
        </div>
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Active</div>
          <div className="text-2xl font-semibold text-accent mt-2 tabular-nums">{activeSubs.length}</div>
          <div className="text-xs text-text-tertiary mt-1">of {subs.length} total</div>
        </div>
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: `3px solid ${dueThisWeek > 0 ? 'var(--warning)' : 'var(--border)'}` }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Due This Week</div>
          <div className={`text-2xl font-semibold mt-2 tabular-nums ${dueThisWeek > 0 ? 'text-warning' : 'text-text-tertiary'}`}>{dueThisWeek}</div>
          <div className="text-xs text-text-tertiary mt-1">upcoming charges</div>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-text-primary">Payment Methods</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openAddSub()}
            className="flex items-center gap-1.5 px-4 py-2 border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-primary transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Subscription
          </button>
          <button
            type="button"
            onClick={openAddMethod}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Card / UPI
          </button>
        </div>
      </div>

      {/* Payment Method Cards */}
      {methods.length === 0 && (
        <div className="trust-card p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-surface flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h4m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-text-secondary font-medium">No payment methods yet</p>
          <p className="text-sm text-text-tertiary mt-1">Add your debit cards, credit cards and UPI accounts to track which subscriptions are charged where.</p>
          <button
            type="button"
            onClick={openAddMethod}
            className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Add your first payment method
          </button>
        </div>
      )}

      {methods.map(method => {
        const linked = subsForMethod(method.id);
        const monthly = monthlyForMethod(method.id);
        return (
          <div key={method.id} className="trust-card overflow-hidden" style={{ borderLeft: `3px solid ${method.color}` }}>
            {/* Method header */}
            <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: method.color }}>
                  <TypeIcon type={method.type} className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{method.name}</span>
                    <span className="text-xs text-text-tertiary px-2 py-0.5 bg-surface-muted capitalize" style={{ borderRadius: '4px' }}>
                      {method.type}
                    </span>
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {method.type === 'upi' && method.upi_id && <span>{method.upi_id}</span>}
                    {method.type !== 'upi' && method.last_four && <span>•••• {method.last_four}</span>}
                    {method.bank_name && <span className="ml-1">· {method.bank_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {monthly > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-semibold text-text-primary tabular-nums">₹{monthly.toFixed(0)}/mo</div>
                    <div className="text-xs text-text-tertiary">{linked.filter(s => s.status === 'active').length} active</div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => openEditMethod(method)}
                  className="p-1.5 text-text-tertiary hover:text-primary hover:bg-surface-muted transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingMethodId(method.id)}
                  className="p-1.5 text-text-tertiary hover:text-error hover:bg-error-surface transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Subscription rows */}
            {linked.length > 0 ? (
              <div className="divide-y divide-border">
                {linked.map(sub => <SubRow key={sub.id} sub={sub} onToggle={toggleStatus} onEdit={openEditSub} onDelete={() => setDeletingSubId(sub.id)} />)}
              </div>
            ) : (
              <div className="px-5 py-4 text-sm text-text-tertiary italic">No subscriptions linked.</div>
            )}

            {/* Add to this card */}
            <div className="px-5 py-3 border-t border-border-light">
              <button
                type="button"
                onClick={() => openAddSub(method.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-primary transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add subscription to this card
              </button>
            </div>
          </div>
        );
      })}

      {/* Unassigned subscriptions */}
      {subsForMethod(null).length > 0 && (
        <div className="trust-card overflow-hidden" style={{ borderLeft: '3px solid var(--border)' }}>
          <div className="px-5 py-4 border-b border-border">
            <span className="font-semibold text-text-primary">Unassigned</span>
            <span className="ml-2 text-xs text-text-tertiary">Not linked to any payment method</span>
          </div>
          <div className="divide-y divide-border">
            {subsForMethod(null).map(sub => (
              <SubRow key={sub.id} sub={sub} onToggle={toggleStatus} onEdit={openEditSub} onDelete={() => setDeletingSubId(sub.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no subscriptions at all */}
      {subs.length === 0 && methods.length > 0 && (
        <div className="trust-card p-8 text-center">
          <p className="text-text-secondary font-medium">No subscriptions yet</p>
          <p className="text-sm text-text-tertiary mt-1">Track GitHub, Netflix, Spotify and anything else that charges you automatically.</p>
          <button
            type="button"
            onClick={() => openAddSub()}
            className="mt-4 px-5 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            Add your first subscription
          </button>
        </div>
      )}

      {/* ── ADD/EDIT SUBSCRIPTION MODAL ── */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={closeSubModal}>
          <div
            className="bg-surface w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: '20px 20px 0 0', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border" style={{ borderRadius: '2px' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-text-primary">{editingSub ? 'Edit Subscription' : 'Add Subscription'}</h3>
              <button type="button" onClick={closeSubModal} className="p-2 hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Service Name *</label>
                  <input value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. GitHub Pro, Netflix" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label className={labelCls}>Amount (₹) *</label>
                  <input type="number" value={subForm.amount} onChange={e => setSubForm(f => ({ ...f, amount: e.target.value }))} className={`${inputCls} tabular-nums`} placeholder="299" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label className={labelCls}>Billing Cycle *</label>
                  <select value={subForm.billing_cycle} onChange={e => setSubForm(f => ({ ...f, billing_cycle: e.target.value }))} className={inputCls} style={{ borderRadius: 'var(--radius-sm)' }}>
                    {BILLING_CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Next Charge Date</label>
                  <input type="date" value={subForm.next_charge_date} onChange={e => setSubForm(f => ({ ...f, next_charge_date: e.target.value }))} className={inputCls} style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))} className={inputCls} style={{ borderRadius: 'var(--radius-sm)' }}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select value={subForm.payment_method_id} onChange={e => setSubForm(f => ({ ...f, payment_method_id: e.target.value }))} className={inputCls} style={{ borderRadius: 'var(--radius-sm)' }}>
                    <option value="">— Unassigned —</option>
                    {methods.map(m => <option key={m.id} value={m.id}>{m.name}{m.last_four ? ` (••${m.last_four})` : ''}{m.upi_id ? ` (${m.upi_id})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={subForm.category} onChange={e => setSubForm(f => ({ ...f, category: e.target.value }))} className={inputCls} style={{ borderRadius: 'var(--radius-sm)' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Website / URL</label>
                  <input value={subForm.url} onChange={e => setSubForm(f => ({ ...f, url: e.target.value }))} className={inputCls} placeholder="https://github.com" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <input value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional note" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            </div>
            <div className="px-5 pb-6 flex gap-3">
              <button type="button" onClick={closeSubModal} className="flex-1 py-2.5 border border-border text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Cancel</button>
              <button type="button" onClick={saveSub} disabled={saving} className="flex-1 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>
                {saving ? 'Saving…' : editingSub ? 'Save Changes' : 'Add Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT PAYMENT METHOD MODAL ── */}
      {showMethodModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={closeMethodModal}>
          <div
            className="bg-surface w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: '20px 20px 0 0', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border" style={{ borderRadius: '2px' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-text-primary">{editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
              <button type="button" onClick={closeMethodModal} className="p-2 hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {METHOD_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setMethodForm(f => ({ ...f, type: t.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border transition-colors ${methodForm.type === t.value ? 'border-primary bg-primary-surface text-primary' : 'border-border bg-surface text-text-secondary hover:bg-surface-muted'}`}
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    >
                      <TypeIcon type={t.value} className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Name *</label>
                <input value={methodForm.name} onChange={e => setMethodForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. HDFC Savings, SBI Credit" style={{ borderRadius: 'var(--radius-sm)' }} />
              </div>
              {(methodForm.type === 'debit' || methodForm.type === 'credit') && (
                <div>
                  <label className={labelCls}>Last 4 digits</label>
                  <input value={methodForm.last_four} maxLength={4} onChange={e => setMethodForm(f => ({ ...f, last_four: e.target.value.replace(/\D/g, '') }))} className={`${inputCls} tabular-nums tracking-widest`} placeholder="1234" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
              {methodForm.type === 'upi' && (
                <div>
                  <label className={labelCls}>UPI ID</label>
                  <input value={methodForm.upi_id} onChange={e => setMethodForm(f => ({ ...f, upi_id: e.target.value }))} className={inputCls} placeholder="name@upi" style={{ borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
              <div>
                <label className={labelCls}>Bank Name</label>
                <input value={methodForm.bank_name} onChange={e => setMethodForm(f => ({ ...f, bank_name: e.target.value }))} className={inputCls} placeholder="e.g. HDFC, SBI, ICICI" style={{ borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label className={labelCls}>Colour</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setMethodForm(f => ({ ...f, color: c }))}
                      className="w-8 h-8 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderRadius: '50%', outline: methodForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-6 flex gap-3">
              <button type="button" onClick={closeMethodModal} className="flex-1 py-2.5 border border-border text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Cancel</button>
              <button type="button" onClick={saveMethod} disabled={saving} className="flex-1 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>
                {saving ? 'Saving…' : editingMethod ? 'Save Changes' : 'Add Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE SUBSCRIPTION CONFIRM ── */}
      {deletingSubId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 w-full max-w-sm" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-base font-semibold text-text-primary mb-2">Remove subscription?</h3>
            <p className="text-sm text-text-secondary mb-5">This will permanently delete this subscription from your tracker.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeletingSubId(null)} className="flex-1 py-2.5 border border-border text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Cancel</button>
              <button type="button" onClick={() => deleteSub(deletingSubId)} className="flex-1 py-2.5 bg-error text-white text-sm font-medium hover:opacity-90 transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE METHOD CONFIRM ── */}
      {deletingMethodId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 w-full max-w-sm" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-base font-semibold text-text-primary mb-2">Remove payment method?</h3>
            <p className="text-sm text-text-secondary mb-5">Subscriptions linked to this method will be unlinked but not deleted.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeletingMethodId(null)} className="flex-1 py-2.5 border border-border text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Cancel</button>
              <button type="button" onClick={() => deleteMethod(deletingMethodId)} className="flex-1 py-2.5 bg-error text-white text-sm font-medium hover:opacity-90 transition-colors" style={{ borderRadius: 'var(--radius-sm)' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: single subscription row ──
function SubRow({ sub, onToggle, onEdit, onDelete }: {
  sub: Subscription;
  onToggle: (s: Subscription) => void;
  onEdit: (s: Subscription) => void;
  onDelete: () => void;
}) {
  const monthly = toMonthly(sub.amount, sub.billing_cycle);
  const isCancelled = sub.status === 'cancelled';
  const isPaused = sub.status === 'paused';

  const statusBadge = () => {
    if (isCancelled) return <span className="px-2 py-0.5 text-xs font-medium text-text-tertiary bg-surface-muted" style={{ borderRadius: '4px' }}>Cancelled</span>;
    if (isPaused) return <span className="px-2 py-0.5 text-xs font-medium text-warning bg-warning-surface" style={{ borderRadius: '4px' }}>Paused</span>;
    return <span className="px-2 py-0.5 text-xs font-medium text-accent bg-accent-surface" style={{ borderRadius: '4px' }}>Active</span>;
  };

  return (
    <div className={`px-5 py-3.5 flex items-center justify-between gap-3 ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {sub.url ? (
            <a href={sub.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate">
              {sub.name}
            </a>
          ) : (
            <span className="text-sm font-medium text-text-primary truncate">{sub.name}</span>
          )}
          <span className="text-xs text-text-tertiary bg-surface-muted px-1.5 py-0.5" style={{ borderRadius: '4px' }}>{sub.category}</span>
          {statusBadge()}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-text-secondary tabular-nums">
            ₹{sub.amount.toFixed(2)} / {sub.billing_cycle}
            {sub.billing_cycle !== 'monthly' && <span className="text-text-tertiary"> (≈₹{monthly.toFixed(0)}/mo)</span>}
          </span>
          <span className="text-text-tertiary text-xs">·</span>
          <span className="text-xs text-text-tertiary">Next:</span>
          <ChargeDate date={sub.next_charge_date} />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!isCancelled && (
          <button
            type="button"
            onClick={() => onToggle(sub)}
            className={`p-1.5 text-xs font-medium transition-colors ${isPaused ? 'text-accent hover:bg-accent-surface' : 'text-text-tertiary hover:bg-surface-muted'}`}
            style={{ borderRadius: 'var(--radius-sm)' }}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(sub)}
          className="p-1.5 text-text-tertiary hover:text-primary hover:bg-surface-muted transition-colors"
          style={{ borderRadius: 'var(--radius-sm)' }}
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-text-tertiary hover:text-error hover:bg-error-surface transition-colors"
          style={{ borderRadius: 'var(--radius-sm)' }}
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
