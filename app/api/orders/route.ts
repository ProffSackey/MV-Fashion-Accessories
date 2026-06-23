import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * POST /api/orders
 * Create a new order with items and shipping information
 * Includes shipping fee in the total amount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customer_name,
      customer_email,
      customer_phone,
      items,
      total_amount,
      shipping_address,
      shipping_fee,
      status = 'pending',
    } = body;

    // Validate required fields
    if (!customer_name || !customer_email || !items || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, customer_email, items, total_amount' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array' },
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

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Validate stock for all items before creating the order
    const insufficient: Array<{ product_id: string; requested: number; available: number }> = [];
    for (const item of items) {
      const { product_id, quantity } = item as any;
      if (!product_id || typeof quantity !== 'number') continue;
      const { data: productData, error: fetchErr } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', product_id)
        .limit(1)
        .single();
      if (fetchErr) {
        console.error('Error fetching product for stock check:', product_id, fetchErr);
        // treat as unavailable
        insufficient.push({ product_id, requested: quantity, available: 0 });
        continue;
      }
      const available = (productData?.stock_quantity as number) || 0;
      if (available < quantity) {
        insufficient.push({ product_id, requested: quantity, available });
      }
    }

    if (insufficient.length > 0) {
      return NextResponse.json({ error: 'Insufficient stock for some items', details: insufficient }, { status: 400 });
    }

    // Create order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        total_amount: parseFloat(String(total_amount)),
        status,
        payment_status: 'unpaid',
        items,
        shipping_address: shipping_address || null,
      })
      .select();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Also create/update customer record
    try {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('email', customer_email)
        .single();

      if (existingCustomer) {
        // Update existing customer
        await supabaseAdmin
          .from('customers')
          .update({
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + parseFloat(String(total_amount)),
            phone: customer_phone || existingCustomer.phone,
            address: shipping_address || existingCustomer.address,
          })
          .eq('email', customer_email);
      } else {
        // Create new customer
        await supabaseAdmin
          .from('customers')
          .insert({
            email: customer_email,
            name: customer_name,
            phone: customer_phone || null,
            address: shipping_address || null,
            total_orders: 1,
            total_spent: parseFloat(String(total_amount)),
            is_active: true,
          });
      }
    } catch (err) {
      console.warn('Error updating customer record:', err);
      // Don't fail the order creation if customer update fails
    }

    // Decrement stock for each item in the order
    const lowStockAlerts: Array<any> = [];
    try {
      const STOCK_THRESHOLD = 5;
      for (const item of items) {
        const { product_id, quantity } = item;
        
        if (!product_id || !quantity) {
          console.warn('Skipping item without product_id or quantity:', item);
          continue;
        }

        // Get current stock
        const { data: product, error: fetchError } = await supabaseAdmin
          .from('products')
          .select('stock_quantity, id, name')
          .eq('id', product_id)
          .single();

        if (fetchError) {
          console.error(`Error fetching product ${product_id}:`, fetchError);
          continue;
        }

        if (!product) {
          console.warn(`Product ${product_id} not found`);
          continue;
        }

        const currentStock = product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - quantity); // Don't go below 0

        // Update product stock
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', product_id);

        if (updateError) {
          console.error(`Error updating stock for product ${product_id}:`, updateError);
        } else {
          console.log(`Updated stock for product ${product_id}: ${currentStock} -> ${newStock}`);
          // If product reached low-stock threshold, prepare an admin alert
          if (newStock <= STOCK_THRESHOLD) {
            lowStockAlerts.push({ product_id, name: product?.name || null, remaining: newStock });
          }
        }
      }
    } catch (err) {
      console.error('Error updating product stock:', err);
      // Don't fail the order creation if stock update fails
    }

    // Create an admin notification with order summary and any low-stock alerts
    try {
      const notif = {
        type: 'new_order',
        title: `New order ${orderNumber}`,
        message: `Order ${orderNumber} placed by ${customer_name} (${customer_email}) — GHS ${parseFloat(String(total_amount)).toFixed(2)}`,
        recipient_type: 'admin',
        recipient_email: null,
        metadata: {
          order_number: orderNumber,
          order_id: order?.[0]?.id,
          customer_name,
          customer_email,
          total_amount: parseFloat(String(total_amount)),
          items,
          low_stock_alerts: lowStockAlerts,
        },
      };

      const { error: notifErr } = await supabaseAdmin.from('notifications').insert([notif]);
      if (notifErr) console.error('Failed to create admin notification for new order:', notifErr);
    } catch (e) {
      console.error('Error writing admin notification:', e);
    }

    return NextResponse.json(
      {
        success: true,
        order_number: orderNumber,
        order_id: order?.[0]?.id,
        total_amount,
        shipping_fee: shipping_fee || 0,
        message: 'Order created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
