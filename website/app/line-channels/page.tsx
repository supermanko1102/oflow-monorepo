"use client";

import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ChannelRow = {
  merchant: string;
  channelId: string;
  webhook: string;
  status: "健康" | "警告" | "失敗";
  lastCheck: string;
  owner: string;
};

const rows: ChannelRow[] = [
  {
    merchant: "青鳥咖啡",
    channelId: "2001234567",
    webhook: "https://api.oflow.ai/webhook/line/abc123",
    status: "健康",
    lastCheck: "2025-03-06 09:45",
    owner: "阿強",
  },
  {
    merchant: "星月甜點",
    channelId: "2005678890",
    webhook: "https://api.oflow.ai/webhook/line/xyz789",
    status: "警告",
    lastCheck: "2025-03-06 08:20",
    owner: "小芳",
  },
  {
    merchant: "光晟診所",
    channelId: "2011122233",
    webhook: "https://api.oflow.ai/webhook/line/clinic01",
    status: "失敗",
    lastCheck: "2025-03-05 23:10",
    owner: "Luna",
  },
  {
    merchant: "好好超市",
    channelId: "2009988777",
    webhook: "https://api.oflow.ai/webhook/line/retail01",
    status: "健康",
    lastCheck: "2025-03-06 09:10",
    owner: "Max",
  },
];

function statusTone(status: ChannelRow["status"]) {
  const tone: Record<ChannelRow["status"], string> = {
    健康: "bg-emerald-100 text-emerald-800 border-emerald-200",
    警告: "bg-amber-100 text-amber-800 border-amber-200",
    失敗: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return tone[status];
}

export default function LineChannelsPage() {
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

  const user = sessionQuery.data?.user;
  const userEmail = user?.email ?? "";

  const [selected, setSelected] = useState<ChannelRow | null>(null);

  const summary = useMemo(() => {
    const total = rows.length;
    const healthy = rows.filter((r) => r.status === "健康").length;
    const warning = rows.filter((r) => r.status === "警告").length;
    const fail = rows.filter((r) => r.status === "失敗").length;
    return { total, healthy, warning, fail };
  }, []);

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
        user={{
          name: user?.user_metadata?.name ?? user?.email ?? "客服成員",
          email: userEmail,
          avatar: (user?.user_metadata?.avatar_url as string | undefined) ?? "",
        }}
      />
      <SidebarInset>
        <SiteHeader
          title="LINE Channel 管理"
          subtitle="多商家綁定、健康檢查、重綁與審計"
        />

        <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>商家總數</CardDescription>
                <CardTitle>{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Webhook 健康</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {summary.healthy}
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    健康
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>需注意</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {summary.warning + summary.fail}
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    警告/失敗
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Channel 列表</CardTitle>
                <CardDescription>查看綁定狀態，支援重綁與健康檢查</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => toast.info("假按鈕：匯入或新增商家綁定")}
              >
                新增綁定
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商家</TableHead>
                    <TableHead>Channel ID</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>最後檢查</TableHead>
                    <TableHead>負責人</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.merchant}>
                      <TableCell className="font-medium">{row.merchant}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.channelId}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">
                        {row.webhook}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusTone(row.status)} px-2 py-0.5 text-xs`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.lastCheck}
                      </TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Drawer
                            onOpenChange={(open) => {
                              if (!open) {
                                setSelected(null);
                              }
                            }}
                          >
                            <DrawerTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected(row)}
                              >
                                查看 / 重綁
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>{selected?.merchant ?? row.merchant}</DrawerTitle>
                                <DrawerDescription>
                                  檢查簽章、重送測試、或綁定新 Channel。
                                </DrawerDescription>
                              </DrawerHeader>
                              <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
                                <div className="space-y-2 rounded-lg border p-3">
                                  <p className="text-sm text-muted-foreground">當前綁定</p>
                                  <p className="font-mono text-sm">
                                    {selected?.channelId ?? row.channelId}
                                  </p>
                                  <p className="font-mono text-xs break-all text-muted-foreground">
                                    {selected?.webhook ?? row.webhook}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toast.info("假按鈕：重送測試訊息")}
                                    >
                                      重送測試
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toast.info("假按鈕：重新驗證簽章")}
                                    >
                                      驗證簽章
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="newChannelId">新 Channel ID</Label>
                                    <Input id="newChannelId" placeholder="輸入 Channel ID" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="newSecret">Channel Secret</Label>
                                    <Input id="newSecret" placeholder="輸入 Channel Secret" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="newToken">Access Token</Label>
                                    <Input id="newToken" placeholder="輸入 Access Token" />
                                  </div>
                                  <Button
                                    className="w-full"
                                    onClick={() =>
                                      toast.info("假表單：驗證並綁定新 Channel")
                                    }
                                  >
                                    驗證並綁定
                                  </Button>
                                  <p className="text-xs text-muted-foreground">
                                    變更後會立即更新 webhook 並寫入審計，僅管理員可執行。
                                  </p>
                                </div>
                              </div>
                              <DrawerFooter className="flex flex-row items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  最後檢查：{row.lastCheck} · 負責人：{row.owner}
                                </div>
                                <DrawerClose asChild>
                                  <Button variant="outline">關閉</Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info("假按鈕：立即健康檢查")}
                          >
                            健康檢查
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
