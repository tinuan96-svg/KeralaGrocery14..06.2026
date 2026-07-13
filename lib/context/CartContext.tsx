'use client';

import React, {
  createContext, useContext, useReducer, useEffect,
  useCallback, useMemo, useRef,
} from 'react';

import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  slug: string;
}

interface CartState {
  cart: CartItem[];
  isHydrated: boolean;
}

type CartAction =
  | { type: 'HYDRATE'; cart: CartItem[] }
  | { type: 'ADD'; item: Omit<CartItem, 'quantity'>; qty: number }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE'; id: string; quantity: number }
  | { type: 'CLEAR' };

interface CartActions {
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getQuantity: (id: string) => number;
}

interface CartData {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isHydrated: boolean;
}

// ---------------------------------------------------------------------------
// Reducer — pure, no side effects
// ---------------------------------------------------------------------------

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { cart: action.cart, isHydrated: true };
    case 'ADD': {
      const existing = state.cart.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.id === action.item.id
              ? { ...i, quantity: Math.max(0, i.quantity + action.qty) }
              : i
          ).filter((i) => i.quantity > 0),
        };
      }
      if (action.qty <= 0) return state;
      return { ...state, cart: [...state.cart, { ...action.item, quantity: action.qty }] };
    }
    case 'REMOVE':
      return { ...state, cart: state.cart.filter((i) => i.id !== action.id) };
    case 'UPDATE': {
      if (action.quantity <= 0) {
        return { ...state, cart: state.cart.filter((i) => i.id !== action.id) };
      }
      return {
        ...state,
        cart: state.cart.map((i) =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case 'CLEAR':
      return { ...state, cart: [] };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Two separate contexts: actions never change, data changes on every update
// ---------------------------------------------------------------------------

const CartActionsContext = createContext<CartActions | null>(null);
const CartDataContext = createContext<CartData | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { cart: [], isHydrated: false });
  const { user } = useAuth();

  // hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('kerala-grocery-cart');
      dispatch({ type: 'HYDRATE', cart: raw ? JSON.parse(raw) : [] });
    } catch {
      dispatch({ type: 'HYDRATE', cart: [] });
    }
  }, []);

  // Sync Cart to Supabase when user is logged in
  useEffect(() => {
    if (!user || !state.isHydrated) return;

    const syncCart = async () => {
      const supabase = getSupabase();

      if (state.cart.length === 0) {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
        return;
      }

      const itemsToSync = state.cart.map(item => ({
        user_id: user.id,
        product_id: item.id,
        quantity: item.quantity,
        updated_at: new Date().toISOString()
      }));

      // 1. Upsert current items (preserves what we have if the next step fails)
      const { error: upsertError } = await supabase.from('cart_items')
        .upsert(itemsToSync, { onConflict: 'user_id, product_id' });

      if (upsertError) {
        console.error('[CartContext] syncCart upsert error:', upsertError);
        return;
      }

      // 2. Remove items that are no longer in the local cart
      const currentProductIds = state.cart.map(i => i.id);
      const { error: deleteError } = await supabase.from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .filter('product_id', 'not.in', `(${currentProductIds.join(',')})`);

      if (deleteError) {
        console.error('[CartContext] syncCart cleanup error:', deleteError);
      }
    };

    const timer = setTimeout(syncCart, 2000); // Debounce sync by 2 seconds
    return () => clearTimeout(timer);
  }, [state.cart, state.isHydrated, user]);

  // persist on change
  const cartRef = useRef(state.cart);
  cartRef.current = state.cart;
  useEffect(() => {
    if (!state.isHydrated) return;
    localStorage.setItem('kerala-grocery-cart', JSON.stringify(state.cart));
  }, [state.cart, state.isHydrated]);

  // stable actions — never recreated
  const actions = useMemo<CartActions>(() => ({
    addToCart(item, quantity = 1) {
      dispatch({ type: 'ADD', item, qty: quantity });
    },
    removeFromCart(id) {
      dispatch({ type: 'REMOVE', id });
    },
    updateQuantity(id, quantity) {
      dispatch({ type: 'UPDATE', id, quantity });
    },
    clearCart() {
      dispatch({ type: 'CLEAR' });
    },
    getQuantity(id) {
      return cartRef.current.find((i) => i.id === id)?.quantity ?? 0;
    },
  }), []);

  const data = useMemo<CartData>(() => ({
    cart: state.cart,
    cartCount: state.cart.reduce((s, i) => s + i.quantity, 0),
    cartTotal: state.cart.reduce((s, i) => s + i.price * i.quantity, 0),
    isHydrated: state.isHydrated,
  }), [state]);

  return (
    <CartActionsContext.Provider value={actions}>
      <CartDataContext.Provider value={data}>
        {children}
      </CartDataContext.Provider>
    </CartActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCart() {
  const actions = useContext(CartActionsContext);
  const data = useContext(CartDataContext);
  if (!actions || !data) throw new Error('useCart must be used within CartProvider');
  return { ...data, ...actions };
}

export function useCartData() {
  const ctx = useContext(CartDataContext);
  if (!ctx) throw new Error('useCartData must be used within CartProvider');
  return ctx;
}

export function useCartActions() {
  const ctx = useContext(CartActionsContext);
  if (!ctx) throw new Error('useCartActions must be used within CartProvider');
  return ctx;
}
