"use client";

import type React from "react";
import { useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type MerchantRow = {
  name: string;
  category: string;
  status: "待取得" | "待驗證" | "已綁定" | "失敗";
  lineId: string;
  webhookStatus: "健康" | "警告" | "失敗" | "未設定";
  lastCheck: string;
};

const categoryOptions = [
  { value: "bakery", label: "甜點 / 烘焙" },
  { value: "retail", label: "零售 / 雜貨" },
  { value: "clinic", label: "診所 / 醫療" },
  { value: "beauty", label: "美容 / 美甲" },
  { value: "massage", label: "按摩 / SPA" },
  { value: "flower", label: "花店" },
  { value: "pet", label: "寵物" },
  { value: "other", label: "其他" },
];

function categoryLabel(value: string) {
  return categoryOptions.find((o) => o.value === value)?.label ?? value;
}

const merchants: MerchantRow[] = [
  {
    name: "青鳥咖啡",
    category: "bakery",
    status: "已綁定",
    lineId: "2001234567",
    webhookStatus: "健康",
    lastCheck: "2025-03-06 09:45",
  },
  {
    name: "星月甜點",
    category: "bakery",
    status: "待驗證",
    lineId: "2005678890",
    webhookStatus: "警告",
    lastCheck: "2025-03-06 08:20",
  },
  {
    name: "光晟診所",
    category: "clinic",
    status: "失敗",
    lineId: "2011122233",
    webhookStatus: "失敗",
    lastCheck: "2025-03-05 23:10",
  },
  {
    name: "好好超市",
    category: "retail",
    status: "待取得",
    lineId: "—",
    webhookStatus: "警告",
    lastCheck: "—",
  },
];

function statusTone(status: MerchantRow["status"]) {
  const tone: Record<MerchantRow["status"], string> = {
    待取得: "bg-slate-100 text-slate-800 border-slate-200",
    待驗證: "bg-amber-100 text-amber-800 border-amber-200",
    已綁定: "bg-emerald-100 text-emerald-800 border-emerald-200",
    失敗: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return tone[status];
}

function webhookTone(status: MerchantRow["webhookStatus"]) {
  const tone: Record<MerchantRow["webhookStatus"], string> = {
    健康: "bg-emerald-100 text-emerald-800 border-emerald-200",
    警告: "bg-amber-100 text-amber-800 border-amber-200",
    失敗: "bg-rose-100 text-rose-800 border-rose-200",
    未設定: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return tone[status];
}

export default function ImportPage() {
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

  const summary = useMemo(() => {
    const total = merchants.length;
    const bound = merchants.filter((m) => m.status === "已綁定").length;
    const todo = merchants.filter((m) => m.status !== "已綁定").length;
    const failed = merchants.filter((m) => m.status === "失敗").length;
    return { total, bound, todo, failed };
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
          title="客戶匯入 / 上線板"
          subtitle="為商家收 Key、驗證、套模板，並發布到 LINE"
        />
        <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>商家總數</CardDescription>
                <CardTitle>{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>已綁定</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {summary.bound}
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    已綁定
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>待處理</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {summary.todo}
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    待驗證/待 Key
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>失敗 / 需復原</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  {summary.failed}
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                    失敗
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>商家列表</CardTitle>
                <CardDescription>依類別或狀態找到要上線的商家</CardDescription>
              </div>
              <div className="flex gap-2">
                <NewMerchantDrawer />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商家</TableHead>
                    <TableHead>類別</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>Channel ID</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>模板</TableHead>
                    <TableHead>最後檢查</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{categoryLabel(m.category)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusTone(
                            m.status
                          )} px-2 py-0.5 text-xs`}
                        >
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.lineId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${webhookTone(
                            m.webhookStatus
                          )} px-2 py-0.5 text-xs`}
                        >
                          {m.webhookStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        類別模板
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.lastCheck}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toast.info(
                                `假按鈕：驗證 ${m.name} 的簽章 / Webhook`
                              )
                            }
                          >
                            驗證 / 測試
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a href="/prompts">去 Prompt</a>
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

function NewMerchantDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm">新增商家</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>新增商家</DrawerTitle>
          <DrawerDescription>填寫基本資料與 LINE 三鍵</DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本資訊</CardTitle>
              <CardDescription>名稱、類別</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newName">商家名稱</Label>
                <Input id="newName" placeholder="例如：木木甜點" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategory">類別</Label>
                <Select defaultValue="bakery">
                  <SelectTrigger id="newCategory">
                    <SelectValue placeholder="選擇類別" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LINE 三鍵</CardTitle>
              <CardDescription>
                收集 Channel ID / Secret / Access Token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newChannelId">Channel ID</Label>
                <Input id="newChannelId" placeholder="輸入 Channel ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newChannelSecret">Channel Secret</Label>
                <Input
                  id="newChannelSecret"
                  placeholder="輸入 Channel Secret"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newAccessToken">Access Token</Label>
                <Input id="newAccessToken" placeholder="輸入 Access Token" />
              </div>
              <Button
                className="w-full"
                onClick={() => toast.info("假按鈕：檢查簽章與 webhook")}
              >
                驗證簽章 / Webhook 測試
              </Button>
              <p className="text-xs text-muted-foreground">
                驗證成功後即可帶入列表，並進入上線流程。
              </p>
            </CardContent>
          </Card>
        </div>
        <DrawerFooter className="flex flex-row items-center justify-between">
          <div className="text-xs text-muted-foreground">
            建議同時設定類別，後續可自動套用對應 Prompt 模板。
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                toast.success("假按鈕：已新增並送往上線流程");
                setOpen(false);
              }}
            >
              新增並開始上線
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
