import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * PATCH /api/admin/orders/[id]
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

    // Get the current order to check if status is changing to "delivered"
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current order:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      );
    }

    // Update order status
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', id);

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // If status changed to "delivered", create review notification
    if (status === 'delivered' && currentOrder.status !== 'delivered') {
      try {
        // Create notification record for review prompt
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            type: 'order_delivered_review',
            title: 'Leave a Review',
            message: `Your order ${currentOrder.order_number} has been delivered. Would you like to share your experience by leaving a review?`,
            recipient_type: 'customer',
            recipient_email: currentOrder.email,
            metadata: {
              order_id: currentOrder.id,
              order_number: currentOrder.order_number,
              customer_email: currentOrder.email,
              customer_name: currentOrder.customer,
              review_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders/${currentOrder.order_number}/review`
            }
          });

        if (notificationError) {
          console.error('Error creating review notification:', notificationError);
        }

      } catch (notificationError) {
        console.error('Error creating review notification:', notificationError);
        // Don't fail the order update if notification fails
      }
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