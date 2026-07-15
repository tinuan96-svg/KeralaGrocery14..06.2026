'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, PackageOpen } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { blurDataURL } from '@/lib/utils/image';
import { haptics } from '@/lib/utils/haptics';

interface MiniCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MiniCart({ open, onOpenChange }: MiniCartProps) {
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart();

  const handleQtyChange = (item: any, delta: number) => {
    const newQty = item.quantity + delta;
    if (item.maxStock !== undefined && newQty > item.maxStock) {
      haptics.notification('warning');
      return;
    }
    haptics.impact('light');
    updateQuantity(item.id, newQty, item.maxStock);
  };

  const handleRemove = (id: string) => {
    haptics.notification('warning');
    removeFromCart(id);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[2000] backdrop-blur-[2px]" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[32px] h-[85vh] fixed bottom-0 left-0 right-0 z-[2001] outline-none border-t border-green-50 shadow-2xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 mt-4 mb-2" />

          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-[#0B5D3B]" />
              </div>
              <Drawer.Title className="font-black text-lg text-gray-900">Your Basket</Drawer.Title>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <Drawer.Close asChild>
              <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                  <PackageOpen className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold">Your basket is empty</p>
                  <p className="text-gray-500 text-xs">Start adding some items to see them here!</p>
                </div>
                <Drawer.Close asChild>
                  <Button className="bg-[#0B5D3B] hover:bg-green-700 text-white font-bold rounded-xl px-8 shadow-lg shadow-green-900/10 h-11">
                    Shop Products
                  </Button>
                </Drawer.Close>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-green-100 transition-colors group">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-50 flex-shrink-0">
                      <Image
                        src={item.image_url || '/placeholder.webp'}
                        alt={item.name}
                        fill
                        className="object-contain p-1"
                        placeholder="blur"
                        blurDataURL={blurDataURL}
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <Link href={`/products/${item.slug}`} className="text-[13px] font-bold text-gray-900 hover:text-[#0B5D3B] line-clamp-2 leading-snug">
                          {item.name}
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-[#0B5D3B]">£{item.price.toFixed(2)}</span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-gray-400 font-medium italic">
                              £{(item.price * item.quantity).toFixed(2)} total
                            </span>
                          )}
                        </div>

                        {/* Qty control */}
                        <div className="flex items-center bg-[#f4faf6] rounded-xl border border-green-100 p-1">
                          <button
                            onClick={() => item.quantity > 1 ? handleQtyChange(item, -1) : handleRemove(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm border border-green-50 text-[#0B5D3B] active:scale-90 transition-transform"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-black text-[#0B5D3B]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0B5D3B] text-white shadow-lg shadow-green-900/20 active:scale-90 transition-transform"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-gray-100 space-y-4 mb-safe">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Order Total</p>
                  <p className="text-2xl font-black text-gray-900">£{cartTotal.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight bg-green-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    Free over £45
                  </p>
                  <p className="text-xs text-gray-500">Delivery calculated at checkout</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Drawer.Close asChild>
                  <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-gray-200">
                    Keep Shopping
                  </Button>
                </Drawer.Close>
                <Link href="/checkout" className="flex-[1.5]">
                  <Button className="w-full h-12 rounded-2xl bg-[#0B5D3B] hover:bg-green-700 text-white font-bold shadow-xl shadow-green-900/20 group">
                    Checkout Now
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
