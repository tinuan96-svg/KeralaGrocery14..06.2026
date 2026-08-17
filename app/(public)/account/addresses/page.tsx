'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Plus, Pencil, Trash2, Star, Chrome as Home, Briefcase, MoveHorizontal as MoreHorizontal, ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuth } from '@/lib/context/AuthContext';
import AddressForm from '@/components/account/AddressForm';
import type { CustomerAddress, AddressInput } from '@/lib/services/addressService';

function labelIcon(label: string) {
  if (label === 'Home') return <Home className="w-4 h-4" />;
  if (label === 'Work') return <Briefcase className="w-4 h-4" />;
  return <MoreHorizontal className="w-4 h-4" />;
}

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addresses, loading, add, update, remove, setDefault } = useAddresses();
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/account');
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleAdd = async (input: AddressInput) => {
    setSaving(true);
    const result = await add(input);
    setSaving(false);
    if (!result.error) {
      setMode('list');
      setSuccess('Address added successfully.');
      setTimeout(() => setSuccess(null), 3000);
    }
    return result;
  };

  const handleUpdate = async (input: AddressInput) => {
    if (!editing) return { error: 'No address selected' };
    setSaving(true);
    const result = await update(editing.id, input);
    setSaving(false);
    if (!result.error) {
      setMode('list');
      setEditing(null);
      setSuccess('Address updated.');
      setTimeout(() => setSuccess(null), 3000);
    }
    return result;
  };

  const handleDelete = async (id: string) => {
    const result = await remove(id);
    if (!result.error) {
      setSuccess('Address removed.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefault(id);
    setSuccess('Default address updated.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const canAdd = addresses.length < 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/account" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Address Book</h1>
            <p className="text-xs text-gray-400 mt-0.5">{addresses.length} / 10 addresses saved</p>
          </div>
          {mode === 'list' && canAdd && (
            <Button
              onClick={() => { setMode('add'); setEditing(null); }}
              className="ml-auto bg-[#0B5D3B] hover:bg-green-700 text-white h-9 rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Address
            </Button>
          )}
        </div>

        {/* Success toast */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Add / Edit form */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">
              {mode === 'add' ? 'New Address' : 'Edit Address'}
            </h2>
            <AddressForm
              initial={editing ?? undefined}
              onSave={mode === 'add' ? handleAdd : handleUpdate}
              onCancel={() => { setMode('list'); setEditing(null); }}
              saving={saving}
            />
          </div>
        )}

        {/* Address list */}
        {mode === 'list' && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-48 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-36" />
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium mb-1">No saved addresses</p>
                <p className="text-gray-400 text-sm mb-5">Add an address to speed up checkout</p>
                <Button
                  onClick={() => setMode('add')}
                  className="bg-[#0B5D3B] hover:bg-green-700 text-white rounded-xl font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Your First Address
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                      addr.is_default
                        ? 'border-green-400 shadow-sm shadow-green-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                          addr.is_default
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {labelIcon(addr.label)}
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-green-500 text-green-500" /> Default
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setEditing(addr); setMode('edit'); }}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete address?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the {addr.label} address at {addr.address_line_1}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(addr.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-900">{addr.full_name}</p>
                    {addr.phone && <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>}
                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                      {addr.address_line_1}
                      {addr.address_line_2 && `, ${addr.address_line_2}`}
                      <br />
                      {addr.city}{addr.county ? `, ${addr.county}` : ''}, {addr.postcode}
                    </p>

                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="mt-3 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors"
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                ))}

                {!canAdd && (
                  <p className="text-xs text-center text-gray-400 py-2">
                    Maximum of 10 addresses reached. Delete one to add a new address.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
