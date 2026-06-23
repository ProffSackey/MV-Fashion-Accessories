"use client";

import Navbar from "./components/Navbar";
import FooterWrapper from "./components/FooterWrapper";
import { CartProvider } from "../lib/cartContext";
import { usePathname } from "next/navigation";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Navbar />
        <main className={`w-full flex-grow ${isAdminPage ? "pt-0" : "pt-14 sm:pt-[106px]"}`}>
          {children}
        </main>
        <FooterWrapper />
      </div>
    </CartProvider>
  );
}
