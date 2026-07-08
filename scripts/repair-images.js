const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vnqjqopzoeunojomssmq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucWpxb3B6b2V1bm9qb21zc21xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAxNTk4NiwiZXhwIjoyMDk1NTkxOTg2fQ.y5iPt9bS4DLapXClGxfOO3f5v03ciC86rDlQrChmHcQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Repairing product images (removing blob URLs and using gallery fallbacks)...');

  // 1. Find products with blob URLs
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, image_main')
    .or('image_url.ilike.blob:%,image_main.ilike.blob:%');

  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }

  console.log(`Found ${products.length} products with broken blob URLs.`);

  for (const p of products) {
    console.log(`Checking fallbacks for: ${p.name}`);

    // Try to find the best image from the gallery
    const { data: gallery } = await supabase
      .from('product_gallery_images')
      .select('image_url, enhanced_image_url')
      .eq('product_id', p.id)
      .order('position')
      .limit(1)
      .maybeSingle();

    let newUrl = null;
    if (gallery) {
      newUrl = gallery.enhanced_image_url || gallery.image_url;
      // Ensure the gallery URL isn't also a blob (unlikely but possible if admin was buggy)
      if (newUrl && newUrl.startsWith('blob:')) newUrl = null;
    }

    console.log(`  New URL: ${newUrl || 'NULL (setting to placeholder)'}`);

    const { error: updateErr } = await supabase
      .from('products')
      .update({
        image_url: newUrl,
        image_main: newUrl
      })
      .eq('id', p.id);

    if (updateErr) {
      console.error(`  Update failed: ${updateErr.message}`);
    } else {
      console.log(`  Successfully updated ${p.name}`);
    }
  }

  console.log('Database repair complete.');
}

run();
