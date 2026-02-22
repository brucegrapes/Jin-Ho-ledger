"use client";
import dynamic from 'next/dynamic';

const ExcelUpload = dynamic(() => import('../components/ExcelUpload'), { ssr: false });

export default function UploadClient() {
  return (
    <section className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Bank Statement
          </h2>
          <p className="text-sm text-text-tertiary mt-1">Excel or CSV format supported</p>
        </div>
        <span className="secure-badge">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Your data is encrypted before it leaves your device
        </span>
      </div>

      <div className="trust-card p-6 space-y-5">
        <div className="bg-primary-surface border border-primary/15 p-4 flex items-start gap-3" style={{ borderRadius: 'var(--radius-sm)' }}>
          <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-primary leading-relaxed">
            <strong>Security:</strong> All bank data is automatically encrypted on the server before storage. No sensitive data is stored in plaintext.
          </p>
        </div>
        
        <p className="text-sm text-text-secondary leading-relaxed">
          Upload your bank statement and the system will automatically parse, categorize, and encrypt your transactions.
        </p>
        
        <ExcelUpload />
      </div>
    </section>
  );
}
