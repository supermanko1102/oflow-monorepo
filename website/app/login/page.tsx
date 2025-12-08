"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setError("root", { message: undefined });

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        setError("root", { message: signInError.message });
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError("root", {
        message: err?.message || "登入失敗，請稍後再試",
      });
    }
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
        <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
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
                {...register("email", {
                  required: "請輸入 Email",
                })}
                className="h-12 text-base"
                required
              />
              {errors.email ? (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              ) : null}
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
                {...register("password", {
                  required: "請輸入密碼",
                })}
                className="h-12 text-base"
                required
              />
              {errors.password ? (
                <p className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
          </div>

          {errors.root?.message ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.message}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full text-base font-medium"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "登入中..." : "登入"}
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
