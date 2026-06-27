import { useWishlistData, useWishlistActions } from '@/lib/context/WishlistContext';

export function useWishlistCount() {
  return useWishlistData().wishlistCount;
}

export { useWishlistActions };

export function useIsInWishlist(productId: string) {
  const { wishlist } = useWishlistData();
  return wishlist.some((i) => i.id === productId);
}
