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
    <div className="flex flex-col items-center justify-center p-4 border rounded-md">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mb-2"
      />
      <button
        type="button"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => inputRef.current?.click()}
      >
        Upload PDF
      </button>
    </div>
  );
};

export default PDFUpload;
