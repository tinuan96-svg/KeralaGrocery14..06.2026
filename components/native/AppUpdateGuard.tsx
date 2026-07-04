'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface VersionConfig {
  min_version: string;
  current_version: string;
  force_update: boolean;
  update_url: string;
}

export function AppUpdateGuard() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [config, setConfig] = useState<VersionConfig | null>(null);

  useEffect(() => {
    // Only run this check in the native app
    const ua = navigator.userAgent;
    const isNative = ua.includes('KeralaGroceryApp');
    if (!isNative) return;

    // Detect version from UA: "KeralaGroceryApp/1.0.0"
    const versionMatch = ua.match(/KeralaGroceryApp\/([\d.]+)/);
    const currentAppVersion = versionMatch ? versionMatch[1] : '0.0.0';

    async function checkVersion() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('id', 'ios_version_config')
        .single();

      if (data?.value) {
        const vConfig = data.value as VersionConfig;
        setConfig(vConfig);

        // Simple version comparison (works for 1.0.0 format)
        if (vConfig.force_update && currentAppVersion < vConfig.min_version) {
          setShowUpdateModal(true);
        }
      }
    }

    checkVersion();
  }, []);

  if (!showUpdateModal) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Required</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          To continue using Kerala Grocery, please update to the latest version. It only takes a minute!
        </p>

        <a
          href={config?.update_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 px-6 bg-[#0B5D3B] hover:bg-[#094d2e] text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-green-900/20"
        >
          Update Now
        </a>
      </div>
    </div>
  );
}
