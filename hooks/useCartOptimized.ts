import { useCartData, useCartActions } from '@/lib/context/CartContext';

export function useCartCount() {
  return useCartData().cartCount;
}

export function useCartTotal() {
  return useCartData().cartTotal;
}

export { useCartActions };
