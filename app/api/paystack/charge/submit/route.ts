import { NextRequest, NextResponse } from "next/server";

const endpoints: Record<string, string> = {
  otp: "submit_otp",
  pin: "submit_pin",
  phone: "submit_phone",
  birthday: "submit_birthday",
  address: "submit_address",
};

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Paystack is not configured" }, { status: 500 });
    const { reference, action, value, address } = await request.json();
    const endpoint = endpoints[action];
    if (!reference || !endpoint) return NextResponse.json({ error: "Invalid payment challenge" }, { status: 400 });

    const payload = action === "address"
      ? { reference, ...(address || {}) }
      : { reference, [action]: value };
    const response = await fetch(`https://api.paystack.co/charge/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result?.status) {
      return NextResponse.json({ error: result?.message || result?.data?.message || "Could not continue payment" }, { status: 502 });
    }
    return NextResponse.json({
      reference: result.data?.reference || reference,
      status: result.data?.status,
      message: result.data?.display_text || result.data?.message || result.message,
    });
  } catch (error) {
    console.error("Paystack challenge error:", error);
    return NextResponse.json({ error: "Could not continue payment" }, { status: 500 });
  }
}
