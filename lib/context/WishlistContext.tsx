'use client';

import React, {
  createContext, useContext, useReducer, useEffect, useMemo,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  slug: string;
}

type WishlistAction =
  | { type: 'HYDRATE'; items: WishlistItem[] }
  | { type: 'ADD'; item: WishlistItem }
  | { type: 'REMOVE'; id: string }
  | { type: 'TOGGLE'; item: WishlistItem };

interface WishlistState {
  items: WishlistItem[];
  isHydrated: boolean;
}

interface WishlistActions {
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
}

interface WishlistData {
  wishlist: WishlistItem[];
  wishlistCount: number;
  isHydrated: boolean;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items, isHydrated: true };
    case 'ADD':
      if (state.items.find((i) => i.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'TOGGLE': {
      const exists = state.items.find((i) => i.id === action.item.id);
      return {
        ...state,
        items: exists
          ? state.items.filter((i) => i.id !== action.item.id)
          : [...state.items, action.item],
      };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Two contexts
// ---------------------------------------------------------------------------

const WishlistActionsContext = createContext<WishlistActions | null>(null);
const WishlistDataContext = createContext<WishlistData | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [], isHydrated: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kerala-grocery-wishlist');
      dispatch({ type: 'HYDRATE', items: raw ? JSON.parse(raw) : [] });
    } catch {
      dispatch({ type: 'HYDRATE', items: [] });
    }
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;
    localStorage.setItem('kerala-grocery-wishlist', JSON.stringify(state.items));
  }, [state.items, state.isHydrated]);

  const actions = useMemo<WishlistActions>(() => ({
    addToWishlist(item) { dispatch({ type: 'ADD', item }); },
    removeFromWishlist(id) { dispatch({ type: 'REMOVE', id }); },
    toggleWishlist(item) { dispatch({ type: 'TOGGLE', item }); },
    isInWishlist(id) {
      // reading state directly here is fine — this closure is stable but
      // calling it reads the latest reducer state via the dispatch closure
      return false; // overridden below via data context
    },
  }), []);

  const data = useMemo<WishlistData>(() => ({
    wishlist: state.items,
    wishlistCount: state.items.length,
    isHydrated: state.isHydrated,
  }), [state]);

  // isInWishlist needs current items — provide it via the combined hook
  const stableActions = useMemo<WishlistActions>(() => ({
    ...actions,
    isInWishlist: (id: string) => state.items.some((i) => i.id === id),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [actions, state.items]);

  return (
    <WishlistActionsContext.Provider value={stableActions}>
      <WishlistDataContext.Provider value={data}>
        {children}
      </WishlistDataContext.Provider>
    </WishlistActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useWishlist() {
  const actions = useContext(WishlistActionsContext);
  const data = useContext(WishlistDataContext);
  if (!actions || !data) throw new Error('useWishlist must be used within WishlistProvider');
  return { ...data, ...actions };
}

export function useWishlistData() {
  const ctx = useContext(WishlistDataContext);
  if (!ctx) throw new Error('useWishlistData must be used within WishlistProvider');
  return ctx;
}

export function useWishlistActions() {
  const ctx = useContext(WishlistActionsContext);
  if (!ctx) throw new Error('useWishlistActions must be used within WishlistProvider');
  return ctx;
}
