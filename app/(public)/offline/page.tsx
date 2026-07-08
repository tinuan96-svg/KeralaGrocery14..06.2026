import type { Metadata } from 'next';
import OfflineRetryButton from '@/components/layout/OfflineRetryButton';

export const metadata: Metadata = {
  title: 'No Internet Connection | Kerala Groceries UK',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0B5D3B] flex items-center justify-center p-6">
      <div className="bg-white rounded-[24px] p-10 md:p-8 text-center max-w-[360px] w-full shadow-2xl">
        <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0B5D3B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h1 className="text-[22px] font-bold text-[#111827] mb-2">No Internet Connection</h1>
        <p className="text-[15px] text-[#6B7280] leading-relaxed mb-7">
          Please check your Wi-Fi or mobile data connection
          and try again to continue shopping.
        </p>

        <OfflineRetryButton />

        <p className="text-[13px] text-[#9CA3AF] mt-6 leading-tight">
          <strong className="text-[#0B5D3B]">Kerala Groceries UK</strong>
          <br />Authentic Kerala &amp; Indian Groceries
        </p>
      </div>
    </div>
  );
}
