import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /api/orders/[id]
 * Fetch a single order by order ID or order number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

    // Try to fetch by order_number first, then by id
    let order = null;
    let error = null;

    // Try by order_number
    const { data: orderByNumber, error: errorByNumber } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', id)
      .single();

    if (!errorByNumber && orderByNumber) {
      order = orderByNumber;
    } else {
      // Try by UUID id
      const { data: orderById, error: errorById } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (!errorById && orderById) {
        order = orderById;
      } else {
        error = errorByNumber || errorById;
      }
    }

    if (error || !order) {
      console.error('Error fetching order:', error);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch product details for each item
    const itemsWithDetails = await Promise.all(
      (order.items || []).map(async (item: any) => {
        try {
          const { data: productData } = await supabaseAdmin
            .from('products')
            .select('id, name, image_url')
            .eq('id', item.product_id || item.productId)
            .single();

          return {
            productId: item.product_id || item.productId,
            product_id: item.product_id || item.productId,
            quantity: item.quantity || 1,
            price: item.price || 0,
            name: productData?.name || 'Unknown Product',
            image: productData?.image_url || undefined,
          };
        } catch {
          return {
            productId: item.product_id || item.productId,
            product_id: item.product_id || item.productId,
            quantity: item.quantity || 1,
            price: item.price || 0,
            name: 'Unknown Product',
          };
        }
      })
    );

    return NextResponse.json({
      ...order,
      items: itemsWithDetails,
    });
  } catch (error) {
    console.error('Error in order GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin order update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
