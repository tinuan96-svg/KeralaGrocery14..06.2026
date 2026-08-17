import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Failed',
  robots: { index: false, follow: false },
};

export default function OrderFailedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
