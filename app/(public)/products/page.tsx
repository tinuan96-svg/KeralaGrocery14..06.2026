import type { Metadata } from 'next';
import ProductListingPage from '@/components/product/RpcProductListingPage';

// In static export, we don't use force-dynamic
// export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Buy Kerala & Indian Groceries Online UK | All Products',
  description:
    'Shop authentic Kerala and Indian groceries online. Browse spices, rice, snacks, pickles, ready meals, oils, and more. Fast UK delivery by Tasty Kerala Ltd.',
  alternates: {
    canonical: 'https://keralagrocery.com/products',
  },
  openGraph: {
    title: 'Buy Kerala & Indian Groceries Online UK | All Products',
    description:
      'Shop authentic Kerala and Indian groceries online. Browse spices, rice, snacks, pickles, ready meals, oils, and more. Fast UK delivery.',
    url: 'https://keralagrocery.com/products',
    type: 'website',
  },
};

export default function ProductsPage() {
  return <ProductListingPage />;
}
