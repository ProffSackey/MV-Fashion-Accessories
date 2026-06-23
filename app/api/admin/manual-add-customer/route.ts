import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      // Try to insert with known email - for manual sync
      const { email, name } = await request.json();
      
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      // Check if customer already exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
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
        return NextResponse.json(
          { error: 'Failed to create customer', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Customer created successfully',
        customer: data?.[0],
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
