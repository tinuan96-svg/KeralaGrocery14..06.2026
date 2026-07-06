import { getSupabase } from '@/lib/supabase/client';

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressInput = Omit<CustomerAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export async function getAddresses(userId: string): Promise<CustomerAddress[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[addressService] getAddresses error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function addAddress(
  userId: string,
  input: AddressInput
): Promise<{ data: CustomerAddress | null; error: string | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({ ...input, user_id: userId })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[addressService] addAddress error:', error.message);
    const message = error.message.includes('Maximum of 10')
      ? 'You can only save up to 10 addresses.'
      : error.message;
    return { data: null, error: message };
  }
  return { data, error: null };
}

export async function updateAddress(
  addressId: string,
  userId: string,
  input: Partial<AddressInput>
): Promise<{ data: CustomerAddress | null; error: string | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customer_addresses')
    .update(input)
    .eq('id', addressId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[addressService] updateAddress error:', error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function deleteAddress(
  addressId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) {
    console.error('[addressService] deleteAddress error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function setDefaultAddress(
  addressId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', userId);

  if (error) {
    console.error('[addressService] setDefaultAddress error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}
