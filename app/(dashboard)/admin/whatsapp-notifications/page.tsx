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
  ExternalLink,
  Save,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface TwilioTemplate {
  id: string;
  name: string;
  content_sid: string;
  channel: string;
  active: boolean;
  created_at: string;
}

interface MessageLog {
  id: string;
  order_id: string;
  customer_id: string;
  template_name: string;
  twilio_sid: string | null;
  status: string;
  error: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    customer_name: string;
  };
}

export default function WhatsAppNotificationsPage() {
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [retryingLog, setRetryingLog] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    // Load templates
    const { data: tplData } = await supabase
      .from('twilio_templates')
      .select('*')
      .order('name');

    if (tplData) setTemplates(tplData);

    // Load recent logs
    const { data: logData } = await supabase
      .from('message_logs')
      .select('*, orders(order_number, customer_name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (logData) setLogs(logData as any);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    const supabase = getSupabase();

    let query = supabase
      .from('message_logs')
      .select('*, orders(order_number, customer_name)')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      // Search by order number or customer name via joined table
      // This is a bit tricky with Supabase's direct filters on joined tables in some versions
      // We can use or filter if we have the right setup, or search by ID if it's a UUID
      query = query.or(`order_id.eq.${searchQuery},twilio_sid.eq.${searchQuery}`, { foreignTable: 'message_logs' });
      // For more complex search (like by order_number), we might need a custom function or RPC
    }

    const { data } = await query.limit(50);
    if (data) setLogs(data as any);
    setSearching(false);
  };

  const toggleTemplate = async (template: TwilioTemplate) => {
    setSavingTemplate(template.id);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('twilio_templates')
      .update({ active: !template.active })
      .eq('id', template.id);

    if (!error) {
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, active: !t.active } : t));
    }
    setSavingTemplate(null);
  };

  const updateContentSid = async (templateId: string, newSid: string) => {
    setSavingTemplate(templateId);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('twilio_templates')
      .update({ content_sid: newSid })
      .eq('id', templateId);

    if (!error) {
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, content_sid: newSid } : t));
    }
    setSavingTemplate(null);
  };

  const retryMessage = async (log: MessageLog) => {
    if (!log.order_id) return;
    setRetryingLog(log.id);

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-order-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderId: log.order_id })
      });

      const result = await response.json();
      if (result.success) {
        alert('Message retried successfully!');
        loadData();
      } else {
        alert(`Retry failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Retry error:', err);
      alert('An error occurred while retrying the message.');
    } finally {
      setRetryingLog(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-500" />
          WhatsApp Notifications
        </h1>
        <p className="text-gray-400 mt-1">
          Manage Twilio WhatsApp templates and monitor message delivery status.
        </p>
      </div>

      {/* Templates Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Active Templates
          </h2>
        </div>
        <div className="p-4">
          <div className="grid gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{tpl.name}</span>
                    <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full uppercase">
                      {tpl.channel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Content SID:</span>
                    <input
                      type="text"
                      defaultValue={tpl.content_sid}
                      onBlur={(e) => {
                        if (e.target.value !== tpl.content_sid) {
                          updateContentSid(tpl.id, e.target.value);
                        }
                      }}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-500 w-64"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTemplate(tpl)}
                    disabled={savingTemplate === tpl.id}
                    className="flex items-center gap-2"
                  >
                    {tpl.active ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500 cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-600 cursor-pointer" />
                    )}
                    <span className="text-sm font-medium text-gray-300">
                      {tpl.active ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                  {savingTemplate === tpl.id && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
                </div>
              </div>
            ))}
            {templates.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-4">No templates configured in the database.</p>
            )}
          </div>
        </div>
      </section>

      {/* Message Logs Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex flex-col md:flex-row justify-between items-md-center gap-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4" />
            Message History
          </h2>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by Order ID or SID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-500" />}
          </form>

          <button
            onClick={loadData}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/30 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Order / Customer</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Twilio SID</th>
                <th className="px-4 py-3 font-bold">Time</th>
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
                    <div className="text-xs text-gray-500">
                      {log.orders?.customer_name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {log.status === 'sent' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium uppercase ${log.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {log.status}
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={log.error}>
                        {log.error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-mono text-xs text-gray-400">
                      {log.twilio_sid || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {log.status === 'failed' && (
                      <button
                        onClick={() => retryMessage(log)}
                        disabled={retryingLog === log.id}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold"
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
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm">
                    No message logs found.
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
