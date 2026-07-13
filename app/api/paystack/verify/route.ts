import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { requireAuthenticatedUser, sameEmail } from "@/lib/serverAuth";

type OrderItem = { product_id?: string; quantity?: number };

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Paystack secret key is not configured" }, { status: 500 });
    }

    const { reference, order_id } = await request.json() as { reference?: string; order_id?: string };
    if (!reference || !order_id) {
      return NextResponse.json({ error: "Payment reference and order are required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order was not found" }, { status: 404 });
    }
    if (!sameEmail(user.email, order.customer_email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.payment_status === "paid") {
      return NextResponse.json({ success: true, order_number: order.order_number, already_verified: true });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" }
    );
    const verification = await paystackResponse.json();
    const payment = verification?.data;

    if (!paystackResponse.ok || !verification?.status || payment?.status !== "success") {
      return NextResponse.json({ error: "Payment has not been completed successfully" }, { status: 402 });
    }

    const expectedAmount = Math.round(Number(order.total_amount) * 100);
    const metadata = typeof payment.metadata === "string"
      ? JSON.parse(payment.metadata || "{}")
      : (payment.metadata || {});

    if (
      Number(payment.amount) !== expectedAmount ||
      String(payment.currency).toUpperCase() !== "GHS" ||
      String(metadata.order_id || "") !== String(order.id) ||
      !["card", "mobile_money"].includes(String(payment.channel))
    ) {
      console.error("Paystack verification mismatch", {
        orderId: order.id,
        expectedAmount,
        receivedAmount: payment.amount,
        currency: payment.currency,
        channel: payment.channel,
        metadataOrderId: metadata.order_id,
      });
      return NextResponse.json({ error: "Payment details do not match this order" }, { status: 400 });
    }

    // The unique transaction reference is the idempotency gate: only one request fulfills the order.
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      order_id: order.id,
      transaction_id: reference,
      amount: Number(payment.amount) / 100,
      currency: "GHS",
      payment_method: payment.channel,
      status: "processing",
      description: `Paystack payment for ${order.order_number}`,
      metadata: {
        paystack_id: String(payment.id),
        paid_at: payment.paid_at,
        gateway_response: payment.gateway_response,
        reference,
      },
    });

    if (transactionError) {
      const { data: latestOrder } = await supabaseAdmin
        .from("orders")
        .select("payment_status, order_number")
        .eq("id", order.id)
        .single();
      if (latestOrder?.payment_status === "paid") {
        return NextResponse.json({ success: true, order_number: latestOrder.order_number, already_verified: true });
      }
      console.error("Could not claim payment fulfillment:", transactionError);
      return NextResponse.json({ error: "Payment is already being processed" }, { status: 409 });
    }

    const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];
    for (const item of items) {
      const productId = String(item.product_id || "");
      const quantity = Number(item.quantity) || 0;
      if (!productId || quantity <= 0) continue;

      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock_quantity")
        .eq("id", productId)
        .single();
      if (error || !product) throw new Error(`Could not load product ${productId} during fulfillment`);

      const currentStock = Number(product.stock_quantity) || 0;
      if (currentStock < quantity) throw new Error(`Insufficient stock during fulfillment for ${productId}`);

      const { error: stockError } = await supabaseAdmin
        .from("products")
        .update({ stock_quantity: currentStock - quantity })
        .eq("id", productId)
        .eq("stock_quantity", currentStock);
      if (stockError) throw stockError;
    }

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, total_orders, total_spent")
      .eq("email", order.customer_email)
      .maybeSingle();

    if (customer) {
      await supabaseAdmin.from("customers").update({
        total_orders: (Number(customer.total_orders) || 0) + 1,
        total_spent: (Number(customer.total_spent) || 0) + Number(order.total_amount),
        phone: order.customer_phone || null,
        address: order.shipping_address || null,
      }).eq("id", customer.id);
    } else {
      await supabaseAdmin.from("customers").insert({
        email: order.customer_email,
        name: order.customer_name,
        phone: order.customer_phone || null,
        address: order.shipping_address || null,
        total_orders: 1,
        total_spent: Number(order.total_amount),
        is_active: true,
      });
    }

    const { error: finalizeError } = await supabaseAdmin.from("orders").update({
      payment_status: "paid",
      status: "processing",
    }).eq("id", order.id).eq("payment_status", "unpaid");
    if (finalizeError) throw finalizeError;

    await supabaseAdmin.from("transactions").update({ status: "success" }).eq("transaction_id", reference);
    await supabaseAdmin.from("cart_items").delete().eq("customer_email", order.customer_email);

    await supabaseAdmin.from("notifications").insert({
      type: "new_order",
      title: `Paid order ${order.order_number}`,
      message: `${order.customer_name} paid GHS ${Number(order.total_amount).toFixed(2)} by ${payment.channel === "mobile_money" ? "Mobile Money" : "Card"}.`,
      recipient_type: "admin",
      recipient_email: null,
      action_url: `/admin/orders/${order.order_number}`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        payment_reference: reference,
        payment_method: payment.channel,
        payment_status: "paid",
      },
    });

    return NextResponse.json({ success: true, order_number: order.order_number });
  } catch (error) {
    console.error("Paystack verification error:", error);
    return NextResponse.json({ error: "Payment was received but order fulfillment needs attention" }, { status: 500 });
  }
}
