'use client';

import { useCart } from '@/lib/context/CartContext';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { haptics } from '@/lib/utils/haptics';

export default function MiniCart() {
  const { cart, cartTotal, cartCount, isMiniCartOpen, closeMiniCart, removeFromCart, updateQuantity, isHydrated } = useCart();
  const [isClosing, setIsClosing] = useState(false);

  const freeDeliveryThreshold = 45;
  const progress = Math.min((cartTotal / freeDeliveryThreshold) * 100, 100);
  const remaining = Math.max(freeDeliveryThreshold - cartTotal, 0);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeMiniCart();
      setIsClosing(false);
    }, 300);
  };

  const handleUpdateQty = (id: string, newQty: number) => {
    haptics.impact('light');
    updateQuantity(id, newQty);
  };

  if (!isMiniCartOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-[110] pointer-events-auto">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#fdfbf7] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}
      >
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-[#0B5D3B]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Your Basket</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{cartCount} items</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        <div className="px-6 py-4 bg-white border-b border-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">
              {remaining > 0
                ? `Spend £${remaining.toFixed(2)} more for FREE delivery`
                : '🎉 You have earned FREE standard delivery!'}
            </p>
            <Truck className={`w-4 h-4 ${remaining > 0 ? 'text-gray-300' : 'text-green-600'}`} />
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0B5D3B] transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-gray-200" />
              </div>
              <div>
                <p className="text-gray-900 font-bold">Your basket is empty</p>
                <p className="text-sm text-gray-400">Add some delicious Kerala essentials!</p>
              </div>
              <Button onClick={handleClose} className="bg-[#0B5D3B] hover:bg-green-700 rounded-xl px-8">
                Start Shopping
              </Button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 group">
                <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-1">
                  <Image src={item.image_url || '/placeholder.webp'} alt={item.name} fill className="object-contain p-1" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{item.name}</h3>
                    <button
                      onClick={() => { haptics.notification('warning'); removeFromCart(item.id); }}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-black text-green-700 mt-1">£{(item.price * item.quantity).toFixed(2)}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center bg-white border border-gray-100 rounded-xl shadow-sm">
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        className="p-1.5 hover:bg-gray-50 text-gray-500"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        className="p-1.5 hover:bg-gray-50 text-[#0B5D3B]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Estimated Total</span>
              <span className="text-2xl font-black text-gray-900">£{cartTotal.toFixed(2)}</span>
            </div>
            <Link href="/checkout" onClick={handleClose}>
              <Button className="w-full h-14 bg-gradient-to-r from-[#0B5D3B] to-[#064e3b] hover:shadow-xl hover:shadow-green-900/20 text-white font-black rounded-2xl text-lg flex items-center justify-between px-8 group">
                Go to Checkout
                <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-tighter">
              Taxes and shipping calculated at checkout
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
