import { supabase } from './supabaseClient';

export interface GuestCartItem {
  productId: string;
  quantity: number;
  name?: string;
  price?: string;
  image_url?: string;
}

const GUEST_CART_CHANGE_EVENT = 'guestCartChange';
const USER_CART_CHANGE_EVENT = 'userCartChange';
const GUEST_CART_ID_COOKIE = 'guest_cart_id';

const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
};

export const getGuestCartId = (): string | null => getCookie(GUEST_CART_ID_COOKIE);

const dispatchCartChangeEvent = (): void => {
  if (typeof window === 'undefined') return;
  (async () => {
    try {
      const guestId = getGuestCartId();
      let count = 0;
      if (guestId) {
        const items = await fetchGuestCartFromSupabase(guestId);
        count = Array.isArray(items) ? items.reduce((s, it) => s + (Number((it as any).quantity) || 0), 0) : 0;
      }
      try {
        window.dispatchEvent(new CustomEvent(GUEST_CART_CHANGE_EVENT, { detail: { count } }));
      } catch (e) {
        try { window.dispatchEvent(new CustomEvent(GUEST_CART_CHANGE_EVENT)); } catch { /* ignore */ }
      }
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent(GUEST_CART_CHANGE_EVENT)); } catch { /* ignore */ }
    }
  })();
};

export const saveGuestCartToSupabase = async (cartParam?: GuestCartItem[]): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const cart = cartParam ?? [];
    // allow saving an empty array to clear remote cart
    let guestId = getCookie(GUEST_CART_ID_COOKIE) || (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `guest-${Date.now()}-${Math.floor(Math.random()*10000)}`);
    const payload = { id: guestId, items: cart };
    const { data, error } = await supabase.from('guest_carts').upsert([payload]).select('id').single();
    if (error) {
      console.error('[saveGuestCartToSupabase] Failed upserting guest cart:', error);
      return null;
    }
    guestId = data?.id || guestId;
    setCookie(GUEST_CART_ID_COOKIE, guestId);
    try {
      const count = Array.isArray(cart) ? cart.reduce((s, it) => s + (Number((it as any).quantity) || 0), 0) : 0;
      window.dispatchEvent(new CustomEvent(GUEST_CART_CHANGE_EVENT, { detail: { count } }));
    } catch (e) { /* non-fatal */ }
    return guestId;
  } catch (e) {
    console.error('[saveGuestCartToSupabase] Exception saving guest cart:', e);
    return null;
  }
};

export const fetchGuestCartFromSupabase = async (guestId?: string): Promise<GuestCartItem[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const id = guestId || getCookie(GUEST_CART_ID_COOKIE);
    if (!id) return [];
    const { data, error } = await supabase.from('guest_carts').select('items').eq('id', id).limit(1).single();
    if (error) {
      console.error('[fetchGuestCartFromSupabase] Error fetching guest cart:', error);
      return [];
    }
    return data?.items || [];
  } catch (e) {
    console.error('[fetchGuestCartFromSupabase] Exception:', e);
    return [];
  }
};

export const migrateGuestCartToSupabase = async (): Promise<string | null> => {
  // Migration from localStorage was intentionally removed; keep function for compatibility.
  return null;
};

export const getGuestCart = (): GuestCartItem[] => {
  // Deprecated synchronous API. Use `fetchGuestCartFromSupabase()` instead.
  console.warn('[cartUtils] getGuestCart() is deprecated; use fetchGuestCartFromSupabase() instead');
  return [];
};

export const addToGuestCart = async (item: GuestCartItem, maxStock: number = 999): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const current = await fetchGuestCartFromSupabase();
    const cart = Array.isArray(current) ? [...current] : [];
    const existingIndex = cart.findIndex(c => String((c as any).productId) === String(item.productId));
    if (existingIndex >= 0) {
      let newQuantity = Number((cart as any)[existingIndex].quantity || 0) + item.quantity;
      if (newQuantity > maxStock) newQuantity = maxStock;
      (cart as any)[existingIndex].quantity = newQuantity;
    } else {
      let quantity = item.quantity;
      if (quantity > maxStock) quantity = maxStock;
      cart.push({ ...item, quantity });
    }
    await saveGuestCartToSupabase(cart);
    dispatchCartChangeEvent();
  } catch (e) {
    console.error('[cartUtils] Error adding to guest cart (supabase):', e);
  }
};

export const updateGuestCartItem = async (productId: string, quantity: number, maxStock: number = 999): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const current = await fetchGuestCartFromSupabase();
    let cart = Array.isArray(current) ? [...current] : [];
    if (quantity <= 0) {
      cart = cart.filter(c => String((c as any).productId) !== String(productId));
    } else {
      const item = cart.find(c => String((c as any).productId) === String(productId));
      if (item) {
        if (quantity > maxStock) quantity = maxStock;
        (item as any).quantity = quantity;
      }
    }
    await saveGuestCartToSupabase(cart);
    dispatchCartChangeEvent();
  } catch (e) {
    console.error('[cartUtils] Error updating guest cart (supabase):', e);
  }
};

export const removeFromGuestCart = async (productId: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    const current = await fetchGuestCartFromSupabase();
    let cart = Array.isArray(current) ? [...current] : [];
    cart = cart.filter(c => String((c as any).productId) !== String(productId));
    await saveGuestCartToSupabase(cart);
    dispatchCartChangeEvent();
  } catch (e) {
    console.error('[cartUtils] Error removing from guest cart (supabase):', e);
  }
};

export const clearGuestCart = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    await saveGuestCartToSupabase([]);
    dispatchCartChangeEvent();
  } catch (e) {
    console.error('[cartUtils] Failed clearing guest cart in Supabase:', e);
  }
};

export const getGuestCartCount = (): number => {
  console.warn('[cartUtils] getGuestCartCount() is deprecated; use fetchGuestCartFromSupabase() instead');
  return 0;
};

export const subscribeToGuestCartChanges = (callback: (count: number) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handleCartChange = (e: Event) => {
    const customEvent = e as CustomEvent;
    let count = Number(customEvent.detail?.count);
    if (!Number.isFinite(count)) {
      (async () => {
        try {
          const items = await fetchGuestCartFromSupabase();
          const resolved = Array.isArray(items) ? (items as any[]).reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;
          callback(resolved);
        } catch (err) {
          console.error('[cartUtils] Failed to resolve guest cart count from Supabase:', err);
          callback(0);
        }
      })();
      return;
    }
    callback(count);
  };
  window.addEventListener(GUEST_CART_CHANGE_EVENT, handleCartChange);
  return () => window.removeEventListener(GUEST_CART_CHANGE_EVENT, handleCartChange);
};

export const subscribeToUserCartChanges = (email: string, callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handleCartChange = (e: Event) => {
    const customEvent = e as CustomEvent;
    const eventEmail = customEvent.detail?.email;
    if (eventEmail === email) callback();
  };
  window.addEventListener(USER_CART_CHANGE_EVENT, handleCartChange);
  return () => window.removeEventListener(USER_CART_CHANGE_EVENT, handleCartChange);
};
