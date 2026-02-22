'use client';
import { useState } from 'react';

interface UploadResponse {
  success: boolean;
  count?: number;
  inserted?: number;
  skipped?: number;
  fileName: string;
  jsonFile?: string;
  error?: string;
}

export default function ExcelUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [bankType, setBankType] = useState<string>('hdfc');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
      setResponse(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankType', bankType);
    setIsLoading(true);
    setMessage('Uploading and processing...');
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setResponse(data);
        setMessage(`✅ Successfully imported ${data.count} transactions from ${data.fileName}`);
        setFile(null);
      } else {
        setMessage(`❌ ${data.error || 'Upload failed'}`);
      }
    } catch (err) {
      setMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-accent-surface border border-accent/15 p-4 flex items-start gap-3" style={{ borderRadius: 'var(--radius-sm)' }}>
        <svg className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-accent leading-relaxed">
          <strong>Encryption Enabled:</strong> All sensitive data (description & reference numbers) will be automatically encrypted and stored securely.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Bank</label>
          <select
            value={bankType}
            onChange={(e) => setBankType(e.target.value)}
            disabled={isLoading}
            className="border border-border bg-surface text-text-primary p-2.5 text-sm appearance-none cursor-pointer"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <option value="hdfc">HDFC Bank</option>
            <option value="indian_bank">Indian Bank</option>
            <option value="iob">Indian Overseas Bank (IOB)</option>
          </select>
        </div>

        <input 
          type="file" 
          accept=".csv,.xlsx,.xls" 
          onChange={handleChange}
          disabled={isLoading}
          className="border border-border bg-surface text-text-primary p-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-primary-surface file:text-primary hover:file:bg-primary/10"
          style={{ borderRadius: 'var(--radius-sm)' }}
        />

        <button 
          onClick={handleUpload} 
          disabled={!file || isLoading}
          className="bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary-light disabled:bg-surface-muted disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors interactive-lift"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {isLoading ? 'Processing...' : 'Upload & Process'}
        </button>
      </div>
      
      {message && (
        <div className={`p-3 text-sm font-medium flex items-center gap-2 ${message.includes('Successfully') ? 'bg-accent-surface text-accent border border-accent/15' : 'bg-error-surface text-error border border-error/15'}`} style={{ borderRadius: 'var(--radius-sm)' }}>
          {message.includes('Successfully') ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.replace(/[✅❌] /, '')}
        </div>
      )}
      
      {response && response.success && (
        <div className="bg-primary-surface border border-primary/15 p-4 text-sm space-y-1" style={{ borderRadius: 'var(--radius-sm)' }}>
          <p className="font-semibold text-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Import Summary
          </p>
          <p className="text-text-secondary">File: {response.fileName}</p>
          {response.count && <p className="text-text-secondary tabular-nums">Transactions: {response.count}</p>}
          {response.inserted && <p className="text-text-secondary tabular-nums">Inserted: {response.inserted}</p>}
          {response.skipped ? <p className="text-text-secondary tabular-nums">Skipped (duplicates): {response.skipped}</p> : null}
          {response.jsonFile && <p className="text-text-secondary">Parsed JSON: {response.jsonFile}</p>}
          <p className="mt-2 text-primary font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            All sensitive data encrypted
          </p>
        </div>
      )}
    </div>
  );
}
