'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  fetchDeliverySettings, fetchDeliveryRegions, fetchDeliveryAuditLog,
  saveDeliverySettings, saveDeliveryRegion,
  type DeliverySettings, type DeliveryRegion,
} from '@/lib/services/deliveryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Truck, Globe, History, Save, RefreshCw, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        checked ? 'bg-green-600' : 'bg-gray-600'
      }`}
    >
      <span className="sr-only">{label}</span>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

// ── Fee row ───────────────────────────────────────────────────────────────────
function FeeRow({
  label, sublabel, feeKey, enabledKey, labelKey, settings, onChange,
}: {
  label: string;
  sublabel?: string;
  feeKey: keyof DeliverySettings;
  enabledKey: keyof DeliverySettings;
  labelKey: keyof DeliverySettings;
  settings: DeliverySettings;
  onChange: (k: keyof DeliverySettings, v: unknown) => void;
}) {
  const enabled = Boolean(settings[enabledKey]);
  return (
    <div className={`rounded-xl border p-4 transition-colors ${enabled ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900/50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
        <Toggle checked={enabled} onChange={v => onChange(enabledKey, v)} label={`Enable ${label}`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">Fee (£)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={String(settings[feeKey])}
              onChange={e => onChange(feeKey, parseFloat(e.target.value) || 0)}
              disabled={!enabled}
              className="pl-7 bg-gray-800 border-gray-700 text-white focus:border-green-500 h-9 text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">Customer Label</Label>
          <Input
            type="text"
            value={String(settings[labelKey])}
            onChange={e => onChange(labelKey, e.target.value)}
            disabled={!enabled}
            className="bg-gray-800 border-gray-700 text-white focus:border-green-500 h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DeliverySettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [regions, setRegions]   = useState<DeliveryRegion[]>([]);
  const [auditLog, setAuditLog] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'regions' | 'audit'>('rules');
  const [showAuditFull, setShowAuditFull] = useState(false);

  // local draft state — changes are buffered until Save
  const [draft, setDraft] = useState<DeliverySettings | null>(null);
  const [regionDraft, setRegionDraft] = useState<DeliveryRegion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r, a] = await Promise.all([
      fetchDeliverySettings(),
      fetchDeliveryRegions(),
      fetchDeliveryAuditLog(30),
    ]);
    setSettings(s);
    setDraft(s);
    setRegions(r);
    setRegionDraft(r);
    setAuditLog(a);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateDraft = (k: keyof DeliverySettings, v: unknown) => {
    setDraft(d => d ? { ...d, [k]: v } : d);
  };

  const updateRegionDraft = (id: string, k: keyof DeliveryRegion, v: unknown) => {
    setRegionDraft(rs => rs.map(r => r.id === id ? { ...r, [k]: v } : r));
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveSettings = async () => {
    if (!draft || !settings || !user) return;
    setSaving(true);
    try {
      const result = await saveDeliverySettings(
        draft, user.id, user.email ?? '', settings
      );
      if (result.success) {
        showToast('success', 'Delivery settings saved');
        await load();
      } else {
        showToast('error', result.error ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRegions = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const changed = regionDraft.filter(rd => {
        const orig = regions.find(r => r.id === rd.id);
        return orig && (rd.delivery_fee !== orig.delivery_fee || rd.enabled !== orig.enabled);
      });
      await Promise.all(
        changed.map(rd => {
          const orig = regions.find(r => r.id === rd.id)!;
          return saveDeliveryRegion(rd.id, { delivery_fee: rd.delivery_fee, enabled: rd.enabled }, user.id, user.email ?? '', orig);
        })
      );
      showToast('success', `${changed.length} region${changed.length !== 1 ? 's' : ''} saved`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remaining = draft
    ? Math.max(0, draft.free_delivery_threshold - 25).toFixed(2)
    : '0.00';
  const previewMsg = draft?.free_delivery_message.replace('{remaining}', `£${remaining}`) ?? '';

  const tabs = [
    { key: 'rules' as const,   label: 'Delivery Rules',   icon: Truck },
    { key: 'regions' as const, label: 'Regional Fees',    icon: Globe },
    { key: 'audit' as const,   label: 'Change History',   icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 border-emerald-700 text-emerald-200'
            : 'bg-red-900/90 border-red-700 text-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Delivery Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {settings?.updated_at ? `Last updated ${fmtDate(settings.updated_at)}` : 'Configure delivery fees and rules'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}
          className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Tab: Rules ── */}
          {activeTab === 'rules' && draft && (
            <div className="space-y-5">

              {/* Free delivery threshold */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-green-600/20 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Free Delivery Rule</h2>
                    <p className="text-xs text-gray-400">Orders above the threshold get free delivery</p>
                  </div>
                  <Toggle
                    checked={draft.free_delivery_enabled}
                    onChange={v => updateDraft('free_delivery_enabled', v)}
                    label="Enable free delivery" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Free Delivery Threshold (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                      <Input
                        type="number" step="0.01" min="0"
                        value={String(draft.free_delivery_threshold)}
                        onChange={e => updateDraft('free_delivery_threshold', parseFloat(e.target.value) || 0)}
                        disabled={!draft.free_delivery_enabled}
                        className="pl-7 bg-gray-800 border-gray-700 text-white focus:border-green-500 h-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Progress Message</Label>
                    <Input
                      type="text"
                      value={draft.free_delivery_message}
                      onChange={e => updateDraft('free_delivery_message', e.target.value)}
                      disabled={!draft.free_delivery_enabled}
                      className="bg-gray-800 border-gray-700 text-white focus:border-green-500 h-10 text-sm"
                      placeholder="Spend £{remaining} more for FREE delivery"
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Use <code className="bg-gray-800 px-1 rounded text-gray-300">{'{remaining}'}</code> as placeholder
                    </p>
                  </div>
                </div>

                {/* Live preview */}
                {draft.free_delivery_enabled && (
                  <div className="mt-4 bg-amber-950/40 border border-amber-700/40 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-300 font-medium">Preview (for £25 basket):</p>
                    <p className="text-sm text-amber-200 mt-0.5">{previewMsg}</p>
                  </div>
                )}
              </div>

              {/* Fee types */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4">Delivery Fee Options</h2>
                <div className="space-y-3">
                  <FeeRow label="Standard Delivery" sublabel="Enable to charge delivery"
                    feeKey="standard_delivery_fee" enabledKey="standard_delivery_enabled" labelKey="standard_delivery_label"
                    settings={draft} onChange={updateDraft} />
                  <FeeRow label="Express Delivery"
                    feeKey="express_delivery_fee" enabledKey="express_delivery_enabled" labelKey="express_delivery_label"
                    settings={draft} onChange={updateDraft} />
                  <FeeRow label="Same Day Delivery"
                    feeKey="same_day_delivery_fee" enabledKey="same_day_delivery_enabled" labelKey="same_day_delivery_label"
                    settings={draft} onChange={updateDraft} />
                  <FeeRow label="Click & Collect"
                    feeKey="click_collect_fee" enabledKey="click_collect_enabled" labelKey="click_collect_label"
                    settings={draft} onChange={updateDraft} />
                </div>
              </div>

              {/* Delivery Logic Preview */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4">Delivery Logic Preview</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        Order total &lt; <span className="font-bold text-amber-300">{fmt(draft.free_delivery_threshold)}</span>
                      </p>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {draft.standard_delivery_enabled ? fmt(draft.standard_delivery_fee) : 'FREE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        Order total &ge; <span className="font-bold text-green-300">{fmt(draft.free_delivery_threshold)}</span>
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-400">
                      {draft.free_delivery_enabled ? 'FREE' : fmt(draft.standard_delivery_fee)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Delivery Rules
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* ── Tab: Regions ── */}
          {activeTab === 'regions' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-bold text-white flex-1">Regional Delivery Fees</h2>
                  <p className="text-xs text-gray-500">Overrides standard fee per region</p>
                </div>

                <div className="space-y-3">
                  {regionDraft.map(region => (
                    <div key={region.id}
                      className={`rounded-xl border p-4 transition-colors ${region.enabled ? 'border-gray-700 bg-gray-800/50' : 'border-gray-800 bg-gray-900/50 opacity-60'}`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-white">{region.region_name}</p>
                        <Toggle
                          checked={region.enabled}
                          onChange={v => updateRegionDraft(region.id, 'enabled', v)}
                          label={`Enable ${region.region_name}`} />
                      </div>
                      <div className="relative w-40">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={String(region.delivery_fee)}
                          onChange={e => updateRegionDraft(region.id, 'delivery_fee', parseFloat(e.target.value) || 0)}
                          disabled={!region.enabled}
                          className="pl-7 bg-gray-800 border-gray-700 text-white focus:border-green-500 h-9 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveRegions}
                disabled={saving}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Regional Fees
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* ── Tab: Audit Log ── */}
          {activeTab === 'audit' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
                <History className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-bold text-white flex-1">Change History</h2>
                <span className="text-xs text-gray-500">{auditLog.length} records</span>
              </div>

              {auditLog.length === 0 ? (
                <div className="px-5 py-12 text-center text-gray-500">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No changes recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {(showAuditFull ? auditLog : auditLog.slice(0, 10)).map((row) => (
                    <div key={String(row.id)} className="px-5 py-3 flex flex-wrap items-start gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-500 text-xs w-32 flex-shrink-0">
                        {fmtDate(String(row.created_at))}
                      </span>
                      <span className="text-gray-300 font-mono text-xs flex-shrink-0">
                        {String(row.field_name)}
                      </span>
                      <span className="text-red-400 text-xs line-through">{String(row.old_value)}</span>
                      <span className="text-gray-500 text-xs">→</span>
                      <span className="text-green-400 text-xs font-semibold">{String(row.new_value)}</span>
                      <span className="ml-auto text-gray-600 text-xs">{String(row.changed_by_email ?? '')}</span>
                    </div>
                  ))}
                  {auditLog.length > 10 && (
                    <button
                      onClick={() => setShowAuditFull(f => !f)}
                      className="w-full px-5 py-3 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                      {showAuditFull
                        ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                        : <><ChevronDown className="w-3.5 h-3.5" /> Show {auditLog.length - 10} more</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
