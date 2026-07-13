"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

export default function PaymentCallbackPage() {
  const [message, setMessage] = useState("Verifying your payment securely...");
  const [success, setSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    const orderId = params.get("order_id");
    if (!reference || !orderId) {
      queueMicrotask(() => {
        setSuccess(false);
        setMessage("Payment details are incomplete.");
      });
      return;
    }

    authenticatedFetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, order_id: orderId }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Payment could not be verified");
      setSuccess(true);
      setMessage(`Payment confirmed. Order ${result.order_number} is now being processed.`);
      window.dispatchEvent(new CustomEvent("userCartCountUpdated", { detail: { count: 0 } }));
    }).catch((error) => {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Payment verification failed");
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-yellow-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        {success === null && <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-100 border-t-yellow-600" />}
        <h1 className="mt-5 text-2xl font-bold text-gray-950">{success === true ? "Payment confirmed" : success === false ? "Payment not confirmed" : "Verifying payment"}</h1>
        <p className="mt-3 text-gray-600">{message}</p>
        {success !== null && <Link href={success ? "/orders" : "/cart"} className="mt-6 inline-flex rounded-lg bg-yellow-600 px-6 py-3 font-semibold text-white hover:bg-yellow-700">{success ? "View my orders" : "Return to cart"}</Link>}
      </section>
    </main>
  );
}
