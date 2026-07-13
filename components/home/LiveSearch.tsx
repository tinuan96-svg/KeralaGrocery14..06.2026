'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Loader2, ChevronRight, CornerDownRight } from 'lucide-react';
import { getProducts, type RpcProduct } from '@/lib/services/rpcApiClient';
import { useClickAway } from '@/hooks/useClickAway';
import { useRouter } from 'next/navigation';

interface Props {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  inputClassName?: string;
}

export default function LiveSearch({ placeholder, className, onSearch, inputClassName }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RpcProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useClickAway(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        const { products } = await getProducts({
          search: query,
          limit: 6,
          status: 'active'
        });
        setResults(products);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      onSearch?.(query);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0B5D3B] transition-colors" />
        <input
          type="search"
          placeholder={placeholder || "Search Kerala groceries..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#d1ead9] focus:border-[#0B5D3B] focus:ring-0 text-sm bg-[#f4faf6] focus:bg-white transition-all duration-200 outline-none placeholder:text-gray-400 text-gray-800 ${inputClassName}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
          </div>
        )}
      </form>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Results</span>
                <Link
                  href={`/products?search=${encodeURIComponent(query)}`}
                  className="text-[10px] font-bold text-green-700 hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  View All Results
                </Link>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug || product.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors group"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <div className="relative w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                      <Image
                        src={product.image_url || '/placeholder.webp'}
                        alt={product.display_title}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-[#0B5D3B] transition-colors">
                        {product.display_title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-green-700">£{product.price.toFixed(2)}</span>
                        {product.discount_pct > 0 && (
                          <span className="text-[10px] text-gray-400 line-through">£{product.original_price?.toFixed(2)}</span>
                        )}
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded uppercase font-bold">{product.category}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                  </Link>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                className="w-full px-4 py-3 bg-[#f4faf6] text-[#0B5D3B] text-xs font-bold flex items-center justify-between border-t border-gray-100 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CornerDownRight className="w-3 h-3" />
                  <span>Search all for &quot;{query}&quot;</span>
                </div>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : !loading ? (
            <div className="p-8 text-center">
              <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No matches found for &quot;{query}&quot;</p>
              <p className="text-xs text-gray-400 mt-1">Try checking for typos or use different terms.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
