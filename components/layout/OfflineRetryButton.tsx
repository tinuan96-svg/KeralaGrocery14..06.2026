'use client';

export default function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '8px',
        background:     '#0B5D3B',
        color:          '#fff',
        fontSize:       '15px',
        fontWeight:     600,
        padding:        '12px 28px',
        borderRadius:   '50px',
        border:         'none',
        cursor:         'pointer',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
      </svg>
      Try Again
    </button>
  );
}
