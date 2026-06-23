"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  BellIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

interface AdminNavbarProps {
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function AdminNavbar({ onMenuToggle }: AdminNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [adminProfile, setAdminProfile] = useState({
    name: 'Admin',
    email: '',
  });
  const router = useRouter();

  // load unread notifications count on mount
  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
        if (!res.ok) return;
        const data: any[] = await res.json();
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to load notification count', err);
      }
    };

    loadCount();
    const interval = window.setInterval(loadCount, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadMessageCount = async () => {
      if (!navigator.onLine) {
        setUnreadMessageCount(0);
        return;
      }

      try {
        const res = await fetch('/api/admin/messages/unread', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) {
          setUnreadMessageCount(0);
          return;
        }
        const data = await res.json();
        setUnreadMessageCount(Number(data.count) || 0);
      } catch (err) {
        setUnreadMessageCount(0);
      }
    };

    loadMessageCount();
    const interval = window.setInterval(loadMessageCount, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const res = await fetch('/api/admin/verify-session', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setAdminProfile({
          name: data.adminName || 'Admin',
          email: data.adminEmail || '',
        });
      } catch (err) {
        console.error('Failed to load admin profile', err);
      }
    };

    loadAdminProfile();
  }, []);

  const handleMenuToggle = (isOpen: boolean) => {
    setMobileMenuOpen(isOpen);
    onMenuToggle?.(isOpen);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-gray-500 to-gray-500 text-white sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side - Logo and brand */}
        <Link href="/admin/dashboard" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
          MV Fashion Accessories Admin
        </Link>

        {/* Right side - User profile and actions */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => handleMenuToggle(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-yellow-500 rounded-lg transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>

          {/* Notification icon */}
          <div className="relative mr-4">
            <Link href="/admin/notifications" className="p-2 hover:bg-yellow-500 rounded-lg transition relative">
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>

          <div className="relative mr-4">
            <Link href="/admin/messages" className="p-2 hover:bg-yellow-500 rounded-lg transition relative" aria-label="Messages">
              <EnvelopeIcon className="h-6 w-6" />
              {unreadMessageCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadMessageCount}
                </span>
              )}
            </Link>
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-yellow-500 rounded-lg transition"
            >
              <UserCircleIcon className="h-6 w-6" />
              <span className="hidden sm:inline text-sm font-medium">{adminProfile.name}</span>
            </button>

            {/* Dropdown menu */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold">{adminProfile.name}</p>
                  {adminProfile.email && <p className="text-xs text-gray-500">{adminProfile.email}</p>}
                </div>
                <Link
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-100 text-sm transition flex items-center gap-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm transition flex items-center gap-2 border-t border-gray-200 mt-2 pt-2"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
