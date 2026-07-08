import { getSupabase } from '@/lib/supabase/client';

export type ApprovalStatus = 'draft' | 'approved' | 'rejected';

export interface ApprovalProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  image_main: string | null;
  category_id: string | null;
  brand: string | null;
  source_brand: string | null;
  supplier_price: number | null;
  cost_price: number | null;
  selling_price: number | null;
  markup_percentage: number | null;
  price: number;
  compare_price: number | null;
  original_price: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_deal: boolean | null;
  is_new_arrival: boolean | null;
  is_bestseller: boolean | null;
  approval_status: ApprovalStatus;
  visibility_status: boolean;
  approved_at: string | null;
  last_sync_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
  categories?: { id: string; name: string; slug: string } | null;
  original_image_url: string | null;
  enhanced_image_url: string | null;
  thumbnail_url: string | null;
  image_processing_status: string | null;
  image_processed_at: string | null;
}

export interface ApprovalStats {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
  deleted: number;
  missingFields: number;
  lastSyncAt: string | null;
}

export interface ProductEditPayload {
  name?: string;
  short_description?: string | null;
  description?: string | null;
  supplier_price?: number | null;
  cost_price?: number | null;
  selling_price?: number | null;
  price?: number;
  markup_percentage?: number | null;
  compare_price?: number | null;
  original_price?: number | null;
  category_id?: string | null;
  image_url?: string | null;
  image_main?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  is_deal?: boolean;
  is_new_arrival?: boolean;
  is_bestseller?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  tags?: string[] | null;
  visibility_status?: boolean;
}

export interface ApprovalError {
  message: string;
  stage: 'validation' | 'database' | 'unknown';
  missingFields?: string[];
  dbCode?: string;
  dbDetails?: string;
  dbHint?: string;
}

const SELECT = `
  id, name, slug, description, short_description,
  image_url, image_main, brand, source_brand,
  category_id, supplier_price, cost_price, selling_price, markup_percentage, price, compare_price, original_price,
  is_active, is_featured, is_deal, is_new_arrival, is_bestseller,
  approval_status, visibility_status, approved_at, last_sync_at,
  seo_title, seo_description, seo_keywords, tags,
  created_at, updated_at,
  original_image_url, enhanced_image_url, thumbnail_url, image_processing_status, image_processed_at
`;

export function isMissingRequiredFields(p: ApprovalProduct | Pick<ApprovalProduct, 'category_id' | 'image_url' | 'image_main' | 'short_description' | 'description' | 'price' | 'selling_price'>): string[] {
  const missing: string[] = [];
  if (!p.category_id) missing.push('category');
  if (!p.image_url && !p.image_main) missing.push('image');
  if (!(p as any).short_description?.trim()) missing.push('short description');
  if (!(p as any).description?.trim()) missing.push('description');
  const price = (p as any).selling_price ?? (p as any).price ?? 0;
  if (price <= 0) missing.push('selling price');
  return missing;
}

// Strict version used internally — checks all fields explicitly
function checkMissingFields(p: {
  category_id: string | null;
  image_url: string | null;
  image_main: string | null;
  short_description: string | null;
  description: string | null;
  price?: number;
  selling_price?: number | null;
}): string[] {
  const missing: string[] = [];
  if (!p.category_id) missing.push('category');
  if (!p.image_url && !p.image_main) missing.push('image');
  if (!p.short_description?.trim()) missing.push('short description');
  if (!p.description?.trim()) missing.push('description');
  const price = p.selling_price ?? p.price ?? 0;
  if (price <= 0) missing.push('selling price');
  return missing;
}

async function writeApprovalLog(opts: {
  productId: string;
  productName: string;
  action: 'approve' | 'reject' | 'draft' | 'bulk_approve';
  adminUser: string | null;
  success: boolean;
  errorMessage?: string | null;
  missingFields?: string[];
  approvalStatusBefore?: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('approval_logs').insert({
      product_id: opts.productId,
      product_name: opts.productName,
      action: opts.action,
      admin_user: opts.adminUser ?? null,
      success: opts.success,
      error_message: opts.errorMessage ?? null,
      missing_fields: opts.missingFields && opts.missingFields.length > 0 ? opts.missingFields : null,
      approval_status_before: opts.approvalStatusBefore ?? null,
    });
  } catch (err) {
    // Never let audit log failures surface to callers
    console.error('[approvalLog] Failed to write audit log:', err);
  }
}

export async function fetchApprovalStats(): Promise<ApprovalStats> {
  const supabase = getSupabase();

  const [totalRes, draftRes, approvedRes, rejectedRes, deletedRes, syncRes] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'draft').eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected').eq('is_deleted', false),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_deleted', true),
    supabase.from('products').select('last_sync_at').order('last_sync_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const { data: draftProducts } = await supabase
    .from('products')
    .select('id, category_id, image_url, image_main, short_description, description, price, selling_price')
    .eq('approval_status', 'draft')
    .eq('is_deleted', false);

  const missingFields = (draftProducts ?? []).filter(p =>
    checkMissingFields(p as any).length > 0
  ).length;

  return {
    total: totalRes.count ?? 0,
    draft: draftRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    deleted: deletedRes.count ?? 0,
    missingFields,
    lastSyncAt: syncRes.data?.last_sync_at ?? null,
  };
}

export async function fetchProductsByStatus(
  status: ApprovalStatus | 'missing',
  page = 1,
  pageSize = 30,
  search = '',
  sortField: 'created_at' | 'name' | 'brand' | 'price' = 'created_at',
  sortAsc = false,
  brandFilter = ''
): Promise<{ products: ApprovalProduct[]; total: number; error: string | null }> {
  const supabase = getSupabase();

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select(SELECT, { count: 'exact' })
      .eq('is_deleted', false)
      .order(sortField, { ascending: sortAsc, nullsFirst: false })
      .range(from, to);

    if (status !== 'missing') {
      query = query.eq('approval_status', status);
    } else {
      query = query.eq('approval_status', 'draft');
    }

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},brand.ilike.${term},source_brand.ilike.${term}`);
    }

    if (brandFilter.trim()) {
      query = query.or(`brand.eq.${brandFilter.trim()},source_brand.eq.${brandFilter.trim()}`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[productApprovalService] fetch error:', error);
      return { products: [], total: 0, error: error.message };
    }

    let products = (data ?? []) as unknown as ApprovalProduct[];

    // Manually map categories to avoid relationship schema issues
    try {
      const { data: catData } = await supabase.from('categories').select('id, name, slug');
      if (catData) {
        const catMap = new Map(catData.map(c => [c.id, c]));
        products = products.map(p => ({
          ...p,
          categories: p.category_id ? catMap.get(p.category_id) : null
        }));
      }
    } catch (catErr) {
      console.warn('[productApprovalService] Failed to map categories:', catErr);
    }

    if (status === 'missing') {
      products = products.filter(p => checkMissingFields(p).length > 0);
    }

    return { products, total: count ?? 0, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { products: [], total: 0, error: msg };
  }
}

export async function updateProduct(
  productId: string,
  payload: ProductEditPayload
): Promise<{ error: string | null }> {
  const supabase = getSupabase();

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) clean[k] = v;
  }
  delete clean.brand_id;

  const { error } = await supabase
    .from('products')
    .update({ ...clean, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    console.error('[updateProduct] Supabase error:', error.code, error.message, error.details, error.hint);
    return { error: `${error.message}${error.details ? ` — ${error.details}` : ''}` };
  }
  return { error: null };
}

export async function approveProduct(
  productId: string,
  adminUserId: string
): Promise<{ error: string | null; approvalError?: ApprovalError }> {
  const supabase = getSupabase();

  // Fetch current product state
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, category_id, image_url, image_main, short_description, description, price, selling_price, approval_status')
    .eq('id', productId)
    .maybeSingle();

  if (fetchErr || !product) {
    const msg = fetchErr?.message ?? 'Product not found';
    console.error('[approveProduct] fetch failed:', {
      product_id: productId,
      error: msg,
    });
    return {
      error: msg,
      approvalError: { message: msg, stage: 'database', dbCode: fetchErr?.code },
    };
  }

  // Frontend guard: validate before touching the DB
  const missing = checkMissingFields(product);
  if (missing.length > 0) {
    const msg = `Product cannot be approved. Missing: ${missing.join(', ')}`;
    console.warn('[approveProduct] validation failed:', {
      product_id: productId,
      product_name: product.name,
      missing_fields: missing,
    });
    await writeApprovalLog({
      productId,
      productName: product.name,
      action: 'approve',
      adminUser: adminUserId,
      success: false,
      errorMessage: msg,
      missingFields: missing,
      approvalStatusBefore: product.approval_status,
    });
    return {
      error: msg,
      approvalError: { message: msg, stage: 'validation', missingFields: missing },
    };
  }

  // Perform approval update
  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('products')
    .update({
      approval_status: 'approved',
      visibility_status: true,
      is_active: true,
      approved_at: now,
      approved_by: adminUserId,
      updated_at: now,
    })
    .eq('id', productId);

  if (updateErr) {
    const msg = `${updateErr.message}${updateErr.details ? ` — ${updateErr.details}` : ''}`;
    console.error('[approveProduct] update failed:', {
      product_id: productId,
      product_name: product.name,
      approval_status: product.approval_status,
      missing_fields: missing,
      error_message: updateErr.message,
      error_code: updateErr.code,
      error_details: updateErr.details,
      error_hint: updateErr.hint,
    });
    await writeApprovalLog({
      productId,
      productName: product.name,
      action: 'approve',
      adminUser: adminUserId,
      success: false,
      errorMessage: msg,
      approvalStatusBefore: product.approval_status,
    });
    return {
      error: msg,
      approvalError: {
        message: msg,
        stage: 'database',
        dbCode: updateErr.code,
        dbDetails: updateErr.details ?? undefined,
        dbHint: updateErr.hint ?? undefined,
      },
    };
  }

  await writeApprovalLog({
    productId,
    productName: product.name,
    action: 'approve',
    adminUser: adminUserId,
    success: true,
    approvalStatusBefore: product.approval_status,
  });

  return { error: null };
}

export async function rejectProduct(
  productId: string,
  adminUserId?: string
): Promise<{ error: string | null }> {
  const supabase = getSupabase();

  const { data: product } = await supabase
    .from('products')
    .select('id, name, approval_status')
    .eq('id', productId)
    .maybeSingle();

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: 'rejected',
      visibility_status: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) {
    console.error('[rejectProduct] update failed:', {
      product_id: productId,
      error_message: error.message,
      error_code: error.code,
    });
    if (product) {
      await writeApprovalLog({
        productId,
        productName: product.name,
        action: 'reject',
        adminUser: adminUserId ?? null,
        success: false,
        errorMessage: error.message,
        approvalStatusBefore: product.approval_status,
      });
    }
    return { error: error.message };
  }

  if (product) {
    await writeApprovalLog({
      productId,
      productName: product.name,
      action: 'reject',
      adminUser: adminUserId ?? null,
      success: true,
      approvalStatusBefore: product.approval_status,
    });
  }

  return { error: null };
}

export async function moveToDraft(
  productId: string,
  adminUserId?: string
): Promise<{ error: string | null }> {
  const supabase = getSupabase();

  const { data: product } = await supabase
    .from('products')
    .select('id, name, approval_status')
    .eq('id', productId)
    .maybeSingle();

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: 'draft',
      visibility_status: false,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) {
    console.error('[moveToDraft] update failed:', {
      product_id: productId,
      error_message: error.message,
    });
    if (product) {
      await writeApprovalLog({
        productId,
        productName: product.name,
        action: 'draft',
        adminUser: adminUserId ?? null,
        success: false,
        errorMessage: error.message,
        approvalStatusBefore: product.approval_status,
      });
    }
    return { error: error.message };
  }

  if (product) {
    await writeApprovalLog({
      productId,
      productName: product.name,
      action: 'draft',
      adminUser: adminUserId ?? null,
      success: true,
      approvalStatusBefore: product.approval_status,
    });
  }

  return { error: null };
}

export async function toggleVisibility(
  productId: string,
  visible: boolean
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('products')
    .update({ visibility_status: visible, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('approval_status', 'approved');
  if (error) {
    console.error('[toggleVisibility] failed:', error);
  }
  return { error: error?.message ?? null };
}

export async function syncProductsFromKeralagroceries(): Promise<{
  imported: number;
  errors: string[];
}> {
  return { imported: 0, errors: ['Use the CentralHub Sync page to import products.'] };
}

export async function bulkApproveDraftProducts(
  adminUserId: string
): Promise<{ approved: number; error: string | null }> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Fetch only products that are NOT missing any required fields
  const { data: eligibleProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, category_id, image_url, image_main, short_description, description, price, selling_price')
    .eq('approval_status', 'draft')
    .eq('is_deleted', false);

  if (fetchErr) return { approved: 0, error: fetchErr.message };

  const eligibleIds = (eligibleProducts ?? [])
    .filter(p => checkMissingFields(p as any).length === 0)
    .map(p => p.id);

  if (eligibleIds.length === 0) {
    return { approved: 0, error: 'No draft products meet the requirements for approval (missing category, image, description, or price).' };
  }

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: 'approved',
      visibility_status: true,
      is_active: true,
      approved_at: now,
      approved_by: adminUserId,
      updated_at: now,
    })
    .in('id', eligibleIds);

  if (error) {
    console.error('[bulkApprove] failed:', {
      error_message: error.message,
      error_code: error.code,
    });
    return { approved: 0, error: error.message };
  }

  // Single audit log entry for bulk action
  await writeApprovalLog({
    productId: '00000000-0000-0000-0000-000000000000',
    productName: `Bulk approve (${eligibleIds.length} products)`,
    action: 'bulk_approve',
    adminUser: adminUserId,
    success: true,
    approvalStatusBefore: 'draft',
  });

  return { approved: eligibleIds.length, error: null };
}
