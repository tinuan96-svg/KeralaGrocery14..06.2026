import type { Metadata } from 'next';
import OfflineRetryButton from '@/components/layout/OfflineRetryButton';

export const metadata: Metadata = {
  title: 'No Internet Connection | Kerala Groceries UK',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0B5D3B" />
        <title>No Internet Connection | Kerala Groceries UK</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0B5D3B;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .card {
            background: #fff;
            border-radius: 24px;
            padding: 40px 32px;
            text-align: center;
            max-width: 360px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          }
          .icon {
            width: 80px;
            height: 80px;
            background: #E8F5EE;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          h1 {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 15px;
            color: #6B7280;
            line-height: 1.6;
            margin-bottom: 28px;
          }
          .logo-text {
            font-size: 13px;
            color: #9CA3AF;
            margin-top: 24px;
          }
          .logo-text strong { color: #0B5D3B; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="icon">
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

          <h1>No Internet Connection</h1>
          <p className="subtitle">
            Please check your Wi-Fi or mobile data connection
            and try again to continue shopping.
          </p>

          <OfflineRetryButton />

          <p className="logo-text">
            <strong>Kerala Groceries UK</strong>
            <br />Authentic Kerala &amp; Indian Groceries
          </p>
        </div>
      </body>
    </html>
  );
}
