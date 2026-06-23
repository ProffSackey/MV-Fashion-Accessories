"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import UserAccountShell from "../components/UserAccountShell";
import {
  CheckCircleIcon,
  CogIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

type SavingTarget = "personal" | "payment" | "security" | "shipping" | null;
type PaymentMethod = "mobile_money" | "card";

type UserMetadata = {
  full_name?: string;
  phone?: string;
  address?: {
    street?: string;
    street2?: string;
    city?: string;
    region?: string;
    postCode?: string;
    postcode?: string;
    country?: string;
  };
  paymentDetails?: {
    method?: PaymentMethod;
    mobileMoney?: {
      provider?: string;
      number?: string;
      accountName?: string;
    } | null;
    card?: {
      cardholderName?: string;
      last4?: string;
      expiry?: string;
    } | null;
  };
  payment_details?: UserMetadata["paymentDetails"];
  [key: string]: unknown;
};

// Helper to build typed payment details and avoid inline casts
function buildPaymentDetails(
  pm: PaymentMethod,
  opts: {
    momoProvider?: string;
    momoNumber?: string;
    momoName?: string;
    cardholderName?: string;
    last4?: string;
    expiry?: string;
  }
): UserMetadata["paymentDetails"] {
  if (pm === "mobile_money") {
    return {
      method: "mobile_money",
      mobileMoney: {
        provider: opts.momoProvider || "",
        number: opts.momoNumber || "",
        accountName: opts.momoName || "",
      },
      card: null,
    };
  }

  return {
    method: "card",
    mobileMoney: null,
    card: {
      cardholderName: opts.cardholderName || "",
      last4: opts.last4 || "",
      expiry: opts.expiry || "",
    },
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SavingTarget>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [metadata, setMetadata] = useState<UserMetadata>({});

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postCode, setPostCode] = useState("");
  const [country, setCountry] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [momoProvider, setMomoProvider] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;

        if (!data.session) {
          router.replace("/login");
          return;
        }

        const user = data.session.user;
        const userMetadata = user.user_metadata || {};
        const address = userMetadata.address || {};
        const paymentDetails = userMetadata.paymentDetails || userMetadata.payment_details || {};
        const savedMethod = paymentDetails.method === "card" ? "card" : "mobile_money";

        setEmail(user.email || "");
        setMetadata(userMetadata);
        setFullName(userMetadata.full_name || user.email || "");
        setPhone(userMetadata.phone || "");
        setAddressLine1(address.street || "");
        setAddressLine2(address.street2 || "");
        setCity(address.city || "");
        setRegion(address.region || "");
        setPostCode(address.postCode || address.postcode || "");
        setCountry(address.country || "");
        setPaymentMethod(savedMethod);
        setMomoProvider(paymentDetails.mobileMoney?.provider || "");
        setMomoNumber(paymentDetails.mobileMoney?.number || "");
        setMomoName(paymentDetails.mobileMoney?.accountName || "");
        setCardholderName(paymentDetails.card?.cardholderName || "");
        setCardNumber(paymentDetails.card?.last4 ? `**** **** **** ${paymentDetails.card.last4}` : "");
        setCardExpiry(paymentDetails.card?.expiry || "");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  const savePersonal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!fullName.trim()) {
      setNotice({ type: "error", text: "Full name is required." });
      return;
    }

    setSaving("personal");
    const nextMetadata = {
      ...metadata,
      full_name: fullName.trim(),
      phone: phone.trim(),
    };

    const { error } = await supabase.auth.updateUser({ data: nextMetadata });
    setSaving(null);

    if (error) {
      setNotice({ type: "error", text: error.message || "Could not save personal information." });
      return;
    }

    setMetadata(nextMetadata);
    setNotice({ type: "success", text: "Personal information saved." });
  };

  const savePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (paymentMethod === "mobile_money") {
      if (!momoProvider.trim() || !momoNumber.trim() || !momoName.trim()) {
        setNotice({ type: "error", text: "Complete your mobile money provider, number, and account name." });
        return;
      }
    } else if (!cardholderName.trim() || !cardNumber.trim() || !cardExpiry.trim()) {
      setNotice({ type: "error", text: "Complete your cardholder name, card number, and expiry date." });
      return;
    }

    const digitsOnlyCardNumber = cardNumber.replace(/\D/g, "");
    if (paymentMethod === "card" && digitsOnlyCardNumber.length < 4) {
      setNotice({ type: "error", text: "Enter a valid card number." });
      return;
    }

    setSaving("payment");

    const paymentDetails = buildPaymentDetails(paymentMethod, {
      momoProvider: momoProvider.trim(),
      momoNumber: momoNumber.trim(),
      momoName: momoName.trim(),
      cardholderName: cardholderName.trim(),
      last4: digitsOnlyCardNumber.slice(-4),
      expiry: cardExpiry.trim(),
    });

    const nextMetadata: UserMetadata = { ...metadata, paymentDetails };
    const { error } = await supabase.auth.updateUser({ data: nextMetadata });
    setSaving(null);

    if (error) {
      setNotice({ type: "error", text: error.message || "Could not save payment details." });
      return;
    }

    setMetadata(nextMetadata);
    if (paymentMethod === "card") {
      setCardNumber(`**** **** **** ${digitsOnlyCardNumber.slice(-4)}`);
    }
    setNotice({ type: "success", text: "Payment details saved." });
  };

  const saveSecurity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      setNotice({ type: "error", text: "Complete all password fields." });
      return;
    }

    if (newPassword.length < 6) {
      setNotice({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setSaving("security");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setSaving(null);
      setNotice({ type: "error", text: "Current password is incorrect." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(null);

    if (error) {
      setNotice({ type: "error", text: error.message || "Could not change password." });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice({ type: "success", text: "Password changed successfully." });
  };

  const saveShipping = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!addressLine1.trim() || !city.trim() || !country.trim()) {
      setNotice({ type: "error", text: "Address line 1, city, and country are required." });
      return;
    }

    setSaving("shipping");

    const address = {
      street: addressLine1.trim(),
      street2: addressLine2.trim(),
      city: city.trim(),
      region: region.trim(),
      postCode: postCode.trim(),
      country: country.trim(),
    };
    const nextMetadata = { ...metadata, address };

    const { error } = await supabase.auth.updateUser({ data: nextMetadata });
    setSaving(null);

    if (error) {
      setNotice({ type: "error", text: error.message || "Could not save shipping information." });
      return;
    }

    setMetadata(nextMetadata);
    setNotice({ type: "success", text: "Shipping information saved." });
  };

  if (loading) {
    return (
      <UserAccountShell userName="Account" title="Account Settings">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-yellow-600" />
          <p className="mt-4 text-sm text-gray-600">Loading settings...</p>
        </div>
      </UserAccountShell>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-600";
  const primaryButtonClass =
    "inline-flex min-h-11 items-center justify-center rounded-md bg-yellow-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <UserAccountShell
      userName={fullName || email || "Account"}
      title="Account Settings"
      subtitle="Update your profile, payment, security, and delivery preferences."
      maxWidth="max-w-6xl"
    >
      {notice && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-lg border p-4 text-sm ${
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{notice.text}</p>
        </div>
      )}

      <div className="space-y-5">
        <form onSubmit={savePersonal} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-md bg-yellow-50 p-2 text-yellow-700">
              <CogIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="fullName">Full name</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} autoComplete="name" />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email address</label>
              <input id="email" value={email} readOnly className={`${inputClass} bg-gray-50 text-gray-600`} autoComplete="email" />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">Phone</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} autoComplete="tel" />
            </div>
            <div className="flex items-end justify-end">
              <button type="submit" disabled={saving === "personal"} className={primaryButtonClass}>
                {saving === "personal" ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={savePayment} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-md bg-yellow-50 p-2 text-yellow-700">
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Payment Settings</h2>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("mobile_money")}
              className={`flex min-h-14 items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
                paymentMethod === "mobile_money"
                  ? "border-yellow-600 bg-yellow-50 text-yellow-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <DevicePhoneMobileIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                <span className="block text-sm font-semibold">Mobile money</span>
                <span className="block text-xs text-gray-500">MTN, Telecel, AirtelTigo</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex min-h-14 items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
                paymentMethod === "card"
                  ? "border-yellow-600 bg-yellow-50 text-yellow-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <CreditCardIcon className="h-5 w-5 flex-shrink-0" />
              <span>
                <span className="block text-sm font-semibold">Card</span>
                <span className="block text-xs text-gray-500">Save card reference for checkout</span>
              </span>
            </button>
          </div>

          {paymentMethod === "mobile_money" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="momoProvider">Network</label>
                <select id="momoProvider" value={momoProvider} onChange={(e) => setMomoProvider(e.target.value)} className={inputClass}>
                  <option value="">Select network</option>
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Telecel Cash">Telecel Cash</option>
                  <option value="AirtelTigo Money">AirtelTigo Money</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="momoNumber">Mobile money number</label>
                <input id="momoNumber" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} className={inputClass} autoComplete="tel" />
              </div>
              <div>
                <label className={labelClass} htmlFor="momoName">Account name</label>
                <input id="momoName" value={momoName} onChange={(e) => setMomoName(e.target.value)} className={inputClass} autoComplete="name" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="cardholderName">Cardholder name</label>
                <input id="cardholderName" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} className={inputClass} autoComplete="cc-name" />
              </div>
              <div>
                <label className={labelClass} htmlFor="cardNumber">Card number</label>
                <input id="cardNumber" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className={inputClass} inputMode="numeric" autoComplete="cc-number" />
              </div>
              <div>
                <label className={labelClass} htmlFor="cardExpiry">Expiry date</label>
                <input id="cardExpiry" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className={inputClass} placeholder="MM/YY" autoComplete="cc-exp" />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">For security, full card numbers and CVV are not stored here.</p>
            <button type="submit" disabled={saving === "payment"} className={primaryButtonClass}>
              {saving === "payment" ? "Saving..." : "Save payment details"}
            </button>
          </div>
        </form>

        <form onSubmit={saveSecurity} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-md bg-green-50 p-2 text-green-700">
              <LockClosedIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} autoComplete="current-password" />
            </div>
            <div>
              <label className={labelClass} htmlFor="newPassword">New password</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirmPassword">Confirm new password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
            </div>
            <div className="flex items-end justify-end">
              <button type="submit" disabled={saving === "security"} className={primaryButtonClass}>
                {saving === "security" ? "Changing..." : "Change password"}
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={saveShipping} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-md bg-yellow-50 p-2 text-yellow-700">
              <TruckIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Shipping / Delivery Info</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className={labelClass} htmlFor="addressLine1">Address line 1</label>
              <input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputClass} autoComplete="address-line1" />
            </div>
            <div className="sm:col-span-3">
              <label className={labelClass} htmlFor="addressLine2">Address line 2</label>
              <input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputClass} autoComplete="address-line2" />
            </div>
            <div>
              <label className={labelClass} htmlFor="city">City</label>
              <input id="city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} autoComplete="address-level2" />
            </div>
            <div>
              <label className={labelClass} htmlFor="region">Region / State</label>
              <input id="region" value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass} autoComplete="address-level1" />
            </div>
            <div>
              <label className={labelClass} htmlFor="postCode">Postal code</label>
              <input id="postCode" value={postCode} onChange={(e) => setPostCode(e.target.value)} className={inputClass} autoComplete="postal-code" />
            </div>
            <div>
              <label className={labelClass} htmlFor="country">Country</label>
              <input id="country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} autoComplete="country-name" />
            </div>
            <div className="flex items-end justify-end sm:col-span-2">
              <button type="submit" disabled={saving === "shipping"} className={primaryButtonClass}>
                {saving === "shipping" ? "Saving..." : "Save shipping info"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </UserAccountShell>
  );
}
