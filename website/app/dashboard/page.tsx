"use client";

import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import data from "./data.json";

function DashboardPage() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session;
    },
  });

  useEffect(() => {
    if (sessionQuery.isError) {
      toast.error("無法取得登入資訊，請重新登入");
    }
  }, [sessionQuery.isError]);

  if (sessionQuery.isPending) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-sm text-muted-foreground">
        載入中...
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-sm text-muted-foreground">
        無法取得登入資訊：{sessionQuery.error.message}
      </div>
    );
  }

  const user = sessionQuery.data?.user;
  const userName = user?.user_metadata?.name ?? user?.email ?? "客服成員";
  const userEmail = user?.email ?? "";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{ name: userName, email: userEmail, avatar }}
      />
      <SidebarInset>
        <SiteHeader
          title="客服控制台"
          subtitle={userEmail ? `登入：${userEmail}` : "已連線"}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6"></div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardPage;
