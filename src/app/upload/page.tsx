import UploadClient from '@/components/UploadClient';

export default function UploadPage() {
  return (
    <main className="w-full min-h-screen bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <UploadClient />
      </div>
    </main>
  );
}
