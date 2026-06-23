require('dotenv').config({ path: '.env.local' });
(async () => {
  // use global fetch
const fetch = global.fetch || (()=>{throw new Error('fetch unavailable');})();
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: new URLSearchParams({
      email: 'sackeyabednego@gmail.com',
      password: 'Prof523@',
    }),
  });
  console.log('status', res.status);
  const text = await res.text();
  console.log('body', text);
})();