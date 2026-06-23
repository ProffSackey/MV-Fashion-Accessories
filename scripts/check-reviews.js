require('dotenv').config({path:'.env.local'});
(async()=>{
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('Checking reviews in database...');

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching reviews:', error);
  } else {
    console.log('Found', data.length, 'reviews:');
    data.forEach(review => {
      console.log('- ID:', review.id, 'Status:', review.status, 'Rating:', review.rating, 'Product:', review.product_id);
    });
  }
})();