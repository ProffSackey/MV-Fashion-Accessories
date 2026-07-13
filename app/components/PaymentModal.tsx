"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CreditCardIcon, DevicePhoneMobileIcon, LockClosedIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { formatCurrency } from "@/lib/currency";

type Method = "mobile_money" | "card";
type Challenge = "otp" | "pin" | "phone" | "birthday" | "address";

interface Props {
  orderId: string;
  total: number;
  initialMethod: Method;
  shippingAddress: { address: string; city: string; region: string; postCode: string };
  onClose: () => void;
  onSuccess: (orderNumber: string) => void;
}

const challengeFromStatus = (status: string): Challenge | null => {
  const map: Record<string, Challenge> = {
    send_otp: "otp",
    send_pin: "pin",
    send_phone: "phone",
    send_birthday: "birthday",
    send_address: "address",
  };
  return map[status] || null;
};

export default function PaymentModal({ orderId, total, initialMethod, shippingAddress, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<Method>(initialMethod);
  const [provider, setProvider] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [reference, setReference] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeValue, setChallengeValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttempts = useRef(0);

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  const verify = async (paymentReference: string) => {
    const response = await fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: paymentReference, order_id: orderId }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Payment could not be verified");
    onSuccess(result.order_number);
  };

  const checkPayment = async (paymentReference: string) => {
    try {
      const response = await fetch("/api/paystack/charge/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: paymentReference }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check payment");
      await handleChargeResult(result);
    } catch (paymentError) {
      setBusy(false);
      setError(paymentError instanceof Error ? paymentError.message : "Could not check payment");
    }
  };

  const scheduleCheck = (paymentReference: string) => {
    if (pollAttempts.current >= 36) {
      setBusy(false);
      setError("Payment confirmation timed out. If you approved the payment, check My Orders shortly.");
      return;
    }
    pollAttempts.current += 1;
    pollTimer.current = setTimeout(() => void checkPayment(paymentReference), 5000);
  };

  const handleChargeResult = async (result: { status?: string; reference?: string; message?: string }) => {
    const status = String(result.status || "").toLowerCase();
    const paymentReference = result.reference || reference;
    if (paymentReference) setReference(paymentReference);
    setMessage(result.message || "Processing payment...");

    if (status === "success") {
      await verify(paymentReference);
      return;
    }
    const nextChallenge = challengeFromStatus(status);
    if (nextChallenge) {
      setChallenge(nextChallenge);
      setChallengeValue("");
      setBusy(false);
      return;
    }
    if (["pending", "pay_offline", "processing"].includes(status)) {
      setBusy(true);
      scheduleCheck(paymentReference);
      return;
    }
    setBusy(false);
    setReference("");
    throw new Error(result.message || "Payment was not successful");
  };

  const startPayment = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    pollAttempts.current = 0;
    try {
      const [expiryMonth = "", expiryYear = ""] = expiry.split("/").map((part) => part.trim());
      const response = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method === "mobile_money" ? {
          order_id: orderId,
          payment_method: method,
          provider,
          phone,
        } : {
          order_id: orderId,
          payment_method: method,
          card_number: cardNumber,
          cvv,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment could not be started");
      await handleChargeResult(result);
    } catch (paymentError) {
      setBusy(false);
      setError(paymentError instanceof Error ? paymentError.message : "Payment could not be started");
    }
  };

  const submitChallenge = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge || !reference) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/paystack/charge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          action: challenge,
          value: challengeValue,
          address: challenge === "address" ? {
            address: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.region,
            zipcode: shippingAddress.postCode,
          } : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not continue payment");
      setChallenge(null);
      await handleChargeResult(result);
    } catch (paymentError) {
      setBusy(false);
      setError(paymentError instanceof Error ? paymentError.message : "Could not continue payment");
    }
  };

  const formatCardNumber = (value: string) => value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Secure payment</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Complete your order</h2>
            <p className="mt-1 text-sm text-gray-500">Amount due: <strong className="text-gray-900">{formatCurrency(total)}</strong></p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40" aria-label="Close payment">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5 sm:p-7">
          {!challenge && !reference && (
            <form onSubmit={startPayment} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMethod("mobile_money")} className={`rounded-xl border p-4 text-left transition ${method === "mobile_money" ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-100" : "border-gray-200 hover:border-gray-300"}`}>
                  <DevicePhoneMobileIcon className="h-6 w-6 text-yellow-700" />
                  <span className="mt-2 block font-bold text-gray-900">Mobile Money</span>
                  <span className="text-xs text-gray-500">Approve on your phone</span>
                </button>
                <button type="button" onClick={() => setMethod("card")} className={`rounded-xl border p-4 text-left transition ${method === "card" ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-100" : "border-gray-200 hover:border-gray-300"}`}>
                  <CreditCardIcon className="h-6 w-6 text-yellow-700" />
                  <span className="mt-2 block font-bold text-gray-900">Card</span>
                  <span className="text-xs text-gray-500">Visa or Mastercard</span>
                </button>
              </div>

              {method === "mobile_money" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Mobile network</label>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100">
                      <option value="mtn">MTN Mobile Money</option>
                      <option value="vod">Telecel Cash</option>
                      <option value="atl">AT Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Mobile Money number</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="e.g. 024 123 4567" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" required />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Name on card</label>
                    <input value={cardName} onChange={(e) => setCardName(e.target.value)} autoComplete="cc-name" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" required />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Card number</label>
                    <input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono tracking-wide text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Expiry</label>
                      <input value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/[^\d/]/g, "").slice(0, 7))} autoComplete="cc-exp" placeholder="MM/YY" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" required />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">CVV</label>
                      <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="123" className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" required />
                    </div>
                  </div>
                </div>
              )}

              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60">
                <LockClosedIcon className="h-5 w-5" />
                {busy ? "Starting payment..." : `Pay ${formatCurrency(total)}`}
              </button>
            </form>
          )}

          {challenge && (
            <form onSubmit={submitChallenge} className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-700"><LockClosedIcon className="h-7 w-7" /></div>
              <div>
                <h3 className="text-xl font-bold text-gray-950">Additional verification</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
              {challenge !== "address" && (
                <input type={challenge === "pin" || challenge === "otp" ? "password" : challenge === "birthday" ? "date" : "text"} value={challengeValue} onChange={(e) => setChallengeValue(e.target.value)} autoFocus required className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-wide text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-100" />
              )}
              {challenge === "address" && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">We’ll securely submit your saved delivery address for card verification.</p>}
              <button disabled={busy} className="w-full rounded-xl bg-yellow-600 px-5 py-3.5 font-bold text-white hover:bg-yellow-700 disabled:opacity-60">{busy ? "Verifying..." : "Continue"}</button>
            </form>
          )}

          {reference && !challenge && (
            <div className="py-5 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-100 border-t-yellow-600" />
              <h3 className="mt-5 text-xl font-bold text-gray-950">Waiting for confirmation</h3>
              <p className="mt-2 text-sm text-gray-600">{message || "Complete the authorization to finish your payment."}</p>
              {method === "mobile_money" && <p className="mt-3 text-xs text-gray-500">Check your phone and approve the Mobile Money prompt.</p>}
            </div>
          )}

          {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500"><LockClosedIcon className="h-4 w-4" /> Encrypted and processed securely by Paystack</div>
        </div>
      </div>
    </div>
  );
}
