'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import {
  Settings,
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettings {
  id: string;
  sms_enabled: boolean;
  order_confirmed: boolean;
  processing: boolean;
  packed: boolean;
  shipped: boolean;
  out_for_delivery: boolean;
  delivered: boolean;
  cancelled: boolean;
  refunded: boolean;
  payment_failed: boolean;
}

interface SMSLog {
  id: string;
  order_id: string;
  customer_id: string;
  phone_number: string;
  message: string;
  twilio_sid: string | null;
  status: string;
  error: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
  };
}

export default function SMSNotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [retryingLog, setRetryingLog] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();

      // Load settings
      const { data: settingsData } = await supabase
        .from('notification_settings')
        .select('*')
        .single();

      if (settingsData) setSettings(settingsData);

      // Load logs using the view for better searching
      let query = supabase
        .from('sms_logs_with_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }

      if (endDate) {
        // Add one day to end date to include the whole day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query = query.lt('created_at', end.toISOString());
      }

      if (searchQuery) {
        query = query.or(`phone_number.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%,order_number.ilike.%${searchQuery}%,order_customer_name.ilike.%${searchQuery}%`);
      }

      const { data: logData } = await query.limit(100);

      if (logData) {
        // Transform the data to match the expected interface if necessary
        const transformedLogs = logData.map(log => ({
          ...log,
          orders: {
            order_number: log.order_number,
            customer_name: log.order_customer_name
          }
        }));
        setLogs(transformedLogs as any);
      }
    } catch (err) {
      console.error('Error loading SMS data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSetting = async (field: keyof NotificationSettings) => {
    if (!settings) return;
    const newValue = !settings[field];
    const supabase = getSupabase();

    // Optimistic update
    const previousSettings = { ...settings };
    setSettings({ ...settings, [field]: newValue });

    const { error } = await supabase
      .from('notification_settings')
      .update({ [field]: newValue, updated_at: new Date().toISOString() })
      .eq('id', settings.id);

    if (error) {
      toast.error(`Failed to update setting: ${error.message}`);
      setSettings(previousSettings);
    } else {
      toast.success(`${field.replace('_', ' ')} updated`);
    }
  };

  const retrySMS = async (log: SMSLog) => {
    setRetryingLog(log.id);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-order-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderId: log.order_id })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('SMS retried successfully');
        loadData();
      } else {
        toast.error(`Retry failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Retry error:', err);
      toast.error('An error occurred during retry');
    } finally {
      setRetryingLog(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          SMS Notification Management
        </h1>
        <p className="text-gray-400 mt-1">
          Configure automated SMS triggers and monitor delivery logs.
        </p>
      </div>

      {/* Settings Grid */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Notification Settings
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Global Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 col-span-full">
              <div>
                <h3 className="text-white font-bold">Enable SMS Notifications</h3>
                <p className="text-xs text-gray-400">Master switch for all automated SMS messages</p>
              </div>
              <button
                onClick={() => toggleSetting('sms_enabled')}
                className="transition-transform active:scale-95"
              >
                {settings?.sms_enabled ? (
                  <ToggleRight className="w-10 h-10 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-600" />
                )}
              </button>
            </div>

            {/* Status Switches */}
            {[
              { field: 'order_confirmed', label: 'Order Confirmed' },
              { field: 'processing', label: 'Processing' },
              { field: 'packed', label: 'Packed' },
              { field: 'shipped', label: 'Shipped' },
              { field: 'out_for_delivery', label: 'Out for Delivery' },
              { field: 'delivered', label: 'Delivered' },
              { field: 'cancelled', label: 'Cancelled' },
              { field: 'refunded', label: 'Refunded' },
              { field: 'payment_failed', label: 'Payment Failed' },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-300 font-medium">{label}</span>
                <button
                  onClick={() => toggleSetting(field as any)}
                  disabled={!settings?.sms_enabled}
                  className="disabled:opacity-30 transition-transform active:scale-95"
                >
                  {settings?.[field as keyof NotificationSettings] ? (
                    <ToggleRight className="w-8 h-8 text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-700" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logs Table */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4" />
            SMS History
          </h2>

          <div className="flex flex-1 max-w-2xl gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search phone or message..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>

            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none"
                title="Start Date"
              />
              <span className="text-gray-600">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none"
                title="End Date"
              />
            </div>

            <button
              onClick={loadData}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/30 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Order / Customer</th>
                <th className="px-4 py-3 font-bold">Phone / Message</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-white">
                      {log.orders?.order_number || 'N/A'}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {log.orders?.customer_name || 'Guest'}
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-md">
                    <div className="text-xs font-mono text-blue-400 mb-1">{log.phone_number}</div>
                    <p className="text-xs text-gray-300 line-clamp-2" title={log.message}>
                      {log.message}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {log.status === 'sent' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-bold uppercase ${log.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {log.status}
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-[10px] text-red-500 mt-1 font-mono max-w-xs truncate" title={log.error}>
                        {log.error}
                      </p>
                    )}
                    {log.twilio_sid && (
                      <div className="text-[9px] text-gray-600 font-mono mt-1">SID: {log.twilio_sid}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {log.status === 'failed' && (
                      <button
                        onClick={() => retrySMS(log)}
                        disabled={retryingLog === log.id}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold"
                      >
                        {retryingLog === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No SMS logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
