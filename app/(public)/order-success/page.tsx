'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CircleCheck as CheckCircle2, Package, Truck, Chrome as Home, Receipt } from 'lucide-react';
import Image from 'next/image';
import { getOrderByNumber } from '@/lib/actions/orders';

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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postcode: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  items: OrderItem[];
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const orderNumber = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/account');
      return;
    }
    if (orderNumber) {
      loadOrder(orderNumber);
    } else {
      setLoading(false);
    }
  }, [authLoading, user, orderNumber]);

  const loadOrder = async (orderNum: string) => {
    try {
      const result = await getOrderByNumber(orderNum);
      if (result.success && result.order) {
        setOrder(result.order as Order);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!orderNumber || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">
            We couldn't find your order. Please check your email for order confirmation.
          </p>
          <Link href="/products">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const paymentMethodLabels: Record<string, string> = {
    card: 'Debit/Credit Card',
    paypal: 'PayPal',
    wallet: 'KG Wallet',
    cod: 'Cash on Delivery',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 text-lg">
            Thank you for your order, {order.customer_name}
          </p>
          <p className="text-gray-500 mt-2">
            Order Number: <span className="font-bold text-green-600">{order.order_number}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 text-center">
            <Receipt className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-sm">Order Placed</p>
            <p className="text-xs text-gray-600">
              {new Date(order.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </Card>

          <Card className="p-4 text-center">
            <Package className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="font-semibold text-sm">Processing</p>
            <p className="text-xs text-gray-600">We're preparing your order</p>
          </Card>

          <Card className="p-4 text-center">
            <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="font-semibold text-sm">Estimated Delivery</p>
            <p className="text-xs text-gray-600">Tomorrow</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4">Delivery Address</h2>
            <div className="space-y-1 text-gray-700">
              <p className="font-semibold">{order.customer_name}</p>
              <p>{order.delivery_address}</p>
              <p>{order.delivery_city}</p>
              <p>{order.delivery_postcode}</p>
              <p className="mt-3 text-sm">
                <span className="font-semibold">Phone:</span> {order.customer_phone}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {order.customer_email}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold text-lg mb-4">Payment Information</h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold">
                  {paymentMethodLabels[order.payment_method] || order.payment_method}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className={`font-semibold ${
                  order.payment_status === 'paid' ? 'text-green-600' :
                  order.payment_status === 'pending' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </span>
              </div>
              {order.payment_method === 'cod' && (
                <p className="text-sm text-gray-600 mt-2 bg-orange-50 p-3 rounded">
                  Please keep £{Number(order.total).toFixed(2)} ready for payment on delivery
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">Order Items</h2>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={item.product_image || '/placeholder.webp'}
                    alt={item.product_name}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm text-gray-600">
                    £{Number(item.unit_price).toFixed(2)} each
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">£{Number(item.total_price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>£{Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>
                {Number(order.delivery_fee) === 0 ? (
                  <span className="text-green-600 font-semibold">FREE</span>
                ) : (
                  `£${Number(order.delivery_fee).toFixed(2)}`
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-green-600">£{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-gray-600">
            A confirmation email has been sent to <span className="font-semibold">{order.customer_email}</span>
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/products">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading order details...</p>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
