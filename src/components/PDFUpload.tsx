import React, { useRef } from 'react';

interface PDFUploadProps {
  onFileSelected: (file: File) => void;
}

const PDFUpload: React.FC<PDFUploadProps> = ({ onFileSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border bg-surface-muted" style={{ borderRadius: 'var(--radius-md)' }}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mb-3 text-sm text-text-secondary"
      />
      <button
        type="button"
        className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors interactive-lift"
        style={{ borderRadius: 'var(--radius-sm)' }}
        onClick={() => inputRef.current?.click()}
      >
        Upload PDF
      </button>
    </div>
  );
};

export default PDFUpload;
