'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllGridCards, upsertGridCard, deleteGridCard
} from '@/lib/services/homepageGridService';
import {
  Plus, Trash2, Edit2, Save, X, GripVertical, Eye, EyeOff, LayoutGrid, Square,
  ArrowUp, ArrowDown, ExternalLink, Image as ImageIcon, Loader2
} from 'lucide-react';
import type { HomepageGridCard, GridCardItem } from '@/lib/types/database';
import Image from 'next/image';

const INITIAL_ITEM = (): GridCardItem => ({
  image_url: '',
  label: '',
  link: '/products',
  badge: ''
});

export default function HomepageGridAdmin() {
  const [cards, setCards] = useState<HomepageGridCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<HomepageGridCard> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllGridCards();
    setCards(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (card: HomepageGridCard) => {
    setEditing({ ...card });
  };

  const handleAddNew = () => {
    setEditing({
      title: '',
      layout_type: 'grid_2x2',
      display_order: cards.length + 1,
      is_active: true,
      items: [INITIAL_ITEM(), INITIAL_ITEM(), INITIAL_ITEM(), INITIAL_ITEM()]
    });
  };

  const handleSave = async () => {
    if (!editing?.title) return showMsg('Title is required', 'err');
    setSaving(true);
    const res = await upsertGridCard(editing);
    if (res) {
      showMsg('Saved successfully');
      setEditing(null);
      load();
    } else {
      showMsg('Failed to save', 'err');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    const ok = await deleteGridCard(id);
    if (ok) {
      showMsg('Deleted');
      load();
    }
  };

  const toggleStatus = async (card: HomepageGridCard) => {
    await upsertGridCard({ ...card, is_active: !card.is_active });
    load();
  };

  const move = async (card: HomepageGridCard, dir: 'up' | 'down') => {
    const idx = cards.findIndex(c => c.id === card.id);
    const other = dir === 'up' ? cards[idx - 1] : cards[idx + 1];
    if (!other) return;

    await Promise.all([
      upsertGridCard({ ...card, display_order: other.display_order }),
      upsertGridCard({ ...other, display_order: card.display_order })
    ]);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-white font-bold shadow-lg ${
          message.type === 'ok' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Grid Cards</h1>
          <p className="text-gray-500 text-sm">Amazon-style content blocks for your homepage</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-[#0B5D3B] hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition-all"
        >
          <Plus className="w-5 h-5" /> Add Card
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed">
          <p className="text-gray-400">No cards configured. Click &quot;Add Card&quot; to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <div key={card.id} className={`bg-white border rounded-2xl p-4 shadow-sm relative group ${!card.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{card.display_order}</span>
                  {card.layout_type === 'grid_2x2' ? <LayoutGrid className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4 text-purple-500" />}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => move(card, 'up')} disabled={i === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(card, 'down')} disabled={i === cards.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 truncate mb-4">{card.title}</h3>

              <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-2 rounded-xl aspect-square">
                {card.items.slice(0, card.layout_type === 'grid_2x2' ? 4 : 1).map((it, j) => (
                  <div key={j} className={`relative bg-white rounded-lg overflow-hidden border ${card.layout_type === 'single' ? 'col-span-2 row-span-2' : ''}`}>
                    {it.image_url ? (
                      <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200"><ImageIcon className="w-6 h-6" /></div>
                    )}
                    {it.badge && <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded">{it.badge}</span>}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(card)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleStatus(card)} className={`p-2 rounded-xl transition-colors ${card.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    {card.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={() => handleDelete(card.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">{editing.id ? 'Edit Grid Card' : 'New Grid Card'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Card Title</label>
                  <input
                    value={editing.title}
                    onChange={e => setEditing({...editing, title: e.target.value})}
                    placeholder="e.g. Health & Wellness"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Layout</label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                      <button
                        onClick={() => {
                          const items = editing.items || [];
                          const nextItems = items.length < 4 ? [...items, INITIAL_ITEM(), INITIAL_ITEM(), INITIAL_ITEM()].slice(0, 4) : items;
                          setEditing({...editing, layout_type: 'grid_2x2', items: nextItems});
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${editing.layout_type === 'grid_2x2' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                      >
                        <LayoutGrid className="w-4 h-4" /> 2x2 Grid
                      </button>
                      <button
                        onClick={() => setEditing({...editing, layout_type: 'single'})}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${editing.layout_type === 'single' ? 'bg-white shadow text-purple-600' : 'text-gray-50'}`}
                        style={{ color: editing.layout_type === 'single' ? '#8b5cf6' : '' }}
                      >
                        <Square className="w-4 h-4" /> Single Large
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editing.display_order}
                      onChange={e => setEditing({...editing, display_order: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Card Items
                  <span className="text-xs font-normal text-gray-400">({editing.layout_type === 'grid_2x2' ? '4 required' : '1 required'})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editing.items?.slice(0, editing.layout_type === 'grid_2x2' ? 4 : 1).map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl space-y-3 relative border border-gray-100">
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Image URL</label>
                        <input
                          value={item.image_url}
                          onChange={e => {
                            const next = [...(editing.items || [])];
                            next[idx] = { ...item, image_url: e.target.value };
                            setEditing({...editing, items: next});
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Label</label>
                          <input
                            value={item.label || ''}
                            onChange={e => {
                              const next = [...(editing.items || [])];
                              next[idx] = { ...item, label: e.target.value };
                              setEditing({...editing, items: next});
                            }}
                            placeholder="e.g. Skin care"
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Badge</label>
                          <input
                            value={item.badge || ''}
                            onChange={e => {
                              const next = [...(editing.items || [])];
                              next[idx] = { ...item, badge: e.target.value };
                              setEditing({...editing, items: next});
                            }}
                            placeholder="e.g. 20% off"
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Link</label>
                        <input
                          value={item.link}
                          onChange={e => {
                            const next = [...(editing.items || [])];
                            next[idx] = { ...item, link: e.target.value };
                            setEditing({...editing, items: next});
                          }}
                          placeholder="/products"
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-3 rounded-2xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-3 px-10 py-3 rounded-2xl font-bold text-white bg-[#0B5D3B] hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editing.id ? 'Save Changes' : 'Create Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
