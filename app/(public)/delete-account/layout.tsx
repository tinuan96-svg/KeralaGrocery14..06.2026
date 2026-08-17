import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request Account Deletion | Kerala Groceries UK',
  description:
    'Request deletion of your Kerala Groceries account and personal data. We process all GDPR erasure requests within 30 days.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Request Account Deletion | Kerala Groceries UK',
    description: 'Submit a GDPR right-to-erasure request for your Kerala Groceries account.',
    url: 'https://keralagrocery.com/delete-account',
    siteName: 'Kerala Groceries UK',
    type: 'website',
  },
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
