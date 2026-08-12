export default function PerformanceHead() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      <meta name="theme-color" content="#0B5D3B" />

      {/* Preconnect to critical origins */}
      <link rel="preconnect" href="https://keralagrocery.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://keralagrocery.com" />
      <link rel="preconnect" href="https://vnqjqopzoeunojomssmq.supabase.co" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://vnqjqopzoeunojomssmq.supabase.co" />
      <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />

      {/* Force rendering of basic styles even if globals.css takes a moment */}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { background-color: #f4faf6; margin: 0; padding: 0; }
        .is-native.is-ios .kg-web-header { padding-top: env(safe-area-inset-top, 0px); }
      `}} />
    </>
  );
}
