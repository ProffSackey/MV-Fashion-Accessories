require('dotenv').config({ path: '.env.local' });
const { supabase } = require('./lib/supabaseClient.ts');

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('categories').select('name');
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success! Categories:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testConnection();