require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testCaseSensitivity() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== Case Sensitivity Test ===\n');

    // Test 1: Query exact case
    const { data: d1 } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_email', 'sackeyabednego8@gmail.com');
    console.log('Query: sackeyabednego8@gmail.com => Found:', d1?.length);

    // Test 2: Query uppercase
    const { data: d2 } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_email', 'SACKEYABEDNEGO8@GMAIL.COM');
    console.log('Query: SACKEYABEDNEGO8@GMAIL.COM => Found:', d2?.length);

    // Test 3: Query with different email (typo)
    const { data: d3 } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_email', 'sackeyabednego@gmail.com');
    console.log('Query: sackeyabednego@gmail.com (no "8") => Found:', d3?.length);

    // Test 4: Use ilike for case-insensitive
    const { data: d4 } = await supabaseAdmin
      .from('orders')
      .select('*')
      .ilike('customer_email', 'SACKEYABEDNEGO8@GMAIL.COM');
    console.log('Query (ilike case-insensitive): SACKEYABEDNEGO8@GMAIL.COM => Found:', d4?.length);

    console.log('\n=== Connection test ===');
    const { data: healthCheck } = await supabaseAdmin
      .from('orders')
      .select('customer_email', { count: 'exact' })
      .limit(1);
    console.log('Connection status: OK');
  } catch (error) {
    console.error('Error:', error);
  }
}

testCaseSensitivity();
