import { Metadata } from 'next';
import SubscriptionTracker from '@/components/SubscriptionTracker';

export const metadata: Metadata = {
  title: 'Subscriptions — Monark',
  description: 'Track all your subscriptions by payment method.',
};

export default function SubscriptionsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Subscriptions</h1>
        <p className="text-sm text-text-secondary mt-1">
          See every recurring charge, which card or UPI pays for it, and when you'll next be billed.
        </p>
      </div>
      <SubscriptionTracker />
    </main>
  );
}
