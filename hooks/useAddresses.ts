'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type CustomerAddress,
  type AddressInput,
} from '@/lib/services/addressService';

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getAddresses(user.id);
    setAddresses(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (input: AddressInput) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const result = await addAddress(user.id, input);
    if (!result.error) await refresh();
    return result;
  }, [user?.id, refresh]);

  const update = useCallback(async (id: string, input: Partial<AddressInput>) => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };
    const result = await updateAddress(id, user.id, input);
    if (!result.error) await refresh();
    return result;
  }, [user?.id, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const result = await deleteAddress(id, user.id);
    if (!result.error) await refresh();
    return result;
  }, [user?.id, refresh]);

  const setDefault = useCallback(async (id: string) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const result = await setDefaultAddress(id, user.id);
    if (!result.error) await refresh();
    return result;
  }, [user?.id, refresh]);

  const defaultAddress = addresses.find(a => a.is_default) ?? addresses[0] ?? null;

  return { addresses, loading, error, defaultAddress, refresh, add, update, remove, setDefault };
}
