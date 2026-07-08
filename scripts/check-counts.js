const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vnqjqopzoeunojomssmq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucWpxb3B6b2V1bm9qb21zc21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTU5ODYsImV4cCI6MjA5NTU5MTk4Nn0.y5iPt9bS4DLapXClGxfOO3f5v03ciC86rDlQrChmHcQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: pAll, error } = await supabase.from('products').select('id, approval_status, visibility_status, is_active, is_deleted');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const approved = pAll.filter(p => p.approval_status === 'approved');
  console.log('Approved Total:', approved.length);
  console.log('Approved & Visible:', approved.filter(p => p.visibility_status === true).length);
  console.log('Approved & NOT Visible:', approved.filter(p => p.visibility_status !== true).length);
}

run();
