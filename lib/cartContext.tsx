"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchGuestCartFromSupabase } from './cartUtils';
import { getUserCartCount } from './supabaseService';
import { supabase } from './supabaseClient';

interface CartContextType {
  guestCount: number;
  userCount: number;
  setGuestCount: (count: number) => void;
  setUserCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [guestCount, setGuestCount] = useState<number>(0);
  const [userCount, setUserCount] = useState<number>(0);

  // initialize guest count on mount (fetch authoritative count from Supabase)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const items = await fetchGuestCartFromSupabase();
        const initial = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
        setGuestCount(initial);
      } catch (e) {
        console.error('[cartContext] Failed to fetch guest cart count from Supabase:', e);
        setGuestCount(0);
      }
    })();
  }, []);

  // optional: provide a way to sync user count when email changes via supabase subscription
  // this effect could be mounted by a consumer (e.g. Navbar) that knows user email

  return (
    <CartContext.Provider value={{ guestCount, userCount, setGuestCount, setUserCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
