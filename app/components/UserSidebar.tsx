"use client";

import { useRouter, usePathname } from "next/navigation";
import { UserCircleIcon, ShoppingBagIcon, EnvelopeIcon, StarIcon, CogIcon, ArrowLeftOnRectangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { signOutUser } from "../../lib/userSession";

interface Props {
  userName: string;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  enableMobileDrawer?: boolean;
}

export default function UserSidebar({ userName, mobileOpen, setMobileOpen, enableMobileDrawer = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'My Profile', href: '/user', icon: <UserCircleIcon className="h-5 w-5" /> },
    { label: 'My Orders', href: '/orders', icon: <ShoppingBagIcon className="h-5 w-5" /> },
    { label: 'Messages', href: '/messages', icon: <EnvelopeIcon className="h-5 w-5" /> },
    { label: 'Ratings & Reviews', href: '/reviews', icon: <StarIcon className="h-5 w-5" /> },
    { label: 'Settings', href: '/settings', icon: <CogIcon className="h-5 w-5" /> },
    { label: 'Sign Out', href: '#logout', icon: <ArrowLeftOnRectangleIcon className="h-5 w-5" /> },
  ];

  return (
    <>
      {/* Persistent sidebar (desktop and up) */}
      <aside className="hidden md:flex w-64 sm:w-72 lg:w-64 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 p-3 sm:p-4">

        <nav className="space-y-1">
          {navItems.map((it) => {
            const active = it.href === '/user' ? pathname === it.href : pathname.startsWith(it.href);
            return (
              <button
                key={it.href}
                onClick={async () => {
                  // handle logout as special action
                  if (it.href === '#logout') {
                    await signOutUser(router);
                    return;
                  }
                  router.push(it.href);
                }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition ${active ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className={active ? "text-yellow-600" : "text-gray-400"}>{it.icon}</span>
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer */}
      {enableMobileDrawer && (
        <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
          <div className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileOpen(false)} />
          <div className={`absolute inset-y-0 left-0 z-10 w-72 max-w-[84vw] bg-white border-r border-gray-200 shadow-2xl transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-yellow-600 text-white flex items-center justify-center font-semibold">{(userName||'U').slice(0,2).toUpperCase()}</div>
                  <div className="text-sm font-medium">{userName || 'Account'}</div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md text-gray-600 hover:bg-gray-50">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-3 overflow-y-auto flex-1 space-y-1">
                {navItems.map((it) => {
                  return (
                    <button
                      key={it.href}
                      onClick={async () => {
                        if (it.href === '#logout') {
                          setMobileOpen(false);
                          await signOutUser(router);
                          return;
                        }
                        setMobileOpen(false);
                        router.push(it.href);
                      }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-md ${
                        it.href !== '#logout' && (it.href === '/user' ? pathname === it.href : pathname.startsWith(it.href))
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-400">{it.icon}</span>
                      <span className="text-sm">{it.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
