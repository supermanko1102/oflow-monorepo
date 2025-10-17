"use client";

import { cn } from "@/lib/utils";
import {
  Home,
  MoreHorizontal,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "首頁",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "訂單",
    href: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    label: "顧客",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    label: "商品",
    href: "/dashboard/catalog",
    icon: Package,
  },
  {
    label: "更多",
    href: "/dashboard/more",
    icon: MoreHorizontal,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-blue-100")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
