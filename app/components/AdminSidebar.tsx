"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  EnvelopeIcon,
  BellIcon,
  ShoppingCartIcon,
  CubeIcon,
  GiftIcon,
  CreditCardIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  NewspaperIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

type AdminSection =
  | "dashboard"
  | "messages"
  | "notifications"
  | "orders"
  | "products"
  | "promotions"
  | "transactions"
  | "customers"
  | "analytics"
  | "reviews"
  | "newsletter"
  | "settings";

interface AdminSidebarProps {
  active?: AdminSection;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { key: "dashboard", label: "Dashboard Overview", href: "/admin/dashboard", icon: HomeIcon },
  { key: "messages", label: "Messages", href: "/admin/messages", icon: EnvelopeIcon },
  { key: "notifications", label: "Notifications", href: "/admin/notifications", icon: BellIcon },
  { key: "orders", label: "Orders", href: "/admin/orders", icon: ShoppingCartIcon },
  { key: "products", label: "Products", href: "/admin/products", icon: CubeIcon },
  { key: "promotions", label: "Promotions", href: "/admin/promotions", icon: GiftIcon },
  { key: "transactions", label: "Transactions", href: "/admin/transactions", icon: CreditCardIcon },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: UserGroupIcon },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: ChartBarIcon },
  { key: "reviews", label: "Reviews", href: "/admin/reviews", icon: StarIcon },
  { key: "newsletter", label: "Newsletters", href: "/admin/newsletter", icon: NewspaperIcon },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
] satisfies Array<{
  key: AdminSection;
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}>;

function SidebarNav({ active, onClick }: { active?: AdminSection; onClick?: () => void }) {
  return (
    <nav className="space-y-3 text-gray-700 text-base">
      {navItems.map((item) => {
        const Icon = item.icon;
        const activeClass = active === item.key ? "bg-gray-100" : "";

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 font-medium transition ${activeClass}`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminSidebar({ active, mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    onMobileClose?.();
  };

  const renderLogoutButton = () => (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-4 flex items-center gap-3 px-3 py-2 rounded text-red-600 hover:bg-red-50 font-medium transition"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5" />
      Logout
    </button>
  );

  return (
    <>
      <aside className="w-64 text-gray-800 bg-white border-r border-gray-200 p-4 hidden md:flex md:flex-col">
        <h2 className="text-lg font-semibold mb-6">Menu</h2>
        <SidebarNav active={active} />
        <div className="mt-auto pt-4 border-t border-gray-200">{renderLogoutButton()}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-lg overflow-y-auto">
            <h2 className="text-lg font-semibold mb-6">Menu</h2>
            <SidebarNav active={active} onClick={onMobileClose} />
            <div className="mt-auto pt-4 border-t border-gray-200">{renderLogoutButton()}</div>
          </div>
          <button
            type="button"
            aria-label="Close admin menu"
            className="flex-1"
            onClick={onMobileClose}
          />
        </div>
      )}
    </>
  );
}
