import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  robots: { index: false, follow: false },
};

export default function CompleteProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
