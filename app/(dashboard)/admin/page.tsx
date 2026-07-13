'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, TriangleAlert as AlertTriangle, ChevronRight, TrendingUp, ShoppingCart, Users, Package, Activity, CircleCheck as CheckCircle, ArrowUpRight, Bell, Zap, DollarSign, ChartBar as BarChart3, ClipboardCheck, Tag, Image as ImageIcon, Layers, Globe, Clock, ShieldCheck, Wifi, WifiOff, Star, Truck } from 'lucide-react';
import {
  fetchProfitSummary, fetchReserveData, fetchOrderKpis, fetchCentralhubStatus,
  type DateRange, type ProfitSummary, type ReserveData, type OrderKpis,
} from '@/lib/services/dashboardService';
import { fetchDeliveryPerformance } from '@/lib/services/deliveryService';
import { getSupabase } from '@/lib/supabase/client';

// ── Formatters ────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);
const num = (n: number) => new Intl.NumberFormat('en-GB').format(n);
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// ── Date ranges ───────────────────────────────────────────────────────────
const RANGES: { key: DateRange; label: string }[] = [
  { key: '1d',  label: 'Today' },
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

// ── Activity event types ───────────────────────────────────────────────────
interface ActivityEvent {
  id: string;
  event_type: string;
  description: string;
  entity_name: string | null;
  created_at: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />;
}

// ── Pulse dot ─────────────────────────────────────────────────────────────
function PulseDot({ color }: { color: 'green' | 'red' | 'amber' }) {
  const c = { green: 'bg-emerald-400', red: 'bg-red-400', amber: 'bg-amber-400' }[color];
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${c}`} />
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-gray-900 border border-gray-800 rounded-2xl ${className}`}>{children}</div>;
}

function SectionHeader({ title, icon: Icon, linkHref, linkLabel }: {
  title: string; icon: React.ElementType; linkHref?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-800">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <p className="flex-1 text-sm font-bold text-white">{title}</p>
      {linkHref && (
        <Link href={linkHref} className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
          {linkLabel ?? 'View all'} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── 1. Top KPI Row ─────────────────────────────────────────────────────────
function KpiRow({ profit, reserve, orders, loading, rangeLabel }: {
  profit: ProfitSummary | null;
  reserve: ReserveData | null;
  orders: OrderKpis | null;
  loading: boolean;
  rangeLabel: string;
}) {
  const kpis = [
    {
      label: `Revenue · ${rangeLabel}`,
      value: profit ? fmt(profit.total_revenue) : '—',
      sub: profit ? `${profit.order_count} paid orders` : '',
      icon: DollarSign,
      accent: true,
    },
    {
      label: `Net Profit · ${rangeLabel}`,
      value: profit ? fmt(profit.net_profit) : '—',
      sub: profit ? `${profit.profit_margin_pct.toFixed(1)}% margin` : '',
      icon: TrendingUp,
      accent: false,
    },
    {
      label: 'Cash Available',
      value: reserve ? fmt(reserve.net_cash_available) : '—',
      sub: 'After stock reserve',
      icon: Zap,
      accent: false,
    },
    {
      label: `Orders · ${rangeLabel}`,
      value: orders ? num(orders.total_orders) : '—',
      sub: orders ? `${orders.pending_orders} pending` : '',
      icon: ShoppingCart,
      accent: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(k => (
        <div key={k.label} className={`rounded-2xl p-5 flex flex-col gap-3 border ${
          k.accent
            ? 'bg-emerald-600 border-emerald-500'
            : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-xs font-semibold uppercase tracking-wider leading-tight ${k.accent ? 'text-emerald-100' : 'text-gray-400'}`}>
              {k.label}
            </p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${k.accent ? 'bg-emerald-500/40' : 'bg-gray-800'}`}>
              <k.icon className={`w-4 h-4 ${k.accent ? 'text-white' : 'text-gray-400'}`} />
            </div>
          </div>
          {loading
            ? <Skel className="h-9 w-36" />
            : <p className="text-3xl font-black tabular-nums leading-none text-white">{k.value}</p>
          }
          {k.sub && !loading && (
            <p className={`text-xs ${k.accent ? 'text-emerald-100' : 'text-gray-500'}`}>{k.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 2. Business Health ─────────────────────────────────────────────────────
function BusinessHealth({ hub, pendingApproval, missingImages, missingDesc, loading }: {
  hub: { connected: boolean; last_sync: string | null; total_synced: number; pending_approval: number } | null;
  pendingApproval: number;
  missingImages: number;
  missingDesc: number;
  loading: boolean;
}) {
  const issues = [
    { show: pendingApproval > 0, label: `${num(pendingApproval)} products awaiting approval`, href: '/admin/product-approval', severity: 'warn' },
    { show: missingImages > 0,   label: `${num(missingImages)} products missing images`,      href: '/admin/products',         severity: 'warn' },
    { show: missingDesc > 0,     label: `${num(missingDesc)} products missing descriptions`,  href: '/admin/ingestion',        severity: 'info' },
    { show: !loading && hub !== null && !hub.connected, label: 'CentralHub connection error', href: '/admin/sync-monitor', severity: 'error' },
  ].filter(i => i.show);

  const ago = hub?.last_sync ? timeAgo(hub.last_sync) : 'Never';
  const connected = hub?.connected ?? false;

  return (
    <Card>
      <SectionHeader title="Business Health" icon={Activity} />
      <div className="p-4 space-y-2">
        {/* CentralHub status row */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800">
          {loading
            ? <Skel className="w-2 h-2 rounded-full" />
            : <PulseDot color={connected ? 'green' : 'red'} />
          }
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-200">CentralHub Sync</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? '…' : `Last sync ${ago} · ${num(hub?.total_synced ?? 0)} products`}
            </p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            connected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}>
            {loading ? '…' : connected ? 'Connected' : 'Error'}
          </span>
          <Link href="/admin/sync-monitor" className="text-gray-600 hover:text-gray-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Issues */}
        {loading && (
          <div className="space-y-2">
            <Skel className="h-12 w-full" />
            <Skel className="h-12 w-full" />
          </div>
        )}
        {!loading && issues.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-600/30 bg-emerald-950/20">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-400">All clear — no issues detected</p>
          </div>
        )}
        {!loading && issues.map((issue, i) => {
          const colorMap = {
            error: 'border-red-500/40 bg-red-500/10 text-red-400',
            warn:  'border-amber-500/40 bg-amber-500/10 text-amber-400',
            info:  'border-blue-500/40 bg-blue-500/10 text-blue-400',
          };
          const cls = colorMap[issue.severity as keyof typeof colorMap];
          return (
            <Link key={i} href={issue.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cls} hover:opacity-90 transition-opacity`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="flex-1 text-sm font-semibold">{issue.label}</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-current">Fix</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ── 3. Sales Performance (bar charts) ─────────────────────────────────────
function SalesPerformance({ profit, reserve, loading }: {
  profit: ProfitSummary | null;
  reserve: ReserveData | null;
  loading: boolean;
}) {
  const revenueBreakdown = [
    { label: 'Revenue',    value: profit?.total_revenue ?? 0,      color: 'bg-emerald-500',  pct: 100 },
    { label: 'COGS',       value: profit?.total_cogs ?? 0,          color: 'bg-blue-500',     pct: profit ? (profit.total_cogs / (profit.total_revenue || 1)) * 100 : 0 },
    { label: 'Fees',       value: profit?.total_payment_fees ?? 0,  color: 'bg-amber-500',    pct: profit ? (profit.total_payment_fees / (profit.total_revenue || 1)) * 100 : 0 },
    { label: 'Net Profit', value: profit?.net_profit ?? 0,          color: 'bg-teal-400',     pct: profit ? (profit.net_profit / (profit.total_revenue || 1)) * 100 : 0 },
    { label: 'Reserve',    value: reserve?.reserve_amount ?? 0,     color: 'bg-orange-400',   pct: profit ? ((reserve?.reserve_amount ?? 0) / (profit.total_revenue || 1)) * 100 : 0 },
    { label: 'Cash',       value: reserve?.net_cash_available ?? 0, color: 'bg-green-400',    pct: profit ? ((reserve?.net_cash_available ?? 0) / (profit.total_revenue || 1)) * 100 : 0 },
  ];

  return (
    <Card>
      <SectionHeader title="Sales Performance" icon={BarChart3} />
      <div className="p-5 space-y-3">
        {loading
          ? [1,2,3,4,5,6].map(i => <Skel key={i} className="h-7 w-full" />)
          : revenueBreakdown.map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <p className="text-xs font-semibold text-gray-400 w-20 flex-shrink-0">{b.label}</p>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${b.color}`}
                  style={{ width: `${Math.max(b.pct, b.value > 0 ? 2 : 0)}%` }}
                />
              </div>
              <p className="text-sm font-black text-white tabular-nums w-24 text-right">{fmt(b.value)}</p>
            </div>
          ))
        }
        {!loading && profit && (
          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>Margin: <span className="text-emerald-400 font-bold">{profit.profit_margin_pct.toFixed(1)}%</span></span>
            <span>AOV: <span className="text-white font-bold">{fmt(profit.avg_order_value)}</span></span>
            <span>Orders: <span className="text-white font-bold">{profit.order_count}</span></span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── 4. Money Management ────────────────────────────────────────────────────
function MoneyManagement({ profit, reserve, loading }: {
  profit: ProfitSummary | null;
  reserve: ReserveData | null;
  loading: boolean;
}) {
  const rows = [
    { label: 'Revenue',                      value: profit?.total_revenue ?? 0,         style: 'text-white',       sub: `${profit?.order_count ?? 0} paid orders` },
    { label: 'Cost of Goods Sold (COGS)',     value: -(profit?.total_cogs ?? 0),         style: 'text-red-400',     sub: 'Sum of cost_price × qty' },
    { label: 'Payment Fees',                  value: -(profit?.total_payment_fees ?? 0), style: 'text-red-400',     sub: '~1.9% + £0.20 per order' },
    { label: 'Net Profit',                    value: profit?.net_profit ?? 0,            style: 'text-emerald-400', sub: profit ? `${profit.profit_margin_pct.toFixed(1)}% margin` : '', divider: true },
    { label: 'Stock Replenishment Reserve',   value: -(reserve?.reserve_amount ?? 0),   style: 'text-amber-400',   sub: 'Must keep aside for restocking' },
    { label: 'Cash Available',                value: reserve?.net_cash_available ?? 0,  style: 'text-emerald-300', sub: 'After stock reserve', big: true, highlight: true },
  ];

  return (
    <Card>
      <SectionHeader title="Money Management" icon={Zap} />
      <div className="divide-y divide-gray-800">
        {rows.map((row, i) => (
          <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${'highlight' in row && row.highlight ? 'bg-emerald-950/30' : ''}`}>
            <div>
              {'divider' in row && row.divider && <div className="w-8 h-px bg-gray-700 mb-2" />}
              <p className="text-sm font-medium text-gray-300">{row.label}</p>
              {row.sub && <p className="text-xs text-gray-600 mt-0.5">{row.sub}</p>}
            </div>
            {loading
              ? <Skel className="h-6 w-28" />
              : (
                <p className={`font-black tabular-nums ${'big' in row && row.big ? 'text-2xl' : 'text-lg'} ${row.style}`}>
                  {row.value < 0 ? `−${fmt(Math.abs(row.value))}` : fmt(row.value)}
                </p>
              )
            }
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 5. Quick Access ────────────────────────────────────────────────────────
function QuickAccess({ pendingApproval }: { pendingApproval: number }) {
  const links = [
    { label: 'Orders',             sub: 'View & manage orders',            href: '/admin/orders',           icon: ShoppingCart,  badge: null },
    { label: 'Customers',          sub: 'Customer accounts',               href: '/admin/customers',        icon: Users,         badge: null },
    { label: 'Product Approval',   sub: `${num(pendingApproval)} pending`, href: '/admin/product-approval', icon: ClipboardCheck, badge: pendingApproval > 0 ? pendingApproval : null },
    { label: 'Pricing',            sub: 'Cost & markup rules',             href: '/admin/pricing',          icon: TrendingUp,    badge: null },
    { label: 'Categories',         sub: 'Manage taxonomy',                 href: '/admin/categories',       icon: Tag,           badge: null },
    { label: 'Product Images',     sub: 'Image management',                href: '/admin/products',         icon: ImageIcon,     badge: null },
    { label: 'Sync Monitor',       sub: 'CentralHub logs',                 href: '/admin/sync-monitor',      icon: Activity,      badge: null },
    { label: 'Variant Audit',      sub: 'Size grouping',                   href: '/admin/variants',         icon: Layers,        badge: null },
    { label: 'Homepage Grid',      sub: 'Amazon-style cards',              href: '/admin/homepage-grid',    icon: LayoutGrid,    badge: null },
  ];

  return (
    <Card>
      <SectionHeader title="Quick Access" icon={Zap} />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {links.map(item => (
          <Link key={item.label} href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-800 hover:border-gray-600 hover:bg-gray-800/60 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition-colors">
              <item.icon className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{item.label}</p>
              <p className="text-xs text-gray-600 truncate">{item.sub}</p>
            </div>
            {item.badge !== null && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── 6. Homepage Control summary ────────────────────────────────────────────
function HomepageControl({ loading }: { loading: boolean }) {
  const [bannerCount, setBannerCount] = useState<number | null>(null);
  const [promoCount, setPromoCount] = useState<number | null>(null);
  const [featuredCount, setFeaturedCount] = useState<number | null>(null);
  const [featuredCats, setFeaturedCats] = useState<number | null>(null);
  const [gridCardCount, setGridCardCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    Promise.all([
      supabase.from('carousel_banners').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_featured', true).eq('is_active', true),
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('show_on_homepage', true).eq('is_active', true),
      supabase.from('homepage_grid_cards').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]).then(([banners, promos, featured, cats, grid]) => {
      setBannerCount(banners.count ?? 0);
      setPromoCount(promos.count ?? 0);
      setFeaturedCount(featured.count ?? 0);
      setFeaturedCats(cats.count ?? 0);
      setGridCardCount(grid.count ?? 0);
    });
  }, []);

  const stats = [
    { label: 'Carousel Banners',    value: bannerCount,    icon: ImageIcon, href: '/admin/banners' },
    { label: 'Active Promotions',   value: promoCount,     icon: Star,      href: '/admin/banners' },
    { label: 'Featured Products',   value: featuredCount,  icon: Package,   href: '/admin/product-approval' },
    { label: 'Homepage Cards',      value: gridCardCount,  icon: LayoutGrid, href: '/admin/homepage-grid' },
  ];

  return (
    <Card>
      <SectionHeader title="Homepage Control" icon={Globe} linkHref="/admin/centralhub-sync" linkLabel="Edit" />
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="flex flex-col gap-2 p-4 rounded-xl border border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-gray-400" />
            </div>
            {loading || s.value === null
              ? <Skel className="h-7 w-10" />
              : <p className="text-2xl font-black text-white tabular-nums">{num(s.value)}</p>
            }
            <p className="text-xs font-semibold text-gray-500 leading-tight">{s.label}</p>
          </Link>
        ))}
      </div>
      <div className="px-4 pb-4">
        <Link
          href="/admin/centralhub-sync"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-700 text-xs font-bold text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          Quick Edit Homepage <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}

// ── 7. Recent Activity ─────────────────────────────────────────────────────
function RecentActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase
      .from('admin_activity_log')
      .select('id, event_type, description, entity_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEvents((data as ActivityEvent[]) ?? []);
        setLoadingEvents(false);
      });
  }, []);

  const iconMap: Record<string, React.ElementType> = {
    order_placed:     ShoppingCart,
    product_approved: ClipboardCheck,
    price_updated:    TrendingUp,
    banner_changed:   Globe,
    sync_completed:   Activity,
  };

  const colorMap: Record<string, string> = {
    order_placed:     'text-emerald-400 bg-emerald-500/10',
    product_approved: 'text-blue-400 bg-blue-500/10',
    price_updated:    'text-amber-400 bg-amber-500/10',
    banner_changed:   'text-rose-400 bg-rose-500/10',
    sync_completed:   'text-teal-400 bg-teal-500/10',
  };

  return (
    <Card>
      <SectionHeader title="Recent Activity" icon={Bell} />
      <div className="divide-y divide-gray-800">
        {loadingEvents && (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skel className="w-8 h-8 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skel className="h-3 w-48" />
                  <Skel className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loadingEvents && events.length === 0 && (
          <div className="px-5 py-10 text-center">
            <Clock className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No activity yet</p>
            <p className="text-xs text-gray-700 mt-1">Events will appear as orders, syncs, and approvals happen</p>
          </div>
        )}
        {!loadingEvents && events.map(e => {
          const Icon = iconMap[e.event_type] ?? Bell;
          const colorCls = colorMap[e.event_type] ?? 'text-gray-400 bg-gray-800';
          return (
            <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${colorCls}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-snug">{e.description}</p>
                <p className="text-xs text-gray-600 mt-0.5">{timeAgo(e.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── 8. Delivery Performance Widget ────────────────────────────────────────
function DeliveryPerformance({ rangeKey }: { rangeKey: DateRange }) {
  const [data, setData] = useState<{ revenue: number; freeCount: number; paidCount: number; avgFee: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = rangeKey === '90d' || rangeKey === '365d' ? '30d' : rangeKey as '1d' | '7d' | '30d';
    fetchDeliveryPerformance(r).then(d => { setData(d); setLoading(false); });
  }, [rangeKey]);

  const stats = [
    { label: "Delivery Revenue",      value: data ? fmt(data.revenue)         : '—', accent: true },
    { label: "Free Delivery Orders",  value: data ? num(data.freeCount)       : '—', accent: false },
    { label: "Paid Delivery Orders",  value: data ? num(data.paidCount)       : '—', accent: false },
    { label: "Avg. Delivery Fee",     value: data ? fmt(data.avgFee)          : '—', accent: false },
  ];

  return (
    <Card>
      <SectionHeader title="Delivery Performance" icon={Truck} linkHref="/admin/delivery-settings" linkLabel="Settings" />
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl p-3 border ${s.accent ? 'bg-blue-600/10 border-blue-500/20' : 'bg-gray-800 border-gray-700'}`}>
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            {loading
              ? <Skel className="h-6 w-16" />
              : <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
            }
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [range, setRange] = useState<DateRange>('1d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [reserve, setReserve] = useState<ReserveData | null>(null);
  const [orders, setOrders] = useState<OrderKpis | null>(null);
  const [hub, setHub] = useState<{ connected: boolean; last_sync: string | null; total_synced: number; pending_approval: number } | null>(null);
  const [missingImages, setMissingImages] = useState(0);
  const [missingDesc, setMissingDesc] = useState(0);

  const loadAll = useCallback(async (r: DateRange) => {
    setLoading(true);
    const supabase = getSupabase();
    const [p, res, o, hs] = await Promise.all([
      fetchProfitSummary(r),
      fetchReserveData(r),
      fetchOrderKpis(r),
      fetchCentralhubStatus(),
    ]);
    setProfit(p);
    setReserve(res);
    setOrders(o);
    setHub(hs);

    const [imgRes, descRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('is_deleted', false).is('image_url', null).is('image_main', null),
      supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('is_deleted', false).is('short_description', null),
    ]);
    setMissingImages(imgRes.count ?? 0);
    setMissingDesc(descRes.count ?? 0);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(range); }, [range, loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll(range);
    setRefreshing(false);
  };

  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? '';

  return (
    <div className="bg-gray-950 min-h-screen text-white">

      {/* ── Sticky page header ── */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-white">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-0.5">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    range === r.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* 1. KPI Row */}
        <KpiRow profit={profit} reserve={reserve} orders={orders} loading={loading} rangeLabel={rangeLabel} />

        {/* 2. Business Health (full width) */}
        <BusinessHealth
          hub={hub}
          pendingApproval={hub?.pending_approval ?? 0}
          missingImages={missingImages}
          missingDesc={missingDesc}
          loading={loading}
        />

        {/* 3 + 4. Sales Performance & Money Management — 2 cols on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SalesPerformance profit={profit} reserve={reserve} loading={loading} />
          <MoneyManagement profit={profit} reserve={reserve} loading={loading} />
        </div>

        {/* 5. Quick Access (full width) */}
        <QuickAccess pendingApproval={hub?.pending_approval ?? 0} />

        {/* 6. Delivery Performance */}
        <DeliveryPerformance rangeKey={range} />

        {/* 7 + 8. Homepage Control & Recent Activity — 2 cols on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <HomepageControl loading={loading} />
          <RecentActivity />
        </div>

      </div>
    </div>
  );
}
