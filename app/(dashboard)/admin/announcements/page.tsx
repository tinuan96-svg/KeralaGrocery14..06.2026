'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Save, Loader as Loader2 } from 'lucide-react';

interface AnnouncementMessage {
  id: string;
  text: string;
  icon: string;
  link: string | null;
  is_active: boolean;
  display_order: number;
}

const ICON_OPTIONS = [
  'truck', 'gift', 'zap', 'star', 'package', 'sparkles', 'trophy', 'wallet',
];

const EMPTY_FORM = { text: '', icon: 'truck', link: '' };

export default function AnnouncementsPage() {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('announcement_messages')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(msg: AnnouncementMessage) {
    setSaving(msg.id);
    const supabase = getSupabase();
    await supabase
      .from('announcement_messages')
      .update({ is_active: !msg.is_active, updated_at: new Date().toISOString() })
      .eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_active: !m.is_active } : m));
    setSaving(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    setDeleting(id);
    const supabase = getSupabase();
    await supabase.from('announcement_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
    setDeleting(null);
  }

  async function moveUp(msg: AnnouncementMessage) {
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx === 0) return;
    const prev = messages[idx - 1];
    const supabase = getSupabase();
    setSaving(msg.id);
    await Promise.all([
      supabase.from('announcement_messages').update({ display_order: prev.display_order }).eq('id', msg.id),
      supabase.from('announcement_messages').update({ display_order: msg.display_order }).eq('id', prev.id),
    ]);
    const updated = [...messages];
    updated[idx - 1] = { ...msg, display_order: prev.display_order };
    updated[idx] = { ...prev, display_order: msg.display_order };
    setMessages(updated);
    setSaving(null);
  }

  async function moveDown(msg: AnnouncementMessage) {
    const idx = messages.findIndex(m => m.id === msg.id);
    if (idx === messages.length - 1) return;
    const next = messages[idx + 1];
    const supabase = getSupabase();
    setSaving(msg.id);
    await Promise.all([
      supabase.from('announcement_messages').update({ display_order: next.display_order }).eq('id', msg.id),
      supabase.from('announcement_messages').update({ display_order: msg.display_order }).eq('id', next.id),
    ]);
    const updated = [...messages];
    updated[idx + 1] = { ...msg, display_order: next.display_order };
    updated[idx] = { ...next, display_order: msg.display_order };
    setMessages(updated);
    setSaving(null);
  }

  async function handleAdd() {
    if (!form.text.trim()) { setError('Message text is required.'); return; }
    setError(null);
    setAdding(true);
    const supabase = getSupabase();
    const maxOrder = messages.reduce((m, x) => Math.max(m, x.display_order), -1);
    const { data, error: err } = await supabase
      .from('announcement_messages')
      .insert({
        text: form.text.trim(),
        icon: form.icon,
        link: form.link.trim() || null,
        is_active: true,
        display_order: maxOrder + 1,
      })
      .select()
      .single();
    if (err) { setError(err.message); }
    else if (data) { setMessages(prev => [...prev, data]); setForm(EMPTY_FORM); }
    setAdding(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Announcement Bar</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage the rotating messages shown in the top announcement bar. Active messages rotate automatically.
        </p>
      </div>

      {/* Add new */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-bold text-gray-300 mb-4">Add New Message</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Message text (e.g. Free Delivery Over £45)"
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex gap-3">
            <select
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 flex-shrink-0"
            >
              {ICON_OPTIONS.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Link (optional, e.g. /products)"
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 flex-1"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors self-start"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Message
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No messages yet. Add one above.</div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex items-center gap-3 bg-gray-900 border rounded-xl px-4 py-3 transition-opacity ${
              msg.is_active ? 'border-gray-700' : 'border-gray-800 opacity-50'
            }`}
          >
            {/* Reorder */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                onClick={() => moveUp(msg)}
                disabled={idx === 0 || saving === msg.id}
                className="w-5 h-4 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-30 text-[10px] leading-none"
              >
                ▲
              </button>
              <button
                onClick={() => moveDown(msg)}
                disabled={idx === messages.length - 1 || saving === msg.id}
                className="w-5 h-4 flex items-center justify-center text-gray-600 hover:text-gray-300 disabled:opacity-30 text-[10px] leading-none"
              >
                ▼
              </button>
            </div>

            <GripVertical className="w-4 h-4 text-gray-700 flex-shrink-0" />

            {/* Icon badge */}
            <span className="text-[10px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
              {msg.icon}
            </span>

            {/* Text + link */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{msg.text}</p>
              {msg.link && (
                <p className="text-[11px] text-gray-500 truncate">{msg.link}</p>
              )}
            </div>

            {/* Saving indicator */}
            {saving === msg.id && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 flex-shrink-0" />}

            {/* Toggle active */}
            <button
              onClick={() => toggleActive(msg)}
              disabled={saving === msg.id}
              title={msg.is_active ? 'Hide' : 'Show'}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {msg.is_active
                ? <Eye className="w-4 h-4 text-emerald-400" />
                : <EyeOff className="w-4 h-4 text-gray-500" />
              }
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(msg.id)}
              disabled={deleting === msg.id}
              title="Delete"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-900/60 transition-colors"
            >
              {deleting === msg.id
                ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                : <Trash2 className="w-4 h-4 text-red-400" />
              }
            </button>
          </div>
        ))}
      </div>

      {messages.length > 0 && (
        <p className="text-xs text-gray-600 mt-4 text-center">
          {messages.filter(m => m.is_active).length} of {messages.length} messages active
        </p>
      )}
    </div>
  );
}
