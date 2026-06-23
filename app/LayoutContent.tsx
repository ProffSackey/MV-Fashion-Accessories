"use client";

import Navbar from "./components/Navbar";
import FooterWrapper from "./components/FooterWrapper";
import { CartProvider } from "../lib/cartContext";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen w-full">
        <Navbar />
        <main className="flex-grow w-screen">
          {children}
        </main>
        <FooterWrapper />
      </div>
    </CartProvider>
  );
}