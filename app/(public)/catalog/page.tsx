import type { Metadata } from 'next';
import CatalogListing from '@/components/catalog/CatalogListing';

// In static export, we don't use force-dynamic
// export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Product Catalog | Kerala Groceries',
  description: 'Browse our full product catalog — spices, rice, snacks, pickles, oils and more.',
};

export default function CatalogPage() {
  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse our full range of authentic Kerala and Indian groceries
          </p>
        </div>
      </div>

      <CatalogListing />
    </div>
  );
}
