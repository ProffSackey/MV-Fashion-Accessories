const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  try {
    let developerToken = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEVELOPER_TOKEN;
    const tokenSource = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SUPABASE_SERVICE_ROLE_KEY'
      : process.env.DEVELOPER_TOKEN
        ? 'DEVELOPER_TOKEN'
        : null;

    // If no service role key is in env, request it from the user.
    if (!developerToken) {
      developerToken = await askQuestion('\nEnter your Supabase service role key: ');
    }

    if (!developerToken) {
      console.error('Error: Supabase service role key is required');
      rl.close();
      process.exit(1);
    }

    if (tokenSource) {
      console.log(`Using Supabase admin key from ${tokenSource}`);
    }

    const supabase = createClient(supabaseUrl, developerToken);

    const email = await askQuestion('Enter admin email: ');
    const password = await askQuestion('Enter admin password: ');
    const fullName = await askQuestion('Enter admin full name: ');

    if (!email || !password) {
      console.error('Error: Email and password are required');
      rl.close();
      process.exit(1);
    }

    console.log('\nCreating admin user (without email verification)...');

    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        is_admin: true,
        full_name: fullName.trim() || 'Admin User',
      },
    });

    if (error) {
      console.error('Error creating admin:', error.message);
      rl.close();
      process.exit(1);
    }

    console.log('\nAdmin user created successfully!');
    console.log('Admin ID:', data.user.id);
    console.log('Admin Email:', data.user.email);
    console.log('Status: Email automatically verified (no verification email sent)');
    console.log('\nYou can now login at /admin/login with these credentials.');

    rl.close();
  } catch (err) {
    console.error('Unexpected error:', err.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
