'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/lib/context/CartContext';
import { fetchDeliverySettings, calcDelivery } from '@/lib/services/deliveryService';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Trash2, ShoppingBag, ArrowLeft, Truck, CircleCheck as CheckCircle, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// ─── Swipe-to-delete card ─────────────────────────────────────────────────────
const REVEAL_WIDTH = 80;   // px — show delete zone
const DELETE_WIDTH = 160;  // px — auto-delete threshold

interface SwipeItemProps {
  children: React.ReactNode;
  onDelete: () => void;
}

function SwipeItem({ children, onDelete }: SwipeItemProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const direction = useRef<'h' | 'v' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    direction.current = null;
    setDragging(true);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (direction.current === null) {
      direction.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }

    if (direction.current === 'v') return;

    // Only allow left-swipe (negative dx)
    const clamped = Math.max(-DELETE_WIDTH * 1.2, Math.min(0, dx));
    setOffset(clamped);
  }, [dragging]);

  const handleTouchEnd = () => {
    setDragging(false);
    if (offset < -DELETE_WIDTH) {
      // Animate fully off then delete
      setOffset(-window.innerWidth);
      setTimeout(onDelete, 260);
    } else if (offset < -REVEAL_WIDTH / 2) {
      setOffset(-REVEAL_WIDTH);
    } else {
      setOffset(0);
    }
  };

  const deleteBgOpacity = Math.min(1, Math.abs(offset) / REVEAL_WIDTH);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-xl"
        style={{
          width: `${REVEAL_WIDTH}px`,
          opacity: deleteBgOpacity,
          transition: dragging ? 'none' : 'opacity 0.2s',
        }}
        aria-hidden="true"
      >
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Swipeable content */}
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.26s cubic-bezier(0.25,0.46,0.45,0.94)',
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const { toast } = useToast();

  const [deliveryFee, setDeliveryFee]           = useState(0);
  const [isFree, setIsFree]                     = useState(false);
  const [progressMsg, setProgressMsg]           = useState('');
  const [progressPct, setProgressPct]           = useState(0);
  const [threshold, setThreshold]               = useState(40);
  const [loadingDelivery, setLoadingDelivery]   = useState(true);

  useEffect(() => {
    fetchDeliverySettings().then(settings => {
      const result = calcDelivery(cartTotal, settings);
      setDeliveryFee(result.fee);
      setIsFree(result.isFree);
      setProgressMsg(result.progressMessage);
      setThreshold(settings.free_delivery_threshold);
      setProgressPct(Math.min(100, (cartTotal / settings.free_delivery_threshold) * 100));
      setLoadingDelivery(false);
    });
  }, [cartTotal]);

  const finalTotal = cartTotal + deliveryFee;

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty < 1) {
      removeFromCart(id);
    } else {
      updateQuantity(id, newQty);
    }
  };

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id);
    toast({ title: 'Item removed', description: `${name} removed from cart` });
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="page-enter min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-5">
          <ShoppingBag className="h-12 w-12 text-gray-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-[14px] text-gray-500 mb-7">Add some products to get started</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-[#0B5D3B] text-white font-bold px-6 py-3.5 rounded-2xl text-[15px] active:scale-95 transition-transform"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse Products
        </Link>
      </div>
    );
  }

  // ── Filled cart ──────────────────────────────────────────────────────────────
  return (
    <div className="page-enter">
      {/* ── Mobile sticky header ──────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/products"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:scale-90 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold text-gray-900 leading-none">My Cart</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
        </div>
        {cart.length > 1 && (
          <button
            onClick={() => { clearCart(); toast({ title: 'Cart cleared' }); }}
            className="text-[12px] text-red-500 font-semibold active:opacity-70 transition-opacity"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Desktop header ────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between px-4 lg:px-8 pt-8 pb-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold mb-1">Shopping Cart</h1>
          <p className="text-gray-500">{cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-[14px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-6 lg:grid lg:grid-cols-3 lg:gap-8">
        {/* ── Item list ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {/* Swipe hint — mobile only, shown once */}
          <p className="lg:hidden text-[10px] text-gray-400 text-right mb-2 pr-1">
            Swipe left to remove
          </p>

          <div className="space-y-3">
            {cart.map((item) => (
              <SwipeItem
                key={item.id}
                onDelete={() => handleRemoveItem(item.id, item.name)}
              >
                <div className="flex gap-3 p-3">
                  {/* Product image */}
                  <div className="relative w-[76px] h-[76px] flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                    <Image
                      src={item.image_url || '/placeholder.webp'}
                      alt={item.name}
                      fill
                      sizes="76px"
                      className="object-contain p-1.5"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.slug}`}>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 hover:text-[#0B5D3B] transition-colors">
                        {item.name}
                      </p>
                    </Link>
                    <p className="text-[15px] font-extrabold text-[#0B5D3B] mt-1">
                      £{item.price.toFixed(2)}
                    </p>

                    {/* Quantity stepper */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all text-gray-600"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-[14px] font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all text-gray-600"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Line total */}
                      <p className="text-[13px] font-bold text-gray-700">
                        £{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Desktop remove */}
                  <button
                    onClick={() => handleRemoveItem(item.id, item.name)}
                    className="hidden lg:flex w-9 h-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </SwipeItem>
            ))}
          </div>
        </div>

        {/* ── Order summary ────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 mt-6 lg:mt-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:sticky lg:top-24 shadow-sm">
            <h2 className="text-[16px] font-extrabold text-gray-900 mb-4">Order Summary</h2>

            {/* Free delivery progress */}
            {!loadingDelivery && !isFree && (
              <div className="mb-4 bg-green-50 rounded-xl px-3 py-2.5">
                <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                  <span className="text-green-700 font-medium">{progressMsg}</span>
                  <span>£{threshold.toFixed(2)}</span>
                </div>
                <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {!loadingDelivery && isFree && (
              <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                <Truck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-[12px] text-green-700 font-bold">Free delivery unlocked!</p>
              </div>
            )}

            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">£{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                {loadingDelivery ? (
                  <span className="w-10 h-4 bg-gray-100 animate-pulse rounded" />
                ) : isFree ? (
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> FREE
                  </span>
                ) : (
                  <span className="font-semibold text-gray-800">£{deliveryFee.toFixed(2)}</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-extrabold text-gray-900 text-[16px]">Total</span>
                {loadingDelivery
                  ? <span className="w-16 h-5 bg-gray-100 animate-pulse rounded" />
                  : <span className="font-extrabold text-[#0B5D3B] text-[18px]">£{finalTotal.toFixed(2)}</span>
                }
              </div>
            </div>

            <Link href="/checkout" className="block mt-5">
              <button className="w-full bg-[#0B5D3B] text-white font-extrabold py-4 rounded-2xl text-[15px] active:scale-[0.98] transition-transform shadow-[0_4px_16px_rgba(11,93,59,0.35)]">
                Proceed to Checkout →
              </button>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> Secure checkout
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-green-500" /> Fast delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
