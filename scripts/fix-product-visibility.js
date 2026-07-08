const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vnqjqopzoeunojomssmq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucWpxb3B6b2V1bm9qb21zc21xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDAxNTk4NiwiZXhwIjoyMDk1NTkxOTg2fQ.y5iPt9bS4DLapXClGxfOO3f5v03ciC86rDlQrChmHcQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Synchronizing is_active flag with approval_status using SERVICE ROLE...');

  // 1. Mark all Approved & Visible as Active
  const { data: d1, error: err1, count: c1 } = await supabase
    .from('products')
    .update({ is_active: true })
    .eq('approval_status', 'approved')
    .eq('visibility_status', true)
    .select('id', { count: 'exact' });

  if (err1) console.error('Error 1:', err1.message);
  else console.log(`Successfully marked ${d1?.length || 0} products as active.`);

  // 2. Mark everything else as NOT Active
  const { data: d2, error: err2, count: c2 } = await supabase
    .from('products')
    .update({ is_active: false })
    .neq('approval_status', 'approved')
    .select('id', { count: 'exact' });

  if (err2) console.error('Error 2:', err2.message);
  else console.log(`Successfully marked ${d2?.length || 0} products as inactive.`);
}

run();
