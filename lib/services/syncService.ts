/**
 * @deprecated This service is legacy. Use the 'centralhub-sync' Supabase Edge Function instead.
 *
 * CentralHub → KeralaGroceries Sync Service
 *
 * This runs server-side (Edge Function or server action). It is the only place
 * that talks to the CentralHub API — storefront components never touch it.
 *
 * Local-override protection: these fields are NEVER overwritten by a sync:
 *   category_id, image_url, image_main, short_description, description,
 *   seo_title, seo_description, seo_keywords, price, compare_price,
 *   is_featured, tags, visibility_status, approval_status, approved_by, approved_at
 *
 * Only the following are updated on re-sync of an existing product:
 *   source_name, is_active, is_deleted, last_sync_at
 *
 * New products are inserted with:
 *   approval_status = 'draft', visibility_status = false
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CentralHubClient, type CentralHubProduct } from '@/lib/api/centralhub';

export interface SyncResult {
  logId: string;
  totalFetched: number;
  importedNew: number;
  updatedExisting: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

function makeUniqueSlug(base: string, suffix: string): string {
  return `${base}-${suffix.slice(-8)}`;
}

export async function runSync(
  supabase: SupabaseClient,
  hubClient: CentralHubClient,
  triggeredBy: 'manual' | 'scheduled' = 'manual'
): Promise<SyncResult> {
  const start = Date.now();

  // 1. Create a running sync_log entry
  const { data: logRow, error: logErr } = await supabase
    .from('sync_log')
    .insert({ triggered_by: triggeredBy, status: 'running' })
    .select('id')
    .single();

  const logId = logRow?.id ?? 'unknown';
  if (logErr) console.error('[syncService] Could not create sync_log entry:', logErr.message);

  const errors: string[] = [];
  let totalFetched = 0;
  let importedNew = 0;
  let updatedExisting = 0;
  let failed = 0;

  try {
    // 2. Fetch all products from CentralHub
    const { data: hubProducts, totalCount, error: fetchErr } = await hubClient.fetchAllProducts();

    if (fetchErr) {
      errors.push(`CentralHub fetch failed: ${fetchErr}`);
      await finalizeSyncLog(supabase, logId, 'error', { totalFetched: 0, importedNew: 0, updatedExisting: 0, failed: 0, errors });
      return { logId, totalFetched: 0, importedNew: 0, updatedExisting: 0, failed: 0, errors, durationMs: Date.now() - start };
    }

    totalFetched = totalCount;

    if (hubProducts.length === 0) {
      await finalizeSyncLog(supabase, logId, 'success', { totalFetched, importedNew, updatedExisting, failed, errors });
      return { logId, totalFetched, importedNew, updatedExisting, failed, errors, durationMs: Date.now() - start };
    }

    // 3. Load existing source_product_ids to detect new vs existing
    const { data: existing } = await supabase
      .from('products')
      .select('id, source_product_id, name, slug')
      .not('source_product_id', 'is', null);

    const existingBySourceId = new Map<string, { id: string; name: string; slug: string }>();
    for (const row of existing ?? []) {
      if (row.source_product_id) existingBySourceId.set(row.source_product_id, row);
    }

    // 4. Also load all current slugs to avoid conflicts on new inserts
    const { data: allSlugs } = await supabase.from('products').select('slug');
    const usedSlugs = new Set((allSlugs ?? []).map((r: { slug: string }) => r.slug));

    const now = new Date().toISOString();

    // 5. Process in batches of 50 to avoid large payloads
    const BATCH = 50;
    for (let i = 0; i < hubProducts.length; i += BATCH) {
      const batch = hubProducts.slice(i, i + BATCH);

      for (const hp of batch) {
        try {
          await processProduct(supabase, hp, existingBySourceId, usedSlugs, now);
          if (existingBySourceId.has(hp.id)) {
            updatedExisting++;
          } else {
            importedNew++;
            // Add to map so later items in the same batch don't try to re-insert
            existingBySourceId.set(hp.id, { id: '', name: hp.name, slug: '' });
          }
        } catch (err) {
          failed++;
          errors.push(`${hp.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    await finalizeSyncLog(supabase, logId, 'success', { totalFetched, importedNew, updatedExisting, failed, errors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error';
    errors.push(msg);
    await finalizeSyncLog(supabase, logId, 'error', { totalFetched, importedNew, updatedExisting, failed, errors });
  }

  return {
    logId,
    totalFetched,
    importedNew,
    updatedExisting,
    failed,
    errors,
    durationMs: Date.now() - start,
  };
}

async function processProduct(
  supabase: SupabaseClient,
  hp: CentralHubProduct,
  existingBySourceId: Map<string, { id: string; name: string; slug: string }>,
  usedSlugs: Set<string>,
  now: string
): Promise<void> {
  const existing = existingBySourceId.get(hp.id);

  if (existing && existing.id) {
    // EXISTS — only update non-locally-managed fields
    const { error } = await supabase
      .from('products')
      .update({
        source_name: hp.name,
        is_active: hp.is_active ?? true,
        is_deleted: hp.is_deleted ?? false,
        last_sync_at: now,
        updated_at: now,
      })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
  } else {
    // NEW — insert with draft status, all fields from CentralHub (admin will enrich locally)
    let slug = hp.slug?.trim() || slugify(hp.name);
    if (!slug) slug = makeUniqueSlug('product', hp.id);

    // Ensure slug is unique
    if (usedSlugs.has(slug)) {
      slug = makeUniqueSlug(slug, hp.id);
    }
    // If still not unique (extremely rare), append timestamp
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${Date.now()}`;
    }
    usedSlugs.add(slug);

    const { error } = await supabase.from('products').insert({
      source_product_id: hp.id,
      source_name: hp.name,
      name: hp.name,
      slug,
      // Do NOT set locally-managed fields — admin will fill them
      description: null,
      short_description: null,
      image_url: hp.image_url ?? null,
      category_id: null,
      brand_id: null,
      price: 0, // admin must set price before approval
      original_price: hp.original_price ?? null,
      is_active: hp.is_active ?? true,
      is_deleted: false,
      is_featured: false,
      is_deal: false,
      is_new_arrival: false,
      is_bestseller: false,
      discount_percentage: hp.discount_percentage ?? 0,
      sold_count: hp.sold_count ?? 0,
      rating: hp.rating ?? 4.5,
      review_count: hp.review_count ?? 0,
      // Approval workflow — always draft on import
      approval_status: 'draft',
      visibility_status: false,
      last_sync_at: now,
      created_at: hp.created_at ?? now,
    });

    if (error) throw new Error(error.message);
  }
}

async function finalizeSyncLog(
  supabase: SupabaseClient,
  logId: string,
  status: 'success' | 'error',
  data: {
    totalFetched: number;
    importedNew: number;
    updatedExisting: number;
    failed: number;
    errors: string[];
  }
) {
  if (logId === 'unknown') return;
  await supabase
    .from('sync_log')
    .update({
      finished_at: new Date().toISOString(),
      status,
      total_fetched: data.totalFetched,
      imported_new: data.importedNew,
      updated_existing: data.updatedExisting,
      failed: data.failed,
      error_detail: data.errors.slice(0, 50), // cap error array
    })
    .eq('id', logId);
}

// ─── Diagnostic helpers (called from admin UI via Edge Function) ─────────────

export interface SyncDiagnostics {
  apiConnected: boolean;
  apiError: string | null;
  centralHubTotal: number;
  localTotal: number;
  localDraft: number;
  localApproved: number;
  localRejected: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncImported: number;
  lastSyncUpdated: number;
  lastSyncFailed: number;
  lastSyncErrors: string[];
}

export async function fetchSyncDiagnostics(
  supabase: SupabaseClient,
  hubClient: CentralHubClient
): Promise<SyncDiagnostics> {
  const [pingResult, localCounts, lastLog] = await Promise.all([
    hubClient.ping(),
    fetchLocalCounts(supabase),
    fetchLastSyncLog(supabase),
  ]);

  let centralHubTotal = 0;
  if (pingResult.ok) {
    const { totalCount } = await hubClient.fetchProductsPage(1, 1);
    centralHubTotal = totalCount;
  }

  return {
    apiConnected: pingResult.ok,
    apiError: pingResult.error,
    centralHubTotal,
    ...localCounts,
    lastSyncAt: lastLog?.started_at ?? null,
    lastSyncStatus: lastLog?.status ?? null,
    lastSyncImported: lastLog?.imported_new ?? 0,
    lastSyncUpdated: lastLog?.updated_existing ?? 0,
    lastSyncFailed: lastLog?.failed ?? 0,
    lastSyncErrors: lastLog?.error_detail ?? [],
  };
}

async function fetchLocalCounts(supabase: SupabaseClient) {
  const [total, draft, approved, rejected, syncTime] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'draft').eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected').eq('is_deleted', false),
    supabase.from('products').select('last_sync_at').not('last_sync_at', 'is', null).order('last_sync_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    localTotal: total.count ?? 0,
    localDraft: draft.count ?? 0,
    localApproved: approved.count ?? 0,
    localRejected: rejected.count ?? 0,
    lastSyncAt: syncTime.data?.last_sync_at ?? null,
  };
}

async function fetchLastSyncLog(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('sync_log')
    .select('started_at, status, imported_new, updated_existing, failed, error_detail')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
