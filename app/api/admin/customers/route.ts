import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin } = await import('../../../../lib/supabaseClient');

    // Use admin client to bypass RLS
    if (!supabaseAdmin) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customers', details: error.message },
        { status: 500 }
      );
    }

    const customers = data || [];
    const byEmail = new Map(customers.map((customer: any) => [String(customer.email || '').toLowerCase(), customer]));

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) {
        console.warn('Error fetching auth users for customer merge:', authError);
      }

      for (const authUser of authData?.users || []) {
        const email = String(authUser.email || '').toLowerCase();
        if (!email || byEmail.has(email)) continue;

        const meta = authUser.user_metadata || {};
        byEmail.set(email, {
          id: authUser.id,
          email: authUser.email || '',
          name: meta.full_name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'Customer'),
          phone: meta.phone || '',
          address: meta.address || {},
          is_active: true,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
          source: 'auth',
        });
      }
    } catch (authMergeError) {
      console.warn('Could not merge auth users into customers list:', authMergeError);
    }

    const mergedCustomers = Array.from(byEmail.values()).sort((a: any, b: any) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return NextResponse.json(mergedCustomers);
  } catch (error) {
    console.error('Error in customers endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: String(error) },
      { status: 500 }
    );
  }
}
