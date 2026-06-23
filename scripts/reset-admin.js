const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function resetAdmin() {
  try {
    const email = (await askQuestion('Enter admin email to reset: ')).trim();
    if (!email) {
      console.error('Email is required');
      rl.close();
      process.exit(1);
    }

    const newPassword = await askQuestion('Enter new password: ');
    const confirm = await askQuestion('Confirm new password: ');
    if (newPassword !== confirm) {
      console.error('Passwords do not match');
      rl.close();
      process.exit(1);
    }

    console.log('Looking up user...');
    const listRes = await supabase.auth.admin.listUsers();
    const users = (listRes && listRes.data && listRes.data.users) || listRes?.users || listRes?.data || [];
    const user = (users || []).find((u) => u.email === email);

    if (!user) {
      console.error('User not found');
      rl.close();
      process.exit(1);
    }

    console.log(`Resetting password for user id ${user.id} (${user.email})...`);
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (error) {
      console.error('Error resetting password:', error);
      rl.close();
      process.exit(1);
    }

    console.log('Password reset successful');
    console.log('User id:', data?.id ?? user.id);
    console.log('Email:', user.email);
    rl.close();
  } catch (err) {
    console.error('Unexpected error:', err?.message ?? err);
    rl.close();
    process.exit(1);
  }
}

resetAdmin();
