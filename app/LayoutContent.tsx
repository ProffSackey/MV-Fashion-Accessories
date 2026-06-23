"use client";

import Navbar from "./components/Navbar";
import FooterWrapper from "./components/FooterWrapper";
import { CartProvider } from "../lib/cartContext";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="w-full flex-grow pt-14 sm:pt-[106px]">
          {children}
        </main>
        <FooterWrapper />
      </div>
    </CartProvider>
  );
}
