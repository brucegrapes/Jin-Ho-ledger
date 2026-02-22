import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Security Works — MyLedger',
  description: 'Where your data is stored, what we cannot access, and what to do if you lose access.',
};

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="trust-card p-7">
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary-surface"
          style={{ borderRadius: 'var(--radius-sm)' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary mb-3">{title}</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-light last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      <div>
        <span className="font-medium text-text-primary">{label}: </span>
        <span className="text-text-secondary">{value}</span>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-14 sm:px-8">

        {/* Header */}
        <div className="mb-10">
          <div
            className="w-12 h-12 bg-primary-surface flex items-center justify-center mb-5"
            style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
          >
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight mb-2">
            How Security Works
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Plain language. No jargon. Here is exactly what happens to your data — and what we
            cannot do with it.
          </p>
        </div>

        <div className="space-y-4">

          {/* Where data is stored */}
          <Section
            title="Where your data lives"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            }
          >
            <p>
              Your transactions and budgets are stored in a database <strong className="text-text-primary">on this server only</strong> — not
              in any third-party cloud, analytics platform, or external service.
            </p>
            <div
              className="bg-surface-muted border border-border-light mt-4"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Fact label="Database" value="Local SQLite file on the server" />
              <Fact label="Cloud sync" value="None — data never leaves this server" />
              <Fact label="Third-party services" value="None — no analytics, no tracking" />
              <Fact label="Backups" value="Managed only by whoever runs this server" />
            </div>
          </Section>

          {/* What is encrypted */}
          <Section
            title="What is encrypted"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          >
            <p>
              Before your statement is written to the database, the sensitive fields are
              encrypted with a key that is unique to your account. The raw text is never stored.
            </p>
            <div
              className="bg-surface-muted border border-border-light mt-4"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Fact label="Transaction descriptions" value="Encrypted (AES — unique key per user)" />
              <Fact label="Reference numbers" value="Encrypted (AES — unique key per user)" />
              <Fact label="Amounts, dates, categories" value="Stored as-is for calculations" />
              <Fact label="Your WebAuthn credential" value="Never stored — only the public key is saved" />
            </div>
            <p className="mt-3">
              Your per-user encryption key is itself encrypted with a server-level master key, so
              even direct database access cannot reveal your spending descriptions.
            </p>
          </Section>

          {/* What we cannot see */}
          <Section
            title="What we cannot see"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            }
          >
            <p>
              We cannot read your private transaction descriptions or reference numbers —
              they are encrypted and only decryptable with your account key.
            </p>
            <div
              className="bg-accent-surface border border-accent/15 p-4 mt-3"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <p className="font-medium text-accent text-sm flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Your data is encrypted before it leaves your device. We cannot see your spending.
              </p>
            </div>
            <p className="mt-3">
              No employee, script, or automated process can read the details of your transactions
              without your account key — which only you can obtain by authenticating.
            </p>
          </Section>

          {/* Authentication */}
          <Section
            title="How you sign in (WebAuthn)"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          >
            <p>
              MyLedger uses <strong className="text-text-primary">WebAuthn / FIDO2</strong> — the same
              passwordless standard used by Google, Apple, and major banks. You authenticate with
              your device&apos;s biometrics (fingerprint, Face ID) or a hardware security key.
            </p>
            <div
              className="bg-surface-muted border border-border-light mt-4"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Fact label="Passwords" value="None — you never create one" />
              <Fact label="What is stored" value="Only your public key (useless without your device)" />
              <Fact label="Phishing resistant" value="Yes — credentials are bound to this domain" />
              <Fact label="Standard" value="FIDO2 / WebAuthn (W3C & FIDO Alliance)" />
            </div>
          </Section>

          {/* What happens if you lose access */}
          <Section
            title="What happens if you lose access"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            }
          >
            <p>
              Because there is no password and your credential is tied to your device, losing
              access to that device means losing the ability to authenticate.
            </p>
            <div
              className="bg-warning-surface border border-warning/20 p-4 mt-3"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <p className="text-warning text-sm font-medium flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                There is currently no self-service account recovery. If you lose your device,
                contact whoever administers this server to reset your credential.
              </p>
            </div>
            <p className="mt-3">
              <strong className="text-text-primary">What you can do now:</strong> Register a second
              device as a backup credential while you still have access. The more devices registered,
              the less likely you are to be locked out.
            </p>
            <div className="mt-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors interactive-lift"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register a backup device
              </Link>
            </div>
          </Section>

          {/* What data you own */}
          <Section
            title="Your data is yours"
            icon={
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <p>
              You can delete everything at any time from the dashboard. When you delete your data,
              it is removed permanently from the database — there is no soft-delete or hidden backup
              on our side.
            </p>
            <div
              className="bg-surface-muted border border-border-light mt-4"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Fact label="Delete all data" value="Available from the dashboard — instant and permanent" />
              <Fact label="Data retention" value="Zero — we keep nothing after deletion" />
              <Fact label="Who owns your data" value="You. Always." />
            </div>
          </Section>

        </div>

        {/* Footer reassurance */}
        <div className="mt-10 pt-8 border-t border-border text-center space-y-2">
          <p className="text-sm text-text-tertiary">
            Questions about how your data is handled? This is an open-source, self-hosted app —
            you can inspect every line of code.
          </p>
          <Link href="/" className="text-sm text-primary font-medium hover:text-primary-light transition-colors">
            Back to dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}
