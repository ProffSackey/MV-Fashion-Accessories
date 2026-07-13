import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { requireAuthenticatedUser, sameEmail } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Paystack is not configured" }, { status: 500 });
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { order_id } = await request.json();
    if (!order_id) return NextResponse.json({ error: "Order is required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, customer_email, total_amount, payment_status")
      .eq("id", order_id)
      .single();
    if (!order || !sameEmail(user.email, order.customer_email)) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.payment_status === "paid") return NextResponse.json({ error: "Order is already paid" }, { status: 409 });

    const callback = new URL("/payment/callback", request.nextUrl.origin);
    callback.searchParams.set("order_id", order.id);
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: order.customer_email,
        amount: Math.round(Number(order.total_amount) * 100),
        currency: "GHS",
        channels: ["card"],
        reference: `MV-${order.order_number}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        callback_url: callback.toString(),
        metadata: JSON.stringify({ order_id: order.id, order_number: order.order_number, payment_method: "card" }),
      }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result?.status || !result?.data?.authorization_url) {
      return NextResponse.json({ error: result?.message || "Could not initialize card payment" }, { status: 502 });
    }
    return NextResponse.json({ authorization_url: result.data.authorization_url });
  } catch (error) {
    console.error("Secure card initialization failed:", error);
    return NextResponse.json({ error: "Could not initialize card payment" }, { status: 500 });
  }
}
