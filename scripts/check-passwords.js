require('dotenv').config({path:'.env.local'});
(async()=>{
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const passwords = ['Prof523@','NewPass123'];
  for (const pwd of passwords) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'sackeyabednego@gmail.com',
      password: pwd,
    });
    console.log('password', pwd, '->', error ? error.message : 'success');
  }
})();