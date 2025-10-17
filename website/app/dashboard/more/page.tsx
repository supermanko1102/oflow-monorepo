"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockOrganization } from "@/lib/mock-data";
import {
  BarChart3,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const menuItems = [
  {
    icon: BarChart3,
    label: "報表中心",
    description: "查看營收與分析",
    href: "/dashboard/analytics",
    color: "text-blue-600",
  },
  {
    icon: Settings,
    label: "系統設定",
    description: "管理帳號與偏好",
    href: "/dashboard/settings",
    color: "text-neutral-600",
  },
  {
    icon: FileText,
    label: "操作記錄",
    description: "查看歷史操作",
    href: "#",
    color: "text-neutral-600",
  },
  {
    icon: HelpCircle,
    label: "幫助中心",
    description: "使用說明與常見問題",
    href: "#",
    color: "text-neutral-600",
  },
];

export default function MorePage() {
  const router = useRouter();

  const handleLogout = () => {
    // 導向登入頁
    router.push("/login");
  };

  return (
    <div className="space-y-6 p-4">
      {/* 頂部標題 */}
      <h1 className="text-2xl font-bold text-neutral-900">更多</h1>

      {/* 使用者資訊卡片 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-blue-100 text-xl text-blue-700">
              店
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900">店長</h3>
            <p className="text-sm text-neutral-600">{mockOrganization.name}</p>
            <p className="text-xs text-neutral-500">admin@oflow.com</p>
          </div>
        </div>
      </Card>

      {/* 功能選單 */}
      <Card className="overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label}>
              <Link
                href={item.href}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 ${item.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{item.label}</p>
                  <p className="text-sm text-neutral-500">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-400" />
              </Link>
              {index < menuItems.length - 1 && <Separator />}
            </div>
          );
        })}
      </Card>

      {/* 登出按鈕 */}
      <Card className="overflow-hidden">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-red-600">登出</p>
            <p className="text-sm text-neutral-500">登出您的帳號</p>
          </div>
        </button>
      </Card>

      {/* 版本資訊 */}
      <div className="text-center text-xs text-neutral-400">OFlow v1.0.0</div>
    </div>
  );
}
