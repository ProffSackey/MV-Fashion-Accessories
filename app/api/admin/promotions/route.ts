import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /api/admin/promotions
 * Fetch all promotions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/admin/promotions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET /api/admin/promotions exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/promotions
 * Create a new promotion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[POST /api/admin/promotions] Received data:', {
      name: body.name,
      code: body.code,
      type: body.type,
      discount: body.discount,
      deadline: body.deadline,
      product_ids: body.product_ids,
      is_active: body.is_active,
      start_date: body.start_date
    });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Validate required fields
    if (!body.name || !body.code || !body.deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, deadline' },
        { status: 400 }
      );
    }

    // Insert the promotion
    const { data, error } = await supabase
      .from('promotions')
      .insert([{
        name: body.name,
        code: body.code,
        type: body.type,
        discount: body.discount,
        deadline: body.deadline,
        description: body.description,
        product_ids: body.product_ids || [],
        is_active: body.is_active !== false,
        start_date: body.start_date
      }])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/admin/promotions] Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: `Failed to create promotion: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[POST /api/admin/promotions] Promotion created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/promotions] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/promotions
 * Update a promotion
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    console.log('[PUT /api/admin/promotions] Updating promotion:', { id, updates });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/admin/promotions] Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: `Failed to update promotion: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[PUT /api/admin/promotions] Promotion updated successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[PUT /api/admin/promotions] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promotions
 * Delete a promotion
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/promotions] Supabase error:', error);
      return NextResponse.json(
        { error: `Failed to delete promotion: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/admin/promotions] Promotion deleted successfully:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/promotions] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
