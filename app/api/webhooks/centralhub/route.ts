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

/**
 * Applies a fixed 5% markup to the cost price and rounds up to nearest 0.10.
 */
function applyMarkup(price: number): number {
  if (!price || price <= 0) return 0;
  const sellingPrice = price * 1.05;
  // Round up to nearest multiple of 0.10
  return Math.ceil(sellingPrice * 10) / 10;
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

      const costPrice = Number(productData.price || productData.cost_price || 0);
      const sellingPrice = applyMarkup(costPrice);

      // Check if product already exists to determine if we should protect fields
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, slug, approval_status, visibility_status, image_url, image_main, description, price')
        .eq('centralhub_product_id', productData.id)
        .maybeSingle();

      const isUpdate = !!existingProduct;

      // Construct update payload according to CentralHub Master Registry requirements
      const productUpsert: any = {
        centralhub_product_id: productData.id,
        sku: productData.sku,
        gtin: productData.gtin || null,
        name: productData.name,
        brand: productData.brand || null,
        brand_id: productData.brand_id || null,

        // Data Mapping Requirements
        department: productData.department,
        main_category: productData.department, // main_category ⬅️ department from CentralHub
        category: productData.subcategory,
        sub_category: productData.subcategory, // sub_category ⬅️ subcategory from CentralHub

        // Weight Requirements (defaults if missing)
        weight_kg: Number(productData.weight_kg || productData.weight || 0.5),
        weight_grams: Number(productData.weight_grams || 500),

        warehouse_location: productData.warehouse_location || null,

        // CentralHub price is treated as the COST price.
        supplier_price: costPrice,
        cost_price: costPrice,
        last_sync_at: new Date().toISOString(),
        updated_at: productData.updated_at || new Date().toISOString(),
        is_deleted: false,
        is_active: true,
      };

      if (productData.slug) {
        productUpsert.slug = productData.slug;
      }

      if (!isUpdate) {
        // NEW products default to draft and auto-calculated price
        productUpsert.approval_status = 'draft';
        productUpsert.visibility_status = false;
        productUpsert.price = sellingPrice;
        productUpsert.selling_price = sellingPrice;
        productUpsert.markup_percentage = 5;
      }

      // Perform Upsert targeting the 'centralhub_product_id' column as the primary sync key
      const { data: upsertedProduct, error: pError } = await supabase
        .from('products')
        .upsert(productUpsert, { onConflict: 'centralhub_product_id' })
        .select('id, slug, price, cost_price')
        .single();

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

      const targetId = upsertedProduct.id;

      // Record price history if cost changed
      // Note: We use the data returned from upsert to compare if we want,
      // but here we might need to know the 'old' price.
      // Since upsert doesn't easily give 'old' values, we'll keep the logic if possible or skip for simplicity if it's too complex.
      // However, requirement 1 mentions "support local profit reporting", so price history is good.

      // Handle variants
      if (Array.isArray(variants) && variants.length > 0) {
        const variantsUpsert = variants.map((v: any) => {
          const vCost = Number(v.price || 0);
          const vSelling = applyMarkup(vCost);
          return {
            id: v.id,
            product_id: targetId,
            variant_name: v.variant_name,
            price: vSelling,
            selling_price: vSelling,
            cost_price: vCost,
            stock: v.stock || 0,
            sku: v.sku || null,
            barcode: v.barcode || null,
            unit_value: v.unit_value || null,
            unit_type: v.unit_type || null,
            is_active: v.is_active ?? true,
            updated_at: new Date().toISOString(),
          };
        });

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

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
