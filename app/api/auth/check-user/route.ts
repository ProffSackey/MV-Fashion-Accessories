import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      );
    }

    let exists = false;
    let page = 1;
    const perPage = 1000;

    while (!exists) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to check user' },
          { status: 500 }
        );
      }

      const users = data.users || [];
      exists = users.some((user) => user.email?.toLowerCase() === normalizedEmail);

      if (exists || users.length < perPage) {
        break;
      }

      page += 1;
    }

    if (!exists) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1)
        .maybeSingle();

      if (customerError) {
        return NextResponse.json(
          { error: 'Failed to check user' },
          { status: 500 }
        );
      }

      exists = !!customer;
    }

    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
