import { getSupabase } from '@/lib/supabase/client';
import type { HomepageGridCard } from '@/lib/types/database';

/**
 * Service to manage Amazon-style homepage grid cards.
 * Table: homepage_grid_cards
 */

export async function fetchActiveGridCards(): Promise<HomepageGridCard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('homepage_grid_cards')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[homepageGridService] fetchActiveGridCards:', error.message);
    return [];
  }
  return (data ?? []) as HomepageGridCard[];
}

export async function fetchAllGridCards(): Promise<HomepageGridCard[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('homepage_grid_cards')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[homepageGridService] fetchAllGridCards:', error.message);
    return [];
  }
  return (data ?? []) as HomepageGridCard[];
}

export async function upsertGridCard(card: Partial<HomepageGridCard>): Promise<HomepageGridCard | null> {
  const supabase = getSupabase();
  const payload = { ...card, updated_at: new Date().toISOString() };

  if (card.id) {
    const { data, error } = await supabase
      .from('homepage_grid_cards')
      .update(payload)
      .eq('id', card.id)
      .select()
      .single();
    if (error) {
      console.error('[homepageGridService] upsertGridCard update:', error.message);
      return null;
    }
    return data as HomepageGridCard;
  }

  const { data, error } = await supabase
    .from('homepage_grid_cards')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('[homepageGridService] upsertGridCard insert:', error.message);
    return null;
  }
  return data as HomepageGridCard;
}

export async function deleteGridCard(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('homepage_grid_cards')
    .delete()
    .eq('id', id);
  return !error;
}
