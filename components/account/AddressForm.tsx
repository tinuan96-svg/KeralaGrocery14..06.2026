'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AddressAutocomplete, { type SelectedAddress } from '@/components/ui/AddressAutocomplete';
import type { AddressInput, CustomerAddress } from '@/lib/services/addressService';

const LABELS = ['Home', 'Work', 'Other'] as const;

interface Props {
  initial?: CustomerAddress;
  onSave: (input: AddressInput) => Promise<{ error: string | null } | { data: CustomerAddress | null; error: string | null }>;
  onCancel: () => void;
  saving?: boolean;
}

const blank: AddressInput = {
  label: 'Home',
  full_name: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  county: '',
  postcode: '',
  country: 'GB',
  is_default: false,
};

export default function AddressForm({ initial, onSave, onCancel, saving }: Props) {
  const [form, setForm] = useState<AddressInput>(initial ? {
    label: initial.label,
    full_name: initial.full_name,
    phone: initial.phone,
    address_line_1: initial.address_line_1,
    address_line_2: initial.address_line_2,
    city: initial.city,
    county: initial.county,
    postcode: initial.postcode,
    country: initial.country,
    is_default: initial.is_default,
  } : blank);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: keyof AddressInput, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleAutocomplete = (sel: SelectedAddress) => {
    setForm(prev => ({
      ...prev,
      address_line_1: sel.address || prev.address_line_1,
      city: sel.city || prev.city,
      postcode: sel.postcode || prev.postcode,
    }));
  };

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!form.address_line_1.trim()) return 'Street address is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.postcode.trim()) return 'Postcode is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    const result = await onSave(form);
    if (result.error) setFormError(result.error);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label type */}
      <div>
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
          Address Type
        </Label>
        <div className="flex gap-2">
          {LABELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => set('label', l)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                form.label === l
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
          {!LABELS.includes(form.label as typeof LABELS[number]) && (
            <span className="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-green-500 bg-green-50 text-green-700">
              {form.label}
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="John Smith"
            className="h-10 border-gray-200 focus:border-green-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+44 7xxx xxxxxx"
            className="h-10 border-gray-200 focus:border-green-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <AddressAutocomplete
          name="address_line_1"
          value={form.address_line_1}
          onChange={val => set('address_line_1', val)}
          onAddressSelect={handleAutocomplete}
          placeholder="Start typing your address..."
          className="h-10 border-gray-200 focus:border-green-500"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Apartment / Unit <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </Label>
        <Input
          value={form.address_line_2}
          onChange={e => set('address_line_2', e.target.value)}
          placeholder="Flat 2B, Floor 3..."
          className="h-10 border-gray-200 focus:border-green-500"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="London"
            className="h-10 border-gray-200 focus:border-green-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            County <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </Label>
          <Input
            value={form.county}
            onChange={e => set('county', e.target.value)}
            placeholder="Surrey"
            className="h-10 border-gray-200 focus:border-green-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Postcode <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.postcode}
            onChange={e => set('postcode', e.target.value.toUpperCase())}
            placeholder="SW1A 1AA"
            className="h-10 border-gray-200 focus:border-green-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          onClick={() => set('is_default', !form.is_default)}
          className={`relative w-10 h-5 rounded-full transition-colors ${form.is_default ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_default ? 'left-[22px]' : 'left-0.5'}`} />
        </div>
        <span className="text-sm text-gray-700 font-medium">Set as default delivery address</span>
      </label>

      {formError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#0B5D3B] hover:bg-green-700 text-white font-semibold h-11 rounded-xl"
        >
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Address'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="px-6 h-11 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
