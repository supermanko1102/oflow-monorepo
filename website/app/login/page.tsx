"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 直接導向 Dashboard（無驗證）
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo 與標題 */}
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white shadow-lg">
              O
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            OFlow
          </h1>
          <p className="mt-2 text-sm text-neutral-600">智慧訂單中心</p>
        </div>

        {/* 登入表單 */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-neutral-700"
              >
                電子郵件
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-neutral-700"
              >
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full text-base font-medium"
            size="lg"
          >
            登入
          </Button>
        </form>

        {/* 額外連結 */}
        <div className="text-center text-sm text-neutral-600">
          <button type="button" className="hover:text-neutral-900">
            忘記密碼？
          </button>
        </div>
      </div>

      {/* 版本資訊 */}
      <div className="absolute bottom-4 text-xs text-neutral-400">v1.0.0</div>
    </div>
  );
}
