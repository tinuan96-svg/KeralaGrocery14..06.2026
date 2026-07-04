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
        sku: productData.sku,
        name: productData.name,
        slug: productData.slug,
        brand: productData.brand,
        category: productData.category,
        department: productData.department,
        subcategory: productData.subcategory,
        price: productData.price,
        sale_price: productData.sale_price,
        compare_at_price: productData.compare_at_price,
        stock: productData.stock,
        in_stock: productData.in_stock,
        unit: productData.unit,
        weight: productData.weight,
        description: productData.description,
        image_url: productData.image_url,
        is_active: productData.is_active,
        tags: productData.tags || [],
        custom_attributes: productData.custom_attributes || {},
        warehouse_location: productData.warehouse_location,
        gtin: productData.gtin,
        updated_at: new Date().toISOString(),
      };

      const { error: pError } = await supabase
        .from('products')
        .upsert(productUpsert, { onConflict: 'id' });

      if (pError) throw pError;

      // Handle variants
      if (Array.isArray(variants) && variants.length > 0) {
        const variantsUpsert = variants.map((v: any) => ({
          id: v.id,
          product_id: productData.id,
          variant_name: v.variant_name,
          price: v.price,
          cost_price: v.cost_price,
          stock: v.stock,
          sku: v.sku,
          barcode: v.barcode,
          unit_value: v.unit_value,
          unit_type: v.unit_type,
          is_active: v.is_active ?? true,
          updated_at: new Date().toISOString(),
        }));

        const { error: vError } = await supabase
          .from('product_variants')
          .upsert(variantsUpsert, { onConflict: 'id' });

        if (vError) console.error('Error upserting variants:', vError);
      }
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
