"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
        toast.error(signInError.message);
        return;
      }

      toast.success("登入成功，正在進入控制台");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登入失敗，請稍後再試";
      setError("root", { message });
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              登入 OFlow 後台
            </CardTitle>
            <CardDescription>使用客服/營運帳號登入控制台。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ops@oflow.io"
                  {...register("email", { required: "請輸入 Email" })}
                  required
                />
                {errors.email ? (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="password">密碼</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password", { required: "請輸入密碼" })}
                  required
                />
                {errors.password ? (
                  <p className="text-sm text-red-600">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {errors.root?.message ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errors.root.message}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "登入中..." : "登入"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
