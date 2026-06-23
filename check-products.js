const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dcetirdeyqauaccnfoxc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXRpcmRleXFhdWFjY25mb3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODE5MTUsImV4cCI6MjA4Nzg1NzkxNX0.ZK8Rqi7-P2id5yo3xdBOehRPmSiTLDofrs4L7eJSJp0'
);

(async () => {
  const { data, error } = await supabase.from('products').select('id, name, price, stock_quantity').limit(10);
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('Found products:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('\nFirst 3 products:');
      data.slice(0, 3).forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.name}`);
        console.log(`   Price: ${p.price}`);
        console.log(`   Stock: ${p.stock_quantity}`);
      });
    }
  }
  process.exit(0);
})();
