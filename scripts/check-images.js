const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vnqjqopzoeunojomssmq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucWpxb3B6b2V1bm9qb21zc21xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAxNTk4NiwiZXhwIjoyMDk1NTkxOTg2fQ.y5iPt9bS4DLapXClGxfOO3f5v03ciC86rDlQrChmHcQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Checking images and galleries with SERVICE ROLE key...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, image_main, enhanced_image_url')
    .eq('approval_status', 'approved')
    .limit(20);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  for (const p of products) {
    console.log(`Product: ${p.name}`);
    console.log(`  Main: ${p.image_url}`);

    const { data: gallery } = await supabase
      .from('product_gallery_images')
      .select('image_url, enhanced_image_url, position')
      .eq('product_id', p.id)
      .order('position');

    if (gallery && gallery.length > 0) {
      console.log(`  Gallery (${gallery.length} items):`);
      gallery.forEach(g => {
        console.log(`    [pos ${g.position}] ${g.enhanced_image_url || g.image_url}`);
      });
    } else {
      console.log('  Gallery: EMPTY');
    }
  }
}

run();
