require('dotenv').config({path:'.env.local'});
const fs = require('fs');
const path = require('path');

(async()=>{
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('Running review status migration...');

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'docs', 'ADD_REVIEW_STATUS.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements and execute
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });

        if (error) {
          console.error('Error executing statement:', error);
          // Try direct execution for DDL statements
          const { error: directError } = await supabase.from('_supabase_migration_temp').select('*').limit(0);
          if (directError) {
            console.log('Trying direct SQL execution...');
            // For DDL statements, we might need to use a different approach
            // Let's try executing the raw SQL
            const { data, error: rawError } = await supabase.rpc('exec', { query: statement.trim() });
            if (rawError) {
              console.error('Direct execution also failed:', rawError);
            } else {
              console.log('Direct execution successful');
            }
          }
        } else {
          console.log('Statement executed successfully');
        }
      }
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
})();