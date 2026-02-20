'use client';

import { useState } from 'react';

export default function DeleteDataButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage('');
    try {
      const res = await fetch('/api/delete-all', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ All data deleted successfully');
        setShowConfirm(false);
        // Reload page after 1 second
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage('❌ Error deleting data: ' + data.error);
      }
    } catch (err) {
      setMessage('❌ Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="py-4 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-black dark:text-white">Danger Zone</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Delete all transactions and budgets data</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete All Data'}
        </button>
      </div>

      {message && (
        <div className="mt-3 text-sm font-medium">
          {message}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h2 className="text-lg font-bold text-black dark:text-white mb-2">Are you sure?</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              This will permanently delete all your transactions and budgets. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
