import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { requireAuthenticatedUser, sameEmail } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Paystack is not configured" }, { status: 500 });

    const body = await request.json();
    const method = body.payment_method as "mobile_money" | "card";
    if (!body.order_id || !["mobile_money", "card"].includes(method)) {
      return NextResponse.json({ error: "Order and payment method are required" }, { status: 400 });
    }

    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (method === "card") {
      return NextResponse.json({ error: "Direct card collection is disabled for security" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, customer_email, total_amount, payment_status")
      .eq("id", body.order_id)
      .single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!sameEmail(user.email, order.customer_email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (order.payment_status === "paid") return NextResponse.json({ error: "Order is already paid" }, { status: 409 });

    const reference = `MV-${order.order_number}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const payload: Record<string, unknown> = {
      email: order.customer_email,
      amount: Math.round(Number(order.total_amount) * 100),
      currency: "GHS",
      reference,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        payment_method: method,
      },
    };

    if (method === "mobile_money") {
      const phone = String(body.phone || "").replace(/\s+/g, "");
      const provider = String(body.provider || "");
      if (!/^\+?\d{9,15}$/.test(phone) || !["mtn", "vod", "atl"].includes(provider)) {
        return NextResponse.json({ error: "Enter a valid Mobile Money number and network" }, { status: 400 });
      }
      payload.mobile_money = { phone, provider };
    }

    const response = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result?.status) {
      return NextResponse.json({ error: result?.message || result?.data?.message || "Payment could not be started" }, { status: 502 });
    }

    return NextResponse.json({
      reference: result.data?.reference || reference,
      status: result.data?.status,
      message: result.data?.display_text || result.data?.message || result.message,
    });
  } catch (error) {
    console.error("Direct Paystack charge error:", error);
    return NextResponse.json({ error: "Payment could not be started" }, { status: 500 });
  }
}
