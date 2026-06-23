// Node 18+ has global fetch, no need for node-fetch
const fetch = global.fetch || (()=>{ throw new Error('fetch not available');})();
require('dotenv').config({ path: '.env.local' });
(async () => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'sackeyabednego@gmail.com',
    password: 'Prof523@',
  });
  if (error) {
    console.error('login error', error);
    return;
  }
  const token = data.session.access_token;
  console.log('got token', token.slice(0, 10));

  const response = await fetch('http://localhost:3000/api/admin/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sb-admin-token=${token}; admin_session=authenticated`,
    },
    body: JSON.stringify({
      currentPassword: 'Prof523@',
      newPassword: 'NewPass123',
    }),
  });

  console.log('status', response.status);
  console.log(await response.text());
})();
