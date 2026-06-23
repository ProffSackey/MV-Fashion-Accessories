import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existing, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email);

    if (checkError) {
      console.error('Check error:', checkError);
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Customer already exists',
        email,
      });
    }

    // Create new customer
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        email: email,
        name: name || email.split('@')[0],
        phone: '',
        address: {},
        total_orders: 0,
        total_spent: 0,
        is_active: true,
      }])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create customer', details: error.message, hint: error.hint },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customer: data?.[0],
    });
  } catch (error: any) {
    console.error('Add customer error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
