// In static export, we don't use force-dynamic
// export const dynamic = 'force-dynamic';

export default function HealthCheck() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing',
    NODE_ENV: process.env.NODE_ENV || 'unknown',
  };

  const allEnvVarsSet = Object.entries(envVars)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC'))
    .every(([_, value]) => value === '✓ Set');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-lg p-6 mb-6 ${allEnvVarsSet ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          <h1 className="text-2xl font-bold mb-2">
            {allEnvVarsSet ? '✓ System Healthy' : '✗ Configuration Issues'}
          </h1>
          <p className="text-gray-600">
            {allEnvVarsSet
              ? 'All required environment variables are configured.'
              : 'Some environment variables are missing. Check Netlify settings.'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-mono text-sm">{key}</span>
                <span className={value.startsWith('✓') ? 'text-green-600' : 'text-red-600'}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
          <p className="text-sm text-blue-800">
            If you see missing environment variables, add them in Netlify:
            <br />
            Site settings → Environment variables → Add variable
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-green-600 hover:underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
