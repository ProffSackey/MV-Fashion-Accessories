import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { parseCurrency } from "@/lib/currency";
import { requireAuthenticatedUser, sameEmail } from "@/lib/serverAuth";

type CheckoutItem = {
  product_id?: string;
  quantity?: number;
  price?: number;
  discounted_price?: number;
  discount_amount?: number;
};

/** Create an unpaid order draft. Stock and customer totals are changed only after verified payment. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireAuthenticatedUser(request);
    const {
      customer_name,
      customer_email,
      customer_phone,
      items,
      shipping_address,
    } = body;

    if (!user || !sameEmail(user.email, customer_email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!customer_name || !customer_email || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required order details" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    }

    const normalizedItems: CheckoutItem[] = [];
    const insufficient: Array<{ product_id: string; requested: number; available: number }> = [];
    const { data: promotions } = await supabaseAdmin.from("promotions").select("*");
    let merchandiseTotal = 0;

    for (const rawItem of items as CheckoutItem[]) {
      const productId = String(rawItem.product_id || "");
      const quantity = Number(rawItem.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Invalid order item" }, { status: 400 });
      }

      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("id, price, stock_quantity")
        .eq("id", productId)
        .single();

      if (error || !product) {
        insufficient.push({ product_id: productId, requested: quantity, available: 0 });
        continue;
      }

      const available = Number(product.stock_quantity) || 0;
      if (available < quantity) {
        insufficient.push({ product_id: productId, requested: quantity, available });
      }

      const originalPrice = parseCurrency(product.price);
      const now = new Date();
      const promotion = (promotions || []).find((candidate) => {
        const productIds = Array.isArray(candidate.product_ids) ? candidate.product_ids.map(String) : [];
        const startsAt = candidate.start_date ? new Date(candidate.start_date) : new Date(0);
        const endsAt = candidate.deadline ? new Date(candidate.deadline) : new Date(8640000000000000);
        return candidate.is_active && productIds.includes(productId) && startsAt <= now && endsAt >= now;
      });
      let discountedPrice = originalPrice;
      if (promotion) {
        if (String(promotion.type).toLowerCase() === "percentage") {
          discountedPrice = originalPrice * (1 - Number(promotion.discount) / 100);
        } else {
          discountedPrice = Math.max(0, originalPrice - parseCurrency(promotion.discount));
        }
      }
      discountedPrice = Math.round(discountedPrice * 100) / 100;
      merchandiseTotal += discountedPrice * quantity;

      normalizedItems.push({
        product_id: productId,
        quantity,
        price: originalPrice,
        discounted_price: discountedPrice,
        discount_amount: Math.round((originalPrice - discountedPrice) * 100) / 100,
      });
    }

    if (insufficient.length > 0) {
      return NextResponse.json({ error: "Insufficient stock for some items", details: insufficient }, { status: 400 });
    }

    const country = String(shipping_address?.country || "").trim();
    const region = String(shipping_address?.region || "").trim();
    const city = String(shipping_address?.city || "").trim();
    if (!country || !region || !city) {
      return NextResponse.json({ error: "A valid delivery location is required" }, { status: 400 });
    }

    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("shipping_zones")
      .select("base_fee")
      .eq("is_active", true)
      .ilike("country", country)
      .ilike("region", region)
      .ilike("city", city)
      .limit(1)
      .single();
    if (zoneError || !zone) {
      return NextResponse.json({ error: "The selected delivery location is not available" }, { status: 400 });
    }

    const serverTotal = Math.round((merchandiseTotal + Number(zone.base_fee || 0)) * 100) / 100;
    if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
      return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 });
    }

    const orderNumber = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: String(customer_name).trim(),
        customer_email: String(customer_email).trim().toLowerCase(),
        customer_phone: customer_phone ? String(customer_phone).trim() : null,
        total_amount: serverTotal,
        status: "pending_payment",
        payment_status: "unpaid",
        items: normalizedItems,
        shipping_address: shipping_address || null,
      })
      .select("id, order_number, total_amount")
      .single();

    if (error || !order) {
      console.error("Error creating pending order:", error);
      return NextResponse.json({ error: "Failed to prepare order" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      message: "Order prepared for payment",
    }, { status: 201 });
  } catch (error) {
    console.error("Order preparation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
