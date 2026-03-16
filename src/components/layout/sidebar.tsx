"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard, Building2, LogOut, Settings, ChevronRight,
} from "lucide-react";

interface SidebarProps {
  brands: Array<{ id: string; name: string }>;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/brands", label: "Brands", icon: Building2 },
];

export function Sidebar({ brands }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-gray-100">
        <Link href="/dashboard">
          <Image
            src="/admind-logo.png"
            alt="ad.mind"
            width={110}
            height={36}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* Brands list */}
        {brands.length > 0 && (
          <div className="mt-6">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              My Brands
            </p>
            <div className="space-y-0.5">
              {brands.map((brand) => {
                const href = `/brands/${brand.id}`;
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={brand.id}
                    href={href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group",
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{brand.name}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
