import type { Metadata } from 'next';
import RpcProductListingPage from '@/components/product/RpcProductListingPage';

export const metadata: Metadata = {
  title: 'Shop Kerala & Indian Groceries Online UK',
  description:
    'Browse and shop authentic Kerala and Indian groceries in the UK. Spices, rice, snacks, pickles, ready meals, oils and more. Fast delivery across the UK.',
  alternates: {
    canonical: 'https://keralagrocery.com/shop',
  },
  openGraph: {
    title: 'Shop Kerala & Indian Groceries Online UK',
    description:
      'Browse authentic Kerala and Indian groceries. Spices, rice, snacks, pickles, ready meals, and more.',
    url: 'https://keralagrocery.com/shop',
    type: 'website',
  },
};

export default function ShopPage() {
  return <RpcProductListingPage />;
}
