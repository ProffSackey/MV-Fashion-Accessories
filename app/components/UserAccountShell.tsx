"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, Bars3Icon } from "@heroicons/react/24/outline";
import UserSidebar from "./UserSidebar";

interface UserAccountShellProps {
  userName?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function UserAccountShell({
  userName = "Account",
  title,
  subtitle,
  children,
  maxWidth = "max-w-5xl",
}: UserAccountShellProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (userName || "Account").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 flex w-full">
      <UserSidebar userName={userName} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <section className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700"
              aria-label="Open account menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Account</p>
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-600 text-sm font-bold text-white">
              {initials}
            </div>
          </div>
        </div>

        <main className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <div className={`mx-auto w-full ${maxWidth}`}>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-yellow-300 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>
            <header className="mb-5 hidden md:block">
              <p className="text-sm font-semibold text-yellow-700">Account</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-950">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
            </header>
            {children}
          </div>
        </main>
      </section>
    </div>
  );
}
