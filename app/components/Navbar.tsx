"use client";

import Link from "next/link";
import Image from "next/image";
import SearchBar from './SearchBar';
import { UserCircleIcon, MagnifyingGlassIcon, Bars3Icon, XMarkIcon, EnvelopeIcon, ShoppingBagIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { signOutUser } from '../../lib/userSession';
import { subscribeToGuestCartChanges, subscribeToUserCartChanges, migrateGuestCartToSupabase, fetchGuestCartFromSupabase, getGuestCartId } from '../../lib/cartUtils';
import { useCart } from '../../lib/cartContext';
import { getUserCartCount } from '../../lib/supabaseService';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // cart counts are now managed via context so that any consumer can update them
  const { guestCount, userCount, setGuestCount, setUserCount } = useCart();
  const [mounted, setMounted] = useState(false);

  // don't render on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const [categories, setCategories] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isAdminSessionActive = async () => {
    try {
      const res = await fetch('/api/admin/verify-session', { credentials: 'include' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    setFirstName('');
    setUserCount(0);
    await signOutUser(pathname?.startsWith('/user') || pathname?.startsWith('/orders') || pathname?.startsWith('/messages') || pathname?.startsWith('/reviews') || pathname?.startsWith('/settings') ? router : undefined);
  };

  const applyUserSession = async (sessionUser: any | null) => {
    if (!sessionUser) {
      setUser(null);
      setFirstName('');
      setUserCount(0);
      return;
    }

    if (await isAdminSessionActive()) {
      setUser(null);
      setFirstName('');
      setUserCount(0);
      return;
    }

    setUser(sessionUser);
    const fullName = sessionUser.user_metadata?.full_name || sessionUser.email || '';
    setFirstName(fullName.split(' ')[0]);
  };

  // Show user cart count if logged in, otherwise show guest cart count
  const cartCount = user ? userCount : guestCount;

  console.log('[Navbar] Current state - user:', !!user, 'userCartCount:', userCount, 'guestCount:', guestCount, 'displayed cartCount:', cartCount);

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load guest cart from Supabase for initial count (migration removed)
    (async () => {
      try {
        await migrateGuestCartToSupabase();
        const items = await fetchGuestCartFromSupabase();
        if (items && items.length > 0) {
          const count = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
          console.log('[Navbar] Initial guest cart count from Supabase:', count, 'setting guest count to:', count);
          setGuestCount(count);
        } else {
          // No guest cart in Supabase — start at zero
          console.log('[Navbar] No guest cart found in Supabase; setting guest count to 0');
          setGuestCount(0);
        }
      } catch (e) {
        console.error('[Navbar] Failed to fetch guest cart from Supabase:', e);
        setGuestCount(0);
      }
    })();

    // Subscribe to guest cart changes (custom event updates)
    const unsubscribe = subscribeToGuestCartChanges((count) => {
      console.log('[Navbar] Guest cart count updated to (event):', count, 'current guestCount:', guestCount, 'will set to:', count);
      setGuestCount(count);
      console.log('[Navbar] guest count context set to:', count);
    });

    // Also subscribe to Supabase realtime for this guest cart id (if present)
    const guestId = getGuestCartId();
    let guestChannel: any = null;
    if (guestId) {
      guestChannel = supabase
        .channel(`guest-cart-${guestId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_carts', filter: `id=eq.${guestId}` }, async (payload) => {
          console.log('[Navbar] Realtime guest_carts change detected:', payload.eventType, 'for guest id:', guestId, 'fetching updated cart');
          try {
            const items = await fetchGuestCartFromSupabase(guestId);
            const count = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) : 0;
            setGuestCount(count);
          } catch (e) {
            console.error('[Navbar] Failed to fetch guest cart after realtime update:', e);
          }
        })
        .subscribe((status) => {
          console.log('[Navbar] Guest realtime subscription status for', guestId, ':', status);
        });
    }

    // Cleanup subscription on unmount
    return () => {
      try { unsubscribe(); } catch {}
      try { guestChannel?.unsubscribe(); } catch {}
    };
  }, []);

  useEffect(() => {
    // Fetch user's cart count if logged in
    const fetchUserCartCount = async (email: string) => {
      try {
        console.log('[Navbar] Fetching user cart count for email:', email);
        const count = await getUserCartCount(email);
        console.log('[Navbar] User cart count fetched successfully:', count, 'setting userCount to:', count);
        setUserCount(count);
        console.log('[Navbar] user count context updated to:', count);
      } catch (error) {
        console.error('[Navbar] Error fetching user cart count:', error);
        setUserCount(0);
      }
    };

    if (user?.email) {
      // Fetch initial count immediately
      fetchUserCartCount(user.email);

      // Subscribe to cart_items changes for this user in real-time
      const channel = supabase
        .channel(`cart-items-${user.email}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `customer_email=eq.${user.email}`,
          },
          (payload) => {
            // Refetch cart count on any change
            console.log('[Navbar] Realtime cart_items change detected:', payload.eventType, 'for user:', user.email, 'triggering fetch');
            fetchUserCartCount(user.email);
          }
        )
        .subscribe((status) => {
          console.log('[Navbar] Realtime subscription status for user', user.email, ':', status);
        });

      // Also subscribe to custom user cart change events
      const unsubscribeCustom = subscribeToUserCartChanges(user.email, () => {
        console.log('[Navbar] Custom user cart change event received for:', user.email, 'triggering fetch');
        fetchUserCartCount(user.email);
      });

      return () => {
        channel.unsubscribe();
        unsubscribeCustom();
      };
    }
  }, [user]);

  useEffect(() => {
    if (!user?.email) {
      setUnreadMessages(0);
      return;
    }

    const loadUnreadMessages = async () => {
      try {
        const res = await fetch(`/api/messages/unread?email=${encodeURIComponent(user.email)}`);
        if (!res.ok) return;
        const data = await res.json();
        setUnreadMessages(Number(data.count) || 0);
      } catch (error) {
        console.error('[Navbar] Failed to fetch unread message count:', error);
      }
    };

    loadUnreadMessages();

    const channel = supabase
      .channel(`user-message-count-${user.email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_email=eq.${user.email}`,
        },
        loadUnreadMessages
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.email]);

  // Listen for immediate count update events (both server and guest changes)
  useEffect(() => {
    const userHandler = (ev: any) => {
      try {
        const detail = ev?.detail;
        if (detail?.count != null) {
          console.log('[Navbar] userCartCountUpdated event received:', detail.count, 'current userCount:', userCount, 'will set to:', Number(detail.count));
          setUserCount(Number(detail.count));
          console.log('[Navbar] user count context set to:', Number(detail.count));
        } else {
          console.log('[Navbar] userCartCountUpdated event received but no count in detail:', detail);
        }
      } catch (e) {
        console.error('userCartCountUpdated handler error', e);
      }
    };

    const guestHandler = (ev: any) => {
      try {
        const count = Number(ev?.detail?.count);
        const finalCount = Number.isFinite(count) ? count : 0;
        console.log('[Navbar] guestCartChange event received:', count, 'current guestCount:', guestCount, 'will set to:', finalCount);
        setGuestCount(finalCount);
      } catch (e) {
        console.error('guestCartChange handler error', e);
      }
    };

    console.log('[Navbar] Setting up cart change event listeners');
    window.addEventListener('userCartCountUpdated', userHandler as EventListener);
    window.addEventListener('guestCartChange', guestHandler as EventListener);

    return () => {
      console.log('[Navbar] Removing cart change event listeners');
      window.removeEventListener('userCartCountUpdated', userHandler as EventListener);
      window.removeEventListener('guestCartChange', guestHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    fetch('/api/categories')
      .then(async (r) => {
        if (!r.ok) {
          console.error('failed to fetch categories', r.status);
          return [] as string[];
        }
        try {
          return await r.json();
        } catch (e) {
          console.error('could not parse categories response', e);
          return [] as string[];
        }
      })
      .then(setCategories)
      .catch(console.error);

    // Fetch user session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        console.log('[Navbar] Initial session check:', !!data.session, 'user email:', data.session?.user?.email);
        applyUserSession(data.session?.user || null);
      })
      .catch((err) => {
        console.error('Failed to fetch session:', err);
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Navbar] Auth state change:', event, 'session exists:', !!session);
      applyUserSession(session?.user || null);
    });

    // Realtime subscription to categories so navbar updates immediately
    const channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
        try {
          const p: any = payload;
          const ev = p.eventType || p.event || p.type || '';
          const newRec = p.new || null;
          const oldRec = p.old || null;
          setCategories((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            if (ev === 'INSERT') {
              if (newRec && newRec.name && !list.includes(newRec.name)) {
                return [...list, newRec.name];
              }
              return list;
            }
            if (ev === 'UPDATE') {
              if (oldRec?.name && newRec?.name) {
                return list.map((c) => (c === oldRec.name ? newRec.name : c));
              }
              return list;
            }
            if (ev === 'DELETE') {
              if (oldRec?.name) return list.filter((c) => c !== oldRec.name);
              return list;
            }
            return list;
          });
        } catch (e) {
          console.error('category realtime handler error', e);
        }
      })
      .subscribe();
    return () => {
      subscription?.unsubscribe();
      try {
        channel.unsubscribe();
      } catch {}
    };
  }, []);

  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-gray-200 bg-white">
      {/* top row with logo and icons - visible on all screens */}
      <div className="flex h-14 w-full items-center gap-1 px-2 sm:h-[68px] sm:gap-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center">
            {/* logo + site name */}
            <div className="min-w-0 max-w-[calc(100vw-168px)] sm:max-w-none">
                <Link href="/" className="inline-flex min-w-0 max-w-full items-center gap-2">
                  <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden sm:h-10 sm:w-10">
                  <Image src="/mvlog.jpg" alt="MV Fashion Accessories" fill className="object-contain" priority />
                </div>
                <span className="min-w-0 truncate text-sm font-semibold leading-none text-gray-900 sm:text-xl lg:text-[22px]">MV Fashion Accessories</span>
              </Link>
            </div>
          </div>

          {/* desktop search component */}
          <SearchBar categories={categories} />

          {/* icons */}
          <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-3">
            <Link href="/contact" aria-label="Help" className="hidden sm:inline-flex h-11 items-center gap-2 bg-white border border-gray-300 rounded-full px-4 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition">
              <QuestionMarkCircleIcon className="h-5 w-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Help</span>
            </Link>

            <Link href="/messages" aria-label="Messages" className="relative hidden sm:inline-flex h-11 w-11 items-center justify-center bg-white border border-gray-300 rounded-full hover:border-gray-400 hover:bg-gray-50 transition">
              <EnvelopeIcon className="h-5 w-5 text-gray-700" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-600 text-white text-xs font-bold rounded-full h-5 min-w-5 w-auto px-1 flex items-center justify-center whitespace-nowrap">
                  {unreadMessages}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Open search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50 sm:hidden"
            >
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-700" />
            </button>

            <Link href="/cart" aria-label="Cart" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50 sm:h-11 sm:w-11 sm:border sm:border-gray-300 sm:hover:border-gray-400">
              <ShoppingBagIcon className="h-5 w-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-600 text-white text-xs font-bold rounded-full h-5 min-w-5 w-auto px-1 flex items-center justify-center whitespace-nowrap">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href={user ? "/user" : "/login"} aria-label="Account" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50 sm:h-11 sm:w-auto sm:gap-2 sm:border sm:border-gray-300 sm:px-4 sm:hover:border-gray-400">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={firstName || 'Account'} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <UserCircleIcon className="h-6 w-6 text-gray-700" />
              )}
              <span className="hidden sm:inline text-sm font-medium text-gray-700">{user ? firstName : 'Sign In'}</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50 sm:hidden"
            >
              <Bars3Icon className="h-5 w-5 text-gray-700" />
            </button>
          </div>
      </div>

      {/* Mobile search - opened by icon */}
      {mobileSearchOpen && (
        <div className="sm:hidden text-gray-600 bg-gray-50 border-t border-gray-200 w-full px-3 py-3">
          <div className="max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setMobileSearchOpen(false)} aria-label="Close search" className="p-2">
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
              <SearchBar categories={categories} variant="mobile" onNavigate={() => setMobileSearchOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* category row (hidden on mobile; categories available via menu) */}
      <div className="hidden sm:block text-gray-700 bg-gray-50 border-t border-gray-200 w-full overflow-x-auto">
        <div className="w-full px-2 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-6 py-2 text-[15px] sm:text-sm whitespace-nowrap overflow-x-auto scrollbar-hide">
            <Link href="/about" className="hover:text-yellow-700 transition py-1 px-0.5 flex-shrink-0">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-yellow-700 transition py-1 px-0.5 flex-shrink-0">
              Contact Us
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/category/${cat
                  .toLowerCase()
                  .replace(/ & /g, "-")
                  .replace(/ /g, "-")}`}
                className="hover:text-yellow-700 transition py-1 px-0.5 flex-shrink-0"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile category drawer (opens from right) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 sm:w-80 bg-white p-4 shadow-lg overflow-auto h-full">
            <button className="absolute top-3 right-3 p-1 text-gray-600 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Menu</h3>
            <nav>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <Link
                    href="/"
                    className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  {user ? (
                    <button
                      type="button"
                      className="block w-full px-2 py-2 text-left rounded hover:bg-gray-100 font-medium"
                      onClick={async () => {
                        await handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  )}
                </li>
                {user && (
                  <li>
                    <Link
                      href="/user"
                      className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Account
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/contact"
                    className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Help
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="block px-2 py-2 rounded hover:bg-gray-100 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact Us
                  </Link>
                </li>
                <li className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase block px-2 py-1">Categories</span>
                </li>
                {categories.length === 0 && <li className="text-sm text-gray-500">No categories</li>}
                {categories.map((cat) => (
                  <li key={cat}>
                    <Link
                      href={`/category/${cat
                        .toLowerCase()
                        .replace(/ & /g, "-")
                        .replace(/ /g, "-")}`}
                      className="block px-2 py-2 rounded hover:bg-gray-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </nav>
  );
}
