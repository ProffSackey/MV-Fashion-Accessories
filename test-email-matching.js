require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testEmailMatching() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get all unique customer emails from orders
    console.log('\n=== Email Analysis ===');
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('customer_email');

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }

    const uniqueEmails = [...new Set(orders?.map(o => o.customer_email) || [])];
    console.log('Unique customer emails in orders table:');
    uniqueEmails.forEach(email => {
      console.log(`  - "${email}"`);
    });

    // Get all auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log('\nAuth users:');
    users?.forEach(user => {
      console.log(`  - "${user.email}" (ID: ${user.id})`);
      const hasOrder = uniqueEmails.some(oe => oe.toLowerCase() === user.email?.toLowerCase());
      console.log(`    Has order: ${hasOrder}`);
    });

    // Now test the API endpoint with each user
    console.log('\n=== API Endpoint Tests ===');
    for (const email of uniqueEmails) {
      const response = await fetch(`http://localhost:3000/api/customer-orders?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      console.log(`\nEmail: ${email}`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Orders found: ${Array.isArray(data) ? data.length : 'N/A'}`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`  First order: ${data[0].order_number}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailMatching();
