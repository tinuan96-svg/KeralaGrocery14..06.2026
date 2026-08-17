'use client';

import { useState, useEffect } from 'react';
import { Users, RefreshCw, CircleUser as UserCircle, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  created_at: string;
}

function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, name, phone, city, postcode, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-500" />
            <h1 className="text-base font-bold text-white">Customers</h1>
            {!loading && (
              <span className="text-xs font-semibold bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {customers.length}
              </span>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="px-6 pb-3">
          <input
            type="text"
            placeholder="Search by name, email, phone, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skel key={i} className="h-20 w-full" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <UserCircle className="w-12 h-12 text-gray-700" />
            <p className="text-sm font-semibold text-gray-500">
              {search ? 'No customers match your search' : 'No customers yet'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {filtered.map(c => (
                <div key={c.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-white">{c.name || 'Unknown'}</p>
                    {c.email && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {c.email}
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {c.phone}
                      </p>
                    )}
                    {(c.city || c.postcode) && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-600">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {[c.city, c.postcode].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
