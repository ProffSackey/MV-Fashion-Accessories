import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    if (!await requireAuthenticatedUser(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Paystack is not configured" }, { status: 500 });
    const { reference } = await request.json();
    if (!reference) return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });
    const response = await fetch(`https://api.paystack.co/charge/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result?.status) {
      return NextResponse.json({ error: result?.message || "Could not check payment" }, { status: 502 });
    }
    return NextResponse.json({
      reference: result.data?.reference || reference,
      status: result.data?.status,
      message: result.data?.display_text || result.data?.message || result.message,
    });
  } catch (error) {
    console.error("Paystack charge check error:", error);
    return NextResponse.json({ error: "Could not check payment" }, { status: 500 });
  }
}
