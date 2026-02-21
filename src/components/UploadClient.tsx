"use client";
import dynamic from 'next/dynamic';

const ExcelUpload = dynamic(() => import('../components/ExcelUpload'), { ssr: false });

export default function UploadClient() {
  return (
    <section className="w-full">
      <h2 className="text-2xl font-semibold mb-6">📤 Upload Bank Statement</h2>
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-6 space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900 rounded p-4 border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>🔐 Security Notice:</strong> All your bank data is automatically encrypted on the server before being stored in the database. No sensitive data is stored in plaintext.
          </p>
        </div>
        
        <p className="text-gray-700 dark:text-gray-300">
          Upload your bank statement in Excel or CSV format. The system will automatically parse, categorize, and encrypt your transactions.
        </p>
        
        <ExcelUpload />
      </div>
    </section>
  );
}
