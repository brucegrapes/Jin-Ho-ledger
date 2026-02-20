"use client";
import dynamic from 'next/dynamic';

const ExcelUpload = dynamic(() => import('../components/ExcelUpload'), { ssr: false });

export default function UploadClient() {
  return (
    <section className="w-full">
      <h2 className="text-2xl font-semibold mb-6">📤 Upload Bank Statement</h2>
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-6">
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Upload your bank statement in Excel or CSV format. The system will automatically parse and categorize your transactions.
        </p>
        <ExcelUpload />
      </div>
    </section>
  );
}
