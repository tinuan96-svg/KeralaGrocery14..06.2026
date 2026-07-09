import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.CENTRALHUB_WEBHOOK_SECRET;
    const incomingSecret = req.headers.get('x-webhook-secret');

    if (webhookSecret && incomingSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, record, old_record } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'DELETE') {
      const id = record?.id || old_record?.id;
      if (id) {
        // Match by centralhub_product_id as the primary sync key
        await supabase
          .from('products')
          .update({
            is_deleted: true,
            is_active: false,
            visibility_status: false,
            approval_status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('centralhub_product_id', id);

        // Immediate revalidation for storefront
        revalidatePath('/products', 'layout');
        revalidatePath('/');
      }
      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    if (type === 'INSERT' || type === 'UPDATE') {
      const { variants, ...productData } = record;

      // Hardened Matching: centralhub_product_id (primary) and gtin (secondary)
      let { data: existing } = await supabase
        .from('products')
        .select('id, slug, approval_status, visibility_status')
        .eq('centralhub_product_id', productData.id)
        .maybeSingle();

      if (!existing && productData.gtin) {
        const { data: gtinMatch } = await supabase
          .from('products')
          .select('id, slug, approval_status, visibility_status')
          .eq('gtin', productData.gtin)
          .maybeSingle();
        existing = gtinMatch;
      }

      const targetId = existing?.id || productData.id;

      // Construct update payload
      const productUpsert: any = {
        id: targetId,
        centralhub_product_id: productData.id,
        gtin: productData.gtin || null,
        name: productData.name,
        brand: productData.brand || null,
        brand_id: productData.brand_id || null,
        price: productData.price || 0,
        sale_price: productData.sale_price || null,
        compare_price: productData.compare_at_price || null,
        stock: productData.stock || 0,
        in_stock: productData.in_stock ?? true,
        unit: productData.unit || null,
        weight: productData.weight || null,
        custom_attributes: productData.custom_attributes || {},
        last_sync_at: new Date().toISOString(),
        updated_at: productData.updated_at || new Date().toISOString(),
        is_deleted: false,
        is_active: true,
        // ALWAYS ensure product is approved and visible when updated from CentralHub
        // This satisfies the requirement "get it updated on website without moving to drafts"
        approval_status: 'approved',
        visibility_status: true,
      };

      if (!existing) {
        productUpsert.slug = productData.slug || `p-${productData.id.slice(0, 8)}`;
      }

      const { error: pError } = await supabase
        .from('products')
        .upsert(productUpsert, { onConflict: 'id' });

      if (pError) {
        console.error('Product Upsert Error:', pError.message);
        await supabase.from('sync_errors').insert({
          external_id: productData.id,
          entity_type: 'product',
          error_message: pError.message,
          payload: record,
        });
        throw pError;
      }

      // Handle variants
      if (Array.isArray(variants) && variants.length > 0) {
        const variantsUpsert = variants.map((v: any) => ({
          id: v.id,
          product_id: targetId,
          variant_name: v.variant_name,
          price: v.price || 0,
          cost_price: v.cost_price || 0,
          stock: v.stock || 0,
          sku: v.sku || null,
          barcode: v.barcode || null,
          unit_value: v.unit_value || null,
          unit_type: v.unit_type || null,
          is_active: v.is_active ?? true,
          updated_at: new Date().toISOString(),
        }));

        const { error: vError } = await supabase
          .from('product_variants')
          .upsert(variantsUpsert, { onConflict: 'id' });

        if (vError) {
          console.error('Variants Upsert Error:', vError.message);
          await supabase.from('sync_errors').insert({
            external_id: productData.id,
            entity_type: 'variants',
            error_message: vError.message,
            payload: { product_id: productData.id, variants },
          });
        }
      }

      // Immediate revalidation for storefront
      if (existing?.slug) {
        revalidatePath(`/products/${existing.slug}`);
      }
      if (productData.slug) {
        revalidatePath(`/products/${productData.slug}`);
      }
      revalidatePath('/products', 'layout');
      revalidatePath('/');
    }

      // Immediate revalidation for storefront
      if (existing?.slug) {
        revalidatePath(`/products/${existing.slug}`);
      }
      if (productData.slug) {
        revalidatePath(`/products/${productData.slug}`);
      }
      revalidatePath('/products', 'layout');
      revalidatePath('/');
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
