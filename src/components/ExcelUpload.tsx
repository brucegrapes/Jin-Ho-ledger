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
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>🔒 Encryption Enabled:</strong> All sensitive data (description & reference numbers) will be automatically encrypted and stored securely.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <input 
          type="file" 
          accept=".csv,.xlsx,.xls" 
          onChange={handleChange}
          disabled={isLoading}
          className="border border-gray-300 p-2 rounded dark:border-gray-600 dark:bg-zinc-800 dark:text-white"
        />

        <button 
          onClick={handleUpload} 
          disabled={!file || isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Upload & Process'}
        </button>
      </div>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {message}
        </div>
      )}
      
      {response && response.success && (
        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded text-sm">
          <p className="font-semibold">📊 Import Summary</p>
          <p>File: {response.fileName}</p>
          {response.count && <p>Transactions: {response.count}</p>}
          {response.inserted && <p>Inserted: {response.inserted}</p>}
          {response.skipped ? <p>Skipped (duplicates): {response.skipped}</p> : null}
          {response.jsonFile && <p>Parsed JSON: {response.jsonFile}</p>}
          <p className="mt-2">🔐 All sensitive data encrypted with server key</p>
        </div>
      )}
    </div>
  );
}
