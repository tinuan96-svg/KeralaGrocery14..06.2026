'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/config/departments';

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CategoryDrawer({ open, onClose }: CategoryDrawerProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSelectedDept(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const currentDept = selectedDept ? DEPARTMENTS.find((d) => d.slug === selectedDept) : null;

  return (
    <div className="lg:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Categories">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#d1ead9] flex-shrink-0">
          {selectedDept ? (
            <button
              onClick={() => setSelectedDept(null)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <h2 className="text-base font-bold text-gray-900">Categories</h2>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close categories"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedDept && (
            <div className="py-2">
              <Link
                href="/products"
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[#f4faf6] transition-colors"
              >
                <span className="text-sm font-bold text-[#0B5D3B]">Shop All Products</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
              <div className="h-px bg-[#d1ead9] mx-4" />
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.slug}
                  onClick={() => setSelectedDept(dept.slug)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#f4faf6] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{dept.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{dept.label}</p>
                      <p className="text-[11px] text-gray-400">{dept.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {selectedDept && currentDept && (
            <div className="py-2">
              <div className="px-4 py-3 flex items-center gap-2 bg-[#f4faf6]">
                <span className="text-xl">{currentDept.emoji}</span>
                <p className="text-sm font-bold text-[#0B5D3B]">{currentDept.label}</p>
              </div>
              <Link
                href={`/products?filter=${currentDept.categorySlugs[0] || currentDept.slug}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#f4faf6] transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700">All {currentDept.label}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
              <div className="h-px bg-[#d1ead9] mx-4" />
              {currentDept.subcategories.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/products?search=${encodeURIComponent(sub.label)}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#f4faf6] transition-colors"
                >
                  <span className="text-sm text-gray-600">{sub.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer links */}
        {!selectedDept && (
          <div className="border-t border-[#d1ead9] px-4 py-3 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/products?filter=deals"
                onClick={onClose}
                className="text-center text-xs font-bold text-[#0B5D3B] bg-[#f4faf6] border border-[#d1ead9] rounded-xl py-2.5"
              >
                Deals & Offers
              </Link>
              <Link
                href="/products?sort=new"
                onClick={onClose}
                className="text-center text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl py-2.5"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
