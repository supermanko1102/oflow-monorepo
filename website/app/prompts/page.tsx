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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";

type Template = {
  name: string;
  category: string;
  version: string;
  status: "草稿" | "上線" | "停用";
  updatedAt: string;
  owner: string;
  appliedCount: number;
};

type MerchantPrompt = {
  merchant: string;
  template: string;
  version: string;
  overrides: number;
  status: "草稿" | "上線" | "A/B";
  lastTest: string;
};

const templates: Template[] = [
  {
    name: "甜點標準版",
    category: "bakery",
    version: "v3.2",
    status: "上線",
    updatedAt: "2025-03-05",
    owner: "阿強",
    appliedCount: 12,
  },
  {
    name: "診所諮詢",
    category: "clinic",
    version: "v1.4",
    status: "上線",
    updatedAt: "2025-02-28",
    owner: "Luna",
    appliedCount: 5,
  },
  {
    name: "零售客服",
    category: "retail",
    version: "v2.1",
    status: "草稿",
    updatedAt: "2025-03-06",
    owner: "小芳",
    appliedCount: 3,
  },
];

const merchantPrompts: MerchantPrompt[] = [
  {
    merchant: "青鳥咖啡",
    template: "甜點標準版",
    version: "v3.2",
    overrides: 3,
    status: "上線",
    lastTest: "2025-03-06 10:12",
  },
  {
    merchant: "星月甜點",
    template: "甜點標準版",
    version: "v3.1",
    overrides: 5,
    status: "A/B",
    lastTest: "2025-03-05 21:40",
  },
  {
    merchant: "光晟診所",
    template: "診所諮詢",
    version: "v1.4",
    overrides: 2,
    status: "草稿",
    lastTest: "2025-03-05 15:08",
  },
  {
    merchant: "好好超市",
    template: "零售客服",
    version: "v2.1",
    overrides: 1,
    status: "草稿",
    lastTest: "—",
  },
];

function statusBadge(status: Template["status"]) {
  const tone: Record<Template["status"], string> = {
    草稿: "bg-amber-100 text-amber-800 border-amber-200",
    上線: "bg-emerald-100 text-emerald-800 border-emerald-200",
    停用: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`${tone[status]} px-2 py-0.5 text-xs`}>
      {status}
    </Badge>
  );
}

function merchantStatusBadge(status: MerchantPrompt["status"]) {
  const tone: Record<MerchantPrompt["status"], string> = {
    草稿: "bg-amber-100 text-amber-800 border-amber-200",
    上線: "bg-emerald-100 text-emerald-800 border-emerald-200",
    "A/B": "bg-sky-100 text-sky-800 border-sky-200",
  };
  return (
    <Badge variant="outline" className={`${tone[status]} px-2 py-0.5 text-xs`}>
      {status}
    </Badge>
  );
}

export default function PromptCenterPage() {
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
          title="Prompt 中心"
          subtitle="管理類別模板與商家覆寫，快速發布與回滾"
        />

        <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>類別模板</CardTitle>
                  <CardDescription>甜點 / 診所 / 零售 的預設版</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => toast.info("假按鈕：新增模板")}
                  >
                    新增模板
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>類別</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>套用商家</TableHead>
                      <TableHead>更新</TableHead>
                      <TableHead>負責人</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((tpl) => (
                      <TableRow key={tpl.name + tpl.version}>
                        <TableCell className="font-medium">
                          {tpl.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-xs"
                          >
                            {tpl.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{tpl.version}</TableCell>
                        <TableCell>{statusBadge(tpl.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tpl.appliedCount} 家
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tpl.updatedAt}
                        </TableCell>
                        <TableCell>{tpl.owner}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info("假按鈕：預覽模板")}
                            >
                              預覽
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toast.info("假按鈕：設為預設/發布")
                              }
                            >
                              設為預設
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1">
                <CardTitle>快速測試</CardTitle>
                <CardDescription>選商家與版本，模擬 LINE 對話</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="testMerchant">商家</Label>
                    <Select defaultValue="青鳥咖啡">
                      <SelectTrigger id="testMerchant">
                        <SelectValue placeholder="選商家" />
                      </SelectTrigger>
                      <SelectContent>
                        {merchantPrompts.map((mp) => (
                          <SelectItem key={mp.merchant} value={mp.merchant}>
                            {mp.merchant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testVersion">模板版本</Label>
                    <Select defaultValue="v3.2">
                      <SelectTrigger id="testVersion">
                        <SelectValue placeholder="選版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.version} value={tpl.version}>
                            {tpl.name} {tpl.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testInput">測試訊息</Label>
                    <textarea
                      id="testInput"
                      className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="輸入一段 LINE 測試訊息"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => toast.info("假按鈕：送出測試")}
                  >
                    送出測試
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>商家版本</CardTitle>
                <CardDescription>每個商家對應的模板與覆寫</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => toast.info("假按鈕：將模板套用到商家")}
              >
                套用到商家
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Tabs defaultValue="outline">
                <TabsList>
                  <TabsTrigger value="outline">全部</TabsTrigger>
                  <TabsTrigger value="ab">A/B</TabsTrigger>
                  <TabsTrigger value="draft">草稿</TabsTrigger>
                </TabsList>
                <TabsContent value="outline">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商家</TableHead>
                        <TableHead>模板</TableHead>
                        <TableHead>版本</TableHead>
                        <TableHead>覆寫</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>最後測試</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantPrompts.map((mp) => (
                        <TableRow key={mp.merchant + mp.version}>
                          <TableCell className="font-medium">
                            {mp.merchant}
                          </TableCell>
                          <TableCell>{mp.template}</TableCell>
                          <TableCell>{mp.version}</TableCell>
                          <TableCell>{mp.overrides} 項</TableCell>
                          <TableCell>
                            {merchantStatusBadge(mp.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mp.lastTest}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast.info("假按鈕：編輯覆寫")}
                              >
                                編輯
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info("假按鈕：發布/回滾")}
                              >
                                發布 / 回滾
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="ab">
                  <p className="text-sm text-muted-foreground px-2 py-4">
                    篩選 A/B 版本的商家（此處為假資料，可依狀態過濾）。
                  </p>
                </TabsContent>
                <TabsContent value="draft">
                  <p className="text-sm text-muted-foreground px-2 py-4">
                    篩選草稿狀態的商家（此處為假資料，可依狀態過濾）。
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
