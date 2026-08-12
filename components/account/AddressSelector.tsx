'use client';

import { useState } from 'react';
import { MapPin, Plus, Chrome as Home, Briefcase, MoveHorizontal as MoreHorizontal, ChevronDown, ChevronUp, Star } from 'lucide-react';
import AddressForm from '@/components/account/AddressForm';
import { useAddresses } from '@/hooks/useAddresses';
import type { CustomerAddress, AddressInput } from '@/lib/services/addressService';

function labelIcon(label: string) {
  if (label === 'Home') return <Home className="w-3.5 h-3.5" />;
  if (label === 'Work') return <Briefcase className="w-3.5 h-3.5" />;
  return <MoreHorizontal className="w-3.5 h-3.5" />;
}

interface Props {
  selectedId: string | null;
  onSelect: (address: CustomerAddress) => void;
}

export default function AddressSelector({ selectedId, onSelect }: Props) {
  const { addresses, loading, add, refresh } = useAddresses();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? addresses : addresses.slice(0, 3);

  const handleAdd = async (input: AddressInput) => {
    setSaving(true);
    const result = await add(input);
    setSaving(false);
    if (!result.error && 'data' in result && result.data) {
      onSelect(result.data);
      setShowAdd(false);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (addresses.length === 0 && !showAdd) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a delivery address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Saved address radio cards */}
      {visible.map(addr => {
        const isSelected = selectedId === addr.id;
        return (
          <button
            key={addr.id}
            type="button"
            onClick={() => onSelect(addr)}
            className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              isSelected ? 'border-green-500' : 'border-gray-300'
            }`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-green-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {labelIcon(addr.label)}
                  {addr.label}
                </span>
                {addr.is_default && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Default
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{addr.full_name}</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city}, {addr.postcode}
              </p>
            </div>
          </button>
        );
      })}

      {/* Show more / less */}
      {addresses.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show {addresses.length - 3} more addresses</>
          )}
        </button>
      )}

      {/* Add new address */}
      {!showAdd && addresses.length < 10 && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-2 border border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add a new address
        </button>
      )}

      {showAdd && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
          <p className="text-sm font-semibold text-gray-800 mb-4">New Delivery Address</p>
          <AddressForm
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
