'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, ChevronDown, ChevronUp, CircleCheck as CheckCircle2, Clock, Truck, PackageCheck } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import Image from 'next/image';

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier_name?: string | null;
  items?: OrderItem[];
}

function OrderStatusTimeline({ status }: { status: string }) {
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];

  // Map sub-statuses to primary timeline steps
  const normalizedStatus = status.toLowerCase();
  let mappedStatus = normalizedStatus;
  if (['picking', 'packed', 'ready for dispatch', 'confirmed'].includes(normalizedStatus)) {
    mappedStatus = 'processing';
  }

  const currentIndex = statuses.indexOf(mappedStatus);

  const getStatusIcon = (step: string, index: number) => {
    const isActive = index <= currentIndex;
    const isCurrent = index === currentIndex;

    const iconClass = isActive ? 'text-green-600' : 'text-gray-300';
    const size = 'h-6 w-6';

    switch (step) {
      case 'pending':
        return <Clock className={`${size} ${iconClass}`} />;
      case 'processing':
        return <Package className={`${size} ${iconClass}`} />;
      case 'shipped':
        return <Truck className={`${size} ${iconClass}`} />;
      case 'delivered':
        return <PackageCheck className={`${size} ${iconClass}`} />;
      default:
        return <Clock className={`${size} ${iconClass}`} />;
    }
  };

  const getStatusLabel = (step: string) => {
    return step.charAt(0).toUpperCase() + step.slice(1);
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {statuses.map((step, index) => {
          const isActive = index <= currentIndex;
          const isLast = index === statuses.length - 1;

          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isActive ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {getStatusIcon(step, index)}
              </div>
              <p className={`text-xs mt-2 font-medium ${
                isActive ? 'text-green-600' : 'text-gray-400'
              }`}>
                {getStatusLabel(step)}
              </p>
              {!isLast && (
                <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                  index < currentIndex ? 'bg-green-600' : 'bg-gray-300'
                }`} style={{ transform: 'translateY(-50%)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = getSupabase();

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((order) => order.id);

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const ordersWithItems = ordersData.map((order) => ({
          ...order,
          items: itemsData?.filter((item) => item.order_id === order.id) || [],
        }));

        setOrders(ordersWithItems);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/account');
    } else if (user) {
      fetchOrders();
    }
  }, [user, authLoading, fetchOrders, router]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case 'processing':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
      case 'cancelled':
        return 'bg-red-100 text-red-700 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No orders yet</h2>
              <p className="text-gray-600 mb-6">
                Start shopping to see your orders here
              </p>
              <Link href="/products">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Browse Products
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">{order.order_number}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusBadgeClass(order.order_status)}>
                        {order.order_status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {order.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Delivery Address</p>
                      <p className="font-medium text-sm">
                        {order.delivery_address}, {order.delivery_city},{' '}
                        {order.delivery_postcode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium text-sm capitalize">
                        {order.payment_method.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <OrderStatusTimeline status={order.order_status} />

                  {order.tracking_number && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Tracking Information</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <p className="text-sm font-bold text-blue-900">
                              {order.courier_name || 'DHL eCommerce UK'}: {order.tracking_number}
                            </p>
                            {order.tracking_url && (
                              <a
                                href={order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Track Package <Truck className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-2xl font-bold text-green-600">
                        £{order.total.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({order.items?.length || 0}{' '}
                        {order.items?.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOrderDetails(order.id)}
                    >
                      {expandedOrder === order.id ? (
                        <>
                          Hide Details <ChevronUp className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          View Details <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {expandedOrder === order.id && order.items && (
                  <div className="border-t bg-gray-50 p-6">
                    <h3 className="font-semibold mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 bg-white rounded-lg p-3"
                        >
                          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                            <Image
                              src={item.product_image || '/placeholder.webp'}
                              alt={item.product_name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} × £{item.unit_price.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              £{item.total_price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
