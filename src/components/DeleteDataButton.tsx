'use client';

import { useState } from 'react';

type DeleteMode = 'transactions' | 'all';

const MODE_CONFIG: Record<DeleteMode, { label: string; endpoint: string; description: string }> = {
  transactions: {
    label: 'Delete Transactions',
    endpoint: '/api/delete-transactions',
    description:
      'This will permanently delete all your transactions. Your budgets will remain intact. This action cannot be undone.',
  },
  all: {
    label: 'Delete All Data',
    endpoint: '/api/delete-all',
    description: 'This will permanently delete all your transactions and budgets. This action cannot be undone.',
  },
};

export default function DeleteDataButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [mode, setMode] = useState<DeleteMode | null>(null);
  const [message, setMessage] = useState('');

  const openConfirm = (m: DeleteMode) => {
    setMessage('');
    setMode(m);
  };

  const handleDelete = async () => {
    if (!mode) return;
    setIsDeleting(true);
    setMessage('');
    try {
      const res = await fetch(MODE_CONFIG[mode].endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message ?? 'Deleted successfully');
        setMode(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch {
      setMessage('Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="py-2 space-y-4">
      {/* ── Delete Transactions Only ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-error flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Delete Transactions
          </h3>
          <p className="text-sm text-text-tertiary mt-1">Permanently delete all transactions, keeping budgets intact</p>
        </div>
        <button
          onClick={() => openConfirm('transactions')}
          disabled={isDeleting}
          className="px-4 py-2 border border-error/30 text-error text-sm font-medium hover:bg-error-surface transition-colors disabled:opacity-50"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          Delete Transactions
        </button>
      </div>

      {/* ── Delete All Data ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-error flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Danger Zone
          </h3>
          <p className="text-sm text-text-tertiary mt-1">Permanently delete all transactions and budgets</p>
        </div>
        <button
          onClick={() => openConfirm('all')}
          disabled={isDeleting}
          className="px-4 py-2 border border-error/30 text-error text-sm font-medium hover:bg-error-surface transition-colors disabled:opacity-50"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {isDeleting ? 'Deleting...' : 'Delete All Data'}
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 text-sm font-medium p-3 ${message.startsWith('Error') || message === 'Failed to delete data' ? 'bg-error-surface text-error' : 'bg-accent-surface text-accent'}`}
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {message}
        </div>
      )}

      {/* ── Shared confirmation modal ── */}
      {mode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface p-6 max-w-sm mx-4" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-error-surface flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Confirm deletion</h2>
            </div>
            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              {MODE_CONFIG[mode].description}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMode(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-border text-text-secondary text-sm font-medium hover:bg-surface-muted transition-colors disabled:opacity-50"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-error text-white text-sm font-medium hover:bg-error-light transition-colors disabled:opacity-50"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {isDeleting ? 'Deleting...' : MODE_CONFIG[mode].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
