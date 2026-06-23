import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /api/admin/orders
 * Fetch all orders for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 500 }
      );
    }

    // Support pagination: ?limit=25&offset=0
    const { searchParams } = request.nextUrl;
    const limitParam = parseInt(searchParams.get('limit') || '25', 10) || 25;
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10) || 0;

    // Fetch orders with customer info (paginated)
    const from = offsetParam;
    const to = offsetParam + limitParam - 1;

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        total_amount,
        status,
        payment_status,
        items,
        shipping_address,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // To avoid N+1 product lookups, batch-fetch product details for all items in this page
    const allProductIds = new Set<string>();
    (orders || []).forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const pid = it.product_id || it.productId;
        if (pid) allProductIds.add(pid);
      });
    });

    const productMap: Record<string, any> = {};
    if (allProductIds.size > 0) {
      const ids = Array.from(allProductIds);
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name, image_url, category')
        .in('id', ids);
      (products || []).forEach((p: any) => {
        productMap[p.id] = p;
      });
    }

    // Transform the data to match the expected format
    const transformedOrders = (orders || []).map((order: any) => {
      const itemsWithDetails = (order.items || []).map((item: any) => {
        const pid = item.product_id || item.productId;
        const prod = pid ? productMap[pid] : null;
        return {
          productId: pid,
          quantity: item.quantity || 1,
          price: item.price || 0,
          name: prod?.name || undefined,
          image: prod?.image_url || undefined,
          category: prod?.category || null,
        };
      });

      const capitalizeStatus = (status: string | null | undefined): string => {
        if (!status) return 'Unknown';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      };

      return {
        id: order.order_number || order.id,
        customer: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone || '',
        created_at: order.created_at || null,
        date: order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown',
        amount: `GHS ${(order.total_amount || 0).toFixed(2)}`,
        status: capitalizeStatus(order.status) as any,
        payment: capitalizeStatus(order.payment_status) as any,
        items: itemsWithDetails.length,
        itemsDetail: itemsWithDetails,
        shippingAddress: order.shipping_address,
        total_amount: order.total_amount,
      };
    });

    return NextResponse.json(transformedOrders);
  } catch (error) {
    console.error('Error in admin orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}