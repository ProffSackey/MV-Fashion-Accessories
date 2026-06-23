require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkOrders() {
  try {
    // Get service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check all orders in the database
    console.log('\n=== All Orders in Database ===');
    const { data: allOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      console.log(`Found ${allOrders?.length || 0} orders`);
      if (allOrders && allOrders.length > 0) {
        allOrders.slice(0, 3).forEach(order => {
          console.log(`\nOrder ID: ${order.id}`);
          console.log(`  Order Number: ${order.order_number}`);
          console.log(`  Customer Email: ${order.customer_email}`);
          console.log(`  Customer Name: ${order.customer_name}`);
          console.log(`  Total Amount: ${order.total_amount}`);
          console.log(`  Status: ${order.status}`);
          console.log(`  Items: ${order.items?.length || 0}`);
          console.log(`  Created At: ${order.created_at}`);
        });
      }
    }

    // Check all customers
    console.log('\n=== All Customers ===');
    const { data: customers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .limit(5);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
    } else {
      console.log(`Found ${customers?.length || 0} customers`);
      if (customers && customers.length > 0) {
        customers.forEach(customer => {
          console.log(`\n  Email: ${customer.email}`);
          console.log(`  Name: ${customer.name}`);
          console.log(`  Phone: ${customer.phone}`);
        });
      }
    }

    // Test the API endpoint with the first customer's email
    if (allOrders && allOrders.length > 0) {
      const testEmail = allOrders[0].customer_email;
      console.log(`\n=== Testing API with email: ${testEmail} ===`);
      
      const response = await fetch(`http://localhost:3000/api/customer-orders?email=${encodeURIComponent(testEmail)}`);
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrders();
