import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, sameEmail } from '@/lib/serverAuth';

/**
 * GET /api/orders/[id]
 * Fetch a single order by order ID or order number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (!sameEmail(user.email, order.customer_email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
