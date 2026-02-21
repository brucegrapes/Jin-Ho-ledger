"use client";

import { useState, useEffect } from 'react';
import { 
  generateEncryptionKey, 
  isEncryptionKeyValid, 
  getKeyExpiryMinutes,
  clearEncryptionKey 
} from '@/utils/encryption';

export default function EncryptionKeyManager() {
  const [hasKey, setHasKey] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkKeyStatus = () => {
    setHasKey(isEncryptionKeyValid());
    setExpiryMinutes(getKeyExpiryMinutes());
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      await generateEncryptionKey();
      setHasKey(true);
      setExpiryMinutes(8 * 60); // 8 hours in minutes
      alert('Encryption key generated successfully! It will expire in 8 hours.');
    } catch (err) {
      alert(`Error generating key: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearKey = () => {
    if (confirm('Are you sure? You will need to generate a new key to view encrypted data.')) {
      clearEncryptionKey();
      setHasKey(false);
      setExpiryMinutes(0);
    }
  };

  const formatExpiryTime = (minutes: number): string => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md border border-amber-200 dark:border-amber-900">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">🔐 Encryption Status</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Your bank data is encrypted and stored securely. Generate an encryption key to enable access.
          </p>
          
          {hasKey ? (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-3">
              <p className="text-green-800 dark:text-green-200 font-medium text-sm">
                ✅ Encryption Enabled
              </p>
              <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                Key expires in: <span className="font-mono font-bold">{formatExpiryTime(expiryMinutes)}</span>
              </p>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-red-800 dark:text-red-200 font-medium text-sm">
                ❌ No Encryption Key
              </p>
              <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                Generate a key to access your encrypted data
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleGenerateKey}
            disabled={isGenerating || hasKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isGenerating ? 'Generating...' : 'Generate Key'}
          </button>
          
          {hasKey && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Clear Key
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <details className="cursor-pointer">
          <summary className="text-sm text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-gray-200">
            How it works
          </summary>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              • Your encryption key is stored only in this browser using localStorage
            </p>
            <p>
              • Data is encrypted using AES-256-GCM (military-grade encryption)
            </p>
            <p>
              • Keys expire after 8 hours for security (you can generate a new one anytime)
            </p>
            <p>
              • Only your browser can decrypt your data - not even our servers can access it
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
