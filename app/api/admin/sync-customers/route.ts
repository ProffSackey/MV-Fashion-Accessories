import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not configured (missing SUPABASE_SERVICE_ROLE_KEY)');
      return NextResponse.json({ error: 'Server misconfiguration: supabase admin unavailable' }, { status: 500 });
    }
    // Get all auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 400 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No auth users found', created: 0 }
      );
    }

    // Get existing customers
    const { data: existingCustomers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id');

    if (customersError) {
      console.error('Error fetching customers:', customersError);
    }

    const existingCustomerIds = new Set(existingCustomers?.map(c => c.id) || []);

    // Create customer records for auth users that don't have one
    let created = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Skip if customer record already exists
      if (existingCustomerIds.has(user.id)) {
        continue;
      }

      try {
        // Insert directly to customers table
        const { error: insertError } = await supabaseAdmin
          .from('customers')
          .insert([{
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            phone: user.user_metadata?.phone || '',
            // metadata.address is expected to be an object with street, city,
            // postCode, country and region keys. fall back gracefully
            address: user.user_metadata?.address || {},
            total_orders: 0,
            total_spent: 0,
            is_active: true,
          }]);

        if (insertError) {
          errors.push(`Failed to create customer for ${user.email}: ${insertError.message}`);
          console.error(`Error for ${user.email}:`, insertError);
        } else {
          created++;
        }
      } catch (error) {
        errors.push(`Error processing user ${user.email}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${created} new customers`,
      created,
      errors: errors.length > 0 ? errors : undefined,
      totalAuthUsers: users.length,
      existingCustomers: existingCustomerIds.size,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
