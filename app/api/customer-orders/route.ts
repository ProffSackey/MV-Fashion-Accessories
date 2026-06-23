import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /api/customer-orders?email=user@example.com
 * Fetch orders for a specific customer email with product details including images
 * Public endpoint - anyone can query, but should verify session in frontend
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
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

    // Fetch orders for the customer using case-insensitive comparison
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .ilike('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Fetch product images for all items across all orders
    const productIds = new Set<string>();
    (orders || []).forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const id = item.productId || item.product_id;
          if (id) productIds.add(id);
        });
      }
    });

    let productMap: Record<string, any> = {};
    if (productIds.size > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, image_url, name')
        .in('id', Array.from(productIds));

      if (products) {
        productMap = Object.fromEntries(products.map(p => [p.id, p]));
      }
    }

    // Transform and format the response with product details
    const formattedOrders = (orders || []).map(order => ({
      id: order.order_number || order.id,
      order_number: order.order_number || order.id,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      items: (order.items || []).map((item: any) => {
        const productId = item.productId || item.product_id;
        const product = productMap[productId];
        return {
          productId: productId,
          product_id: productId,
          quantity: item.quantity || 1,
          price: item.price || 0,
          image: product?.image_url || null,
          name: item.name || product?.name || null,
        };
      }),
      total_amount: order.total_amount || 0,
      status: order.status || 'pending',
      payment_status: order.payment_status || 'pending',
      created_at: order.created_at,
      updated_at: order.updated_at,
      shipping_address: order.shipping_address,
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
