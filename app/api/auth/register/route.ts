import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, supabase } from '../../../../lib/supabaseClient';
import { createCustomer } from '../../../../lib/supabaseService';
import { isValidEmail } from '../../../../lib/validators';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    // Create customer record in database
    const customer = await createCustomer({
      id: authData.user.id,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0], // Use provided name or extract from email
      phone: '',
      address: {},
      total_orders: 0,
      total_spent: 0,
      is_active: true,
    });

    if (!customer) {
      console.warn('Customer record created in auth but failed to create customer profile');
      // Don't fail here - auth user was created successfully
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert({
          type: 'registered_user',
          title: 'New registered user',
          message: `${name || normalizedEmail.split('@')[0]} registered with ${normalizedEmail}.`,
          recipient_type: 'admin',
          recipient_email: null,
          action_url: '/admin/customers',
          metadata: {
            user_id: authData.user.id,
            customer_email: normalizedEmail,
            customer_name: name || normalizedEmail.split('@')[0],
          },
        });
      }
    } catch (notificationError) {
      console.error('Failed to create admin notification for registration:', notificationError);
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      requiresEmailConfirmation: !authData.session,
      message: 'Account created. Check your email for the confirmation code.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
