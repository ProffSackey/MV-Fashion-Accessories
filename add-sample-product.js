require('dotenv').config({ path: '.env.local' });
const { supabaseAdmin } = require('./lib/supabaseClient.ts');

async function addSampleProduct() {
  try {
    console.log('Adding sample product...');

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Sample Laptop',
        description: 'A high-quality laptop for work and gaming',
        price: '£999.99',
        category: 'Appliances',
        image_url: 'https://via.placeholder.com/300x200?text=Laptop',
        status: 'active',
        stock_quantity: 10,
        rating: 4.5,
        about: 'Powerful laptop with latest features'
      })
      .select();

    if (error) {
      console.error('Error adding product:', error);
    } else {
      console.log('Product added successfully:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

addSampleProduct();