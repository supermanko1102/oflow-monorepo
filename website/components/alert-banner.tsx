"use client";

import { AlertCircle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertBannerProps {
  pendingCount: number;
}

export function AlertBanner({ pendingCount }: AlertBannerProps) {
  const router = useRouter();

  if (pendingCount === 0) return null;

  const handleClick = () => {
    router.push("/dashboard/orders?filter=pending");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-left shadow-lg transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <AlertCircle className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">
            您有 {pendingCount} 筆訂單待確認付款
          </p>
          <p className="text-sm text-orange-100">點擊查看詳情</p>
        </div>
        <ChevronRight className="h-5 w-5 text-white" />
      </div>
    </button>
  );
}
