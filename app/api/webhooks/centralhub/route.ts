import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        await supabase
          .from('products')
          .update({ is_deleted: true, is_active: false })
          .eq('id', id);
      }
      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    if (type === 'INSERT' || type === 'UPDATE') {
      const { variants, ...productData } = record;

      // Ensure fields match CentralHub format
      const productUpsert = {
        id: productData.id,
        centralhub_product_id: productData.id, // Ensure we store the sync identifier
        sku: productData.sku || null,
        name: productData.name,
        slug: productData.slug,
        brand: productData.brand || null,
        category: productData.category || 'Uncategorized',
        department: productData.department || null,
        subcategory: productData.subcategory || null,
        price: productData.price || 0,
        sale_price: productData.sale_price || null,
        compare_at_price: productData.compare_at_price || null,
        stock: productData.stock || 0,
        in_stock: productData.in_stock ?? true,
        unit: productData.unit || null,
        weight: productData.weight || null,
        description: productData.description || null,
        image_url: productData.image_url || null,
        is_active: productData.is_active ?? true,
        tags: productData.tags || [],
        custom_attributes: productData.custom_attributes || {},
        warehouse_location: productData.warehouse_location || null,
        gtin: productData.gtin || null,
        is_deleted: false, // Ensure product is not marked as deleted if present in sync
        // Auto-approve and show products from CentralHub master
        approval_status: 'approved',
        visibility_status: true,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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
          product_id: productData.id,
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
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
