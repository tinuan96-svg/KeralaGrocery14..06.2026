'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, ChevronRight, Package, Clock, CircleCheck as CheckCircle, Circle as XCircle, RefreshCw, MoreVertical, Edit2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { updateOrderStatus } from '@/lib/actions/orders';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
}

function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />;
}

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
  confirmed:  'bg-blue-500/10 text-blue-400 border-blue-500/30',
  processing: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  shipped:    'bg-violet-500/10 text-violet-400 border-violet-500/30',
  delivered:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelled:  'bg-red-500/10 text-red-400 border-red-500/30',
};

const PAYMENT_STYLES: Record<string, string> = {
  paid:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  pending:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  failed:   'bg-red-500/10 text-red-400 border-red-500/30',
  refunded: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    let query = supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total, order_status, payment_status, payment_method, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('order_status', statusFilter);
    }

    const { data } = await query;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateStatus = async (orderNumber: string, status: any) => {
    setLoading(true);
    try {
      const result = await updateOrderStatus(orderNumber, status);
      if (result.success) {
        // Release cashback if delivered manually
        if (status === 'delivered') {
          const supabase = getSupabase();
          // Find order ID first
          const { data: ord } = await supabase.from('orders').select('id').eq('order_number', orderNumber).single();
          if (ord) {
            await supabase.rpc('release_order_cashback', { p_order_id: ord.id });
          }
        }
        toast.success(`Order #${orderNumber} set to ${status}`);
        load();
      } else {
        toast.error(result.error || 'Update failed');
      }
    } catch (err) {
      toast.error('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            <h1 className="text-base font-bold text-white">Orders</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f ? 'bg-emerald-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Orders' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skel key={i} className="h-20 w-full" />)}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Package className="w-12 h-12 text-gray-700" />
            <p className="text-sm font-semibold text-gray-500">No orders found</p>
            <p className="text-xs text-gray-600">Orders will appear here when customers place them</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {orders.map(order => (
                <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">#{order.order_number}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.order_status] ?? STATUS_STYLES.pending}`}>
                        {order.order_status}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PAYMENT_STYLES[order.payment_status] ?? PAYMENT_STYLES.pending}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{order.customer_name} · {order.customer_email}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-base font-black text-white tabular-nums flex-shrink-0">{fmt(order.total)}</p>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-gray-300">
                        <p className="text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 text-gray-500">Update Status</p>
                        {STATUS_OPTIONS.map(s => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => handleUpdateStatus(order.order_number, s)}
                            className={`capitalize focus:bg-gray-800 focus:text-white cursor-pointer ${order.order_status === s ? 'text-emerald-500 font-bold' : ''}`}
                          >
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
