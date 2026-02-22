'use client';

import { useEffect, useState, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────── */

interface CategoryRule {
  id: number;
  category: string;
  keyword: string;
  match_type: string;
  priority: number;
  color: string | null;
  created_at: string;
}

interface TagRule {
  id: number;
  tag_name: string;
  pattern: string;
  match_type: string;
  priority: number;
  created_at: string;
}

type Tab = 'categories' | 'tags';
type MatchType = 'contains' | 'startsWith' | 'endsWith' | 'exact' | 'regex';

const MATCH_TYPES: MatchType[] = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'];

const MATCH_LABELS: Record<MatchType, string> = {
  contains: 'Contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  exact: 'Exact match',
  regex: 'Regex',
};

const PRESET_COLORS = [
  '#8B4513', '#FF6347', '#FF69B4', '#4169E1',
  '#DAA520', '#DC143C', '#228B22', '#FF1493',
  '#696969', '#A9A9A9', '#9B59B6', '#1ABC9C',
];

/* ─── Small reusable ─────────────────────────────────────── */

function Badge({ label, color }: { label: string; color?: string | null }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white"
      style={{ backgroundColor: color ?? '#8896A6' }}
    >
      {label}
    </span>
  );
}

function MatchTypePill({ value }: { value: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-mono bg-surface-muted text-text-secondary rounded">
      {value}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function SettingsClient() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── editing state ── */
  const [editingCat, setEditingCat] = useState<CategoryRule | null>(null);
  const [editingTag, setEditingTag] = useState<TagRule | null>(null);

  /* ── new-rule form state ── */
  const emptyCatForm = { category: '', keyword: '', match_type: 'contains' as MatchType, priority: 0, color: '#4169E1' };
  const emptyTagForm = { tag_name: '', pattern: '', match_type: 'contains' as MatchType, priority: 0 };

  const [catForm, setCatForm] = useState(emptyCatForm);
  const [tagForm, setTagForm] = useState(emptyTagForm);

  /* ─── Data fetching ──────────────────────────────────── */

  const fetchCategoryRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/categories', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load category rules');
      setCategoryRules(data.rules ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTagRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rules/tags', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load tag rules');
      setTagRules(data.rules ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategoryRules();
    fetchTagRules();
  }, [fetchCategoryRules, fetchTagRules]);

  /* ─── Helpers ──────────────────────────────────────────── */

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  /* ─── Category CRUD ─────────────────────────────────── */

  async function addCategoryRule() {
    if (!catForm.category.trim() || !catForm.keyword.trim()) return;
    setError(null);
    const res = await fetch('/api/rules/categories', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create rule'); return; }
    setCategoryRules(prev => [...prev, data]);
    setCatForm(emptyCatForm);
    flash('Category rule added');
  }

  async function updateCategoryRule(rule: CategoryRule) {
    setError(null);
    const res = await fetch('/api/rules/categories', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to update rule'); return; }
    setCategoryRules(prev => prev.map(r => r.id === rule.id ? rule : r));
    setEditingCat(null);
    flash('Category rule updated');
  }

  async function deleteCategoryRule(id: number) {
    if (!confirm('Delete this category rule?')) return;
    setError(null);
    const res = await fetch(`/api/rules/categories?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to delete'); return; }
    setCategoryRules(prev => prev.filter(r => r.id !== id));
    flash('Category rule deleted');
  }

  /* ─── Tag CRUD ────────────────────────────────────────── */

  async function addTagRule() {
    if (!tagForm.tag_name.trim() || !tagForm.pattern.trim()) return;
    setError(null);
    const res = await fetch('/api/rules/tags', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tagForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to create rule'); return; }
    setTagRules(prev => [...prev, data]);
    setTagForm(emptyTagForm);
    flash('Tag rule added');
  }

  async function updateTagRule(rule: TagRule) {
    setError(null);
    const res = await fetch('/api/rules/tags', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to update rule'); return; }
    setTagRules(prev => prev.map(r => r.id === rule.id ? rule : r));
    setEditingTag(null);
    flash('Tag rule updated');
  }

  async function deleteTagRule(id: number) {
    if (!confirm('Delete this tag rule?')) return;
    setError(null);
    const res = await fetch(`/api/rules/tags?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to delete'); return; }
    setTagRules(prev => prev.filter(r => r.id !== id));
    flash('Tag rule deleted');
  }

  /* ─── Seed defaults ─────────────────────────────────── */

  async function loadDefaults() {
    if (!confirm('This will load all built-in defaults (skipped if you already have rules). Continue?')) return;
    setError(null);
    const res = await fetch('/api/rules/seed', { method: 'POST', credentials: 'include' });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Seed failed'); return; }
    await Promise.all([fetchCategoryRules(), fetchTagRules()]);
    flash('Default rules loaded');
  }

  /* ─── Re-tag all transactions ───────────────────────── */

  async function retagAll() {
    if (!confirm('This will re-apply your current rules to ALL existing transactions (category + tags will be overwritten). Continue?')) return;
    setError(null);
    const res = await fetch('/api/rules/retag', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Re-tag failed'); return; }
    flash(`Re-tagged ${data.updated} transactions with your current rules`);
  }

  /* ─── Render ─────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Feedback banners */}
      {error && (
        <div className="px-4 py-3 bg-error-surface border border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-3 bg-accent-surface border border-accent text-accent text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Tab bar + Seed button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 p-1 bg-surface-muted rounded-lg">
          {(['categories', 'tags'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium transition-colors rounded-md ${
                tab === t
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'categories' ? `Categories (${categoryRules.length})` : `Tags (${tagRules.length})`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadDefaults}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Load defaults
        </button>

        <button
          type="button"
          onClick={retagAll}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Re-tag all transactions
        </button>
      </div>

      {/* ── Categories tab ─────────────────────────────── */}
      {tab === 'categories' && (
        <div className="space-y-6">
          {/* Add form */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Add category rule</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-text-tertiary mb-1">Category *</label>
                <input
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="e.g. Food"
                  value={catForm.category}
                  onChange={e => setCatForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-text-tertiary mb-1">Keyword *</label>
                <input
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="e.g. restaurant"
                  value={catForm.keyword}
                  onChange={e => setCatForm(f => ({ ...f, keyword: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Match type</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  value={catForm.match_type}
                  onChange={e => setCatForm(f => ({ ...f, match_type: e.target.value as MatchType }))}
                >
                  {MATCH_TYPES.map(m => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Priority</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  value={catForm.priority}
                  onChange={e => setCatForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-9 rounded border border-border cursor-pointer"
                    value={catForm.color}
                    onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.slice(0, 6).map(c => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        className="w-4 h-4 rounded-full border border-white ring-1 ring-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => setCatForm(f => ({ ...f, color: c }))}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addCategoryRule}
                  disabled={!catForm.category.trim() || !catForm.keyword.trim()}
                  className="w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:opacity-40"
                >
                  Add rule
                </button>
              </div>
            </div>
          </div>

          {/* Rules table */}
          {loading ? (
            <div className="text-sm text-text-tertiary text-center py-8">Loading…</div>
          ) : categoryRules.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary text-sm">
              No category rules yet. Click <span className="font-medium">&ldquo;Load defaults&rdquo;</span> to start with built-in rules.
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Keyword</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Color</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categoryRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-surface-muted/50 transition-colors">
                        {editingCat?.id === rule.id ? (
                          /* ── inline edit row ── */
                          <>
                            <td className="px-4 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingCat.category}
                                onChange={e => setEditingCat(r => r ? { ...r, category: e.target.value } : r)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingCat.keyword}
                                onChange={e => setEditingCat(r => r ? { ...r, keyword: e.target.value } : r)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingCat.match_type}
                                onChange={e => setEditingCat(r => r ? { ...r, match_type: e.target.value } : r)}
                              >
                                {MATCH_TYPES.map(m => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-20 px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingCat.priority}
                                onChange={e => setEditingCat(r => r ? { ...r, priority: parseInt(e.target.value) || 0 } : r)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="color"
                                className="h-7 w-9 rounded border border-border cursor-pointer"
                                value={editingCat.color ?? '#8896A6'}
                                onChange={e => setEditingCat(r => r ? { ...r, color: e.target.value } : r)}
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => updateCategoryRule(editingCat)} className="text-xs font-medium text-accent hover:text-accent-light transition-colors">Save</button>
                                <button type="button" onClick={() => setEditingCat(null)} className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors">Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* ── display row ── */
                          <>
                            <td className="px-4 py-3">
                              <Badge label={rule.category} color={rule.color} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-text-secondary">{rule.keyword}</td>
                            <td className="px-4 py-3"><MatchTypePill value={rule.match_type} /></td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{rule.priority}</td>
                            <td className="px-4 py-3">
                              {rule.color ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full border border-border inline-block" style={{ backgroundColor: rule.color }} />
                                  <span className="text-xs font-mono text-text-tertiary">{rule.color}</span>
                                </span>
                              ) : <span className="text-text-tertiary text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setEditingCat(rule)} className="text-xs font-medium text-primary hover:text-primary-light transition-colors">Edit</button>
                                <button type="button" onClick={() => deleteCategoryRule(rule.id)} className="text-xs font-medium text-error hover:text-error-light transition-colors">Delete</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tags tab ──────────────────────────────────────── */}
      {tab === 'tags' && (
        <div className="space-y-6">
          {/* Explainer */}
          <div className="px-4 py-3 bg-primary-surface border border-primary/20 rounded-lg text-sm text-text-secondary">
            Tag rules scan the transaction description for a <span className="font-medium">pattern</span> and attach a <span className="font-medium">tag label</span> automatically on import. Tags are always stored in uppercase.
          </div>

          {/* Add form */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold text-text-primary">Add tag rule</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Tag name *</label>
                <input
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary uppercase"
                  placeholder="e.g. GROCERIES"
                  value={tagForm.tag_name}
                  onChange={e => setTagForm(f => ({ ...f, tag_name: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Pattern *</label>
                <input
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="e.g. swiggy"
                  value={tagForm.pattern}
                  onChange={e => setTagForm(f => ({ ...f, pattern: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Match type</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  value={tagForm.match_type}
                  onChange={e => setTagForm(f => ({ ...f, match_type: e.target.value as MatchType }))}
                >
                  {MATCH_TYPES.map(m => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-1">Priority</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 text-sm bg-surface-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                    value={tagForm.priority}
                    onChange={e => setTagForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addTagRule}
                  disabled={!tagForm.tag_name.trim() || !tagForm.pattern.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Rules table */}
          {loading ? (
            <div className="text-sm text-text-tertiary text-center py-8">Loading…</div>
          ) : tagRules.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary text-sm">
              No tag rules yet. Click <span className="font-medium">&ldquo;Load defaults&rdquo;</span> to start with built-in rules.
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Tag</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Pattern</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Match</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tagRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-surface-muted/50 transition-colors">
                        {editingTag?.id === rule.id ? (
                          /* ── inline edit ── */
                          <>
                            <td className="px-4 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary uppercase"
                                value={editingTag.tag_name}
                                onChange={e => setEditingTag(r => r ? { ...r, tag_name: e.target.value.toUpperCase() } : r)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingTag.pattern}
                                onChange={e => setEditingTag(r => r ? { ...r, pattern: e.target.value } : r)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                className="px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingTag.match_type}
                                onChange={e => setEditingTag(r => r ? { ...r, match_type: e.target.value } : r)}
                              >
                                {MATCH_TYPES.map(m => <option key={m} value={m}>{MATCH_LABELS[m]}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-20 px-2 py-1 text-sm bg-surface-muted border border-border rounded focus:outline-none focus:border-primary"
                                value={editingTag.priority}
                                onChange={e => setEditingTag(r => r ? { ...r, priority: parseInt(e.target.value) || 0 } : r)}
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => updateTagRule(editingTag)} className="text-xs font-medium text-accent hover:text-accent-light transition-colors">Save</button>
                                <button type="button" onClick={() => setEditingTag(null)} className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors">Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* ── display ── */
                          <>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-primary-surface text-primary rounded-full">
                                {rule.tag_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-text-secondary">{rule.pattern}</td>
                            <td className="px-4 py-3"><MatchTypePill value={rule.match_type} /></td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{rule.priority}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setEditingTag(rule)} className="text-xs font-medium text-primary hover:text-primary-light transition-colors">Edit</button>
                                <button type="button" onClick={() => deleteTagRule(rule.id)} className="text-xs font-medium text-error hover:text-error-light transition-colors">Delete</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
