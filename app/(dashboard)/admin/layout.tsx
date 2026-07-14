'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import {
  LayoutGrid, Package, Image as ImageIcon, LogOut, ShieldCheck, X, Cpu,
  Wand as Wand2, ClipboardCheck, ArrowDownToLine, Tag, TrendingUp,
  Activity, Zap, Users, MoveHorizontal as MoreHorizontal,
  ChevronRight, ShoppingCart, TriangleAlert as AlertTriangle,
  Truck, Wallet, Stethoscope, Megaphone, MonitorPlay, MessageSquare
} from 'lucide-react';

// Bottom nav tabs (mobile primary navigation)
const BOTTOM_NAV = [
  { href: '/admin',                  label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/product-approval', label: 'Products',  icon: Package },
  { href: '/admin/orders',           label: 'Orders',    icon: ShoppingCart },
  { href: '/admin/more',             label: 'More',      icon: MoreHorizontal },
];

// Drawer nav sections
const DRAWER_NAV = [
  {
    section: 'Overview',
    items: [
      { href: '/admin',            label: 'Dashboard',   icon: Zap },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { href: '/admin/orders',               label: 'Orders',              icon: ShoppingCart },
      { href: '/admin/wallet',               label: 'Wallet Management',   icon: Wallet },
      { href: '/admin/wallet-diagnostics',   label: 'Wallet Diagnostics',  icon: Stethoscope },
      { href: '/admin/delivery-settings',    label: 'Delivery Settings',   icon: Truck },
      { href: '/admin/payment-diagnostics',  label: 'Payment Diagnostics', icon: AlertTriangle },
      { href: '/admin/customers',            label: 'Customers',           icon: Users },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { href: '/admin/product-approval', label: 'Product Approval', icon: ClipboardCheck },
      { href: '/admin/pricing',          label: 'Pricing',          icon: TrendingUp },
      { href: '/admin/categories',       label: 'Categories',       icon: Tag },
    ],
  },
  {
    section: 'CentralHub',
    items: [
      { href: '/admin/centralhub-sync', label: 'Sync Products', icon: ArrowDownToLine },
      { href: '/admin/sync-monitor',    label: 'Sync Monitor',   icon: Activity },
    ],
  },
  {
    section: 'Settings',
    items: [
      { href: '/admin/announcements',  label: 'Announcements',   icon: Megaphone },
      { href: '/admin/banners',         label: 'Banners',         icon: MonitorPlay },
      { href: '/admin/sms-notifications', label: 'SMS Notifications', icon: MessageSquare },
      { href: '/admin/sms-diagnostics', label: 'SMS Diagnostics', icon: Stethoscope },
    ],
  },
  {
    section: 'Images',
    items: [
      { href: '/admin/products',         label: 'Product Images',    icon: ImageIcon },
      { href: '/admin/images',           label: 'Image Bucket',      icon: ImageIcon },
      { href: '/admin/ingestion',        label: 'AI Ingestion',      icon: Cpu },
      { href: '/admin/image-processing', label: 'Image Processing',  icon: Wand2 },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (pathname === '/admin/login') return;

    const isAdmin = user?.app_metadata?.is_admin === true;

    if (!user || !isAdmin) {
      router.replace('/admin/login');
    }
  }, [user, authLoading, pathname, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  if (pathname === '/admin/login') return <>{children}</>;

  if (authLoading || (!user || user.app_metadata?.is_admin !== true)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Desktop sidebar (lg+) ── */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-60 bg-gray-950 flex flex-col border-r border-gray-800 fixed inset-y-0 left-0 z-30">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Kerala Grocery</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Admin Dashboard</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
            {DRAWER_NAV.map(({ section, items }) => (
              <div key={section}>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5">{section}</p>
                <div className="space-y-0.5">
                  {items.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive(href)
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-gray-800">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Desktop main */}
        <div className="flex-1 ml-60 overflow-auto">
          {children}
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col flex-1 min-h-screen">
        {/* Mobile top bar */}
        <header className="bg-gray-950 px-4 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Kerala Grocery</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-gray-300 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </header>

        {/* Mobile content — pad bottom for nav bar */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>

        {/* Bottom navigation bar */}
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-gray-950 border-t border-gray-800 safe-area-pb">
          <div className="grid grid-cols-4">
            {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/admin/more' ? drawerOpen : isActive(href);
              return (
                <button
                  key={href}
                  onClick={() => {
                    if (href === '/admin/more') {
                      setDrawerOpen(true);
                    } else {
                      router.push(href);
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                    active ? 'text-emerald-400' : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Drawer overlay */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-72 bg-gray-950 flex flex-col shadow-2xl">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <p className="text-white font-bold text-sm">Navigation</p>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
                {DRAWER_NAV.map(({ section, items }) => (
                  <div key={section}>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5">{section}</p>
                    <div className="space-y-0.5">
                      {items.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive(href)
                              ? 'bg-emerald-600 text-white'
                              : 'text-gray-300 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1">{label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="px-3 py-4 border-t border-gray-800">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
