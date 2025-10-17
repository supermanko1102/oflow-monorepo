"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { mockOrganization } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();

  // 組織資訊
  const [orgName, setOrgName] = useState(mockOrganization.name);
  const [businessType, setBusinessType] = useState(
    mockOrganization.businessType
  );

  // 商品預設設定
  const [defaultTemperature, setDefaultTemperature] = useState("冷藏");
  const [autoActive, setAutoActive] = useState(true);

  // 通知偏好
  const [orderNotification, setOrderNotification] = useState(true);
  const [paymentNotification, setPaymentNotification] = useState(true);
  const [reminderNotification, setReminderNotification] = useState(true);

  const handleSave = () => {
    // 模擬儲存
    toast.success("設定已儲存");
  };

  return (
    <div className="space-y-6 p-4">
      {/* 頂部導航 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-neutral-900">系統設定</h1>
      </div>

      {/* 設定選項 */}
      <Accordion type="single" collapsible className="space-y-3">
        {/* 組織資訊 */}
        <AccordionItem
          value="organization"
          className="rounded-lg border bg-white px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="text-left">
              <p className="font-semibold text-neutral-900">組織資訊</p>
              <p className="text-sm text-neutral-500">管理您的店家基本資料</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">店家名稱</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="輸入店家名稱"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">業態類型</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bakery">烘焙坊</SelectItem>
                  <SelectItem value="dessert">甜點店</SelectItem>
                  <SelectItem value="beauty">美業</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">聯絡電話</Label>
              <Input id="phone" type="tel" placeholder="02-1234-5678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">店家地址</Label>
              <Input id="address" placeholder="輸入完整地址" />
            </div>

            <Button className="w-full" onClick={handleSave}>
              儲存變更
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* 商品預設設定 */}
        <AccordionItem
          value="product"
          className="rounded-lg border bg-white px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="text-left">
              <p className="font-semibold text-neutral-900">商品預設設定</p>
              <p className="text-sm text-neutral-500">設定新商品的預設選項</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="defaultTemp">預設溫層</Label>
              <Select
                value={defaultTemperature}
                onValueChange={setDefaultTemperature}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="冷藏">冷藏</SelectItem>
                  <SelectItem value="冷凍">冷凍</SelectItem>
                  <SelectItem value="常溫">常溫</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>新商品自動啟用</Label>
                <p className="text-sm text-neutral-500">
                  新增商品後自動設為上架狀態
                </p>
              </div>
              <Switch checked={autoActive} onCheckedChange={setAutoActive} />
            </div>

            <Button className="w-full" onClick={handleSave}>
              儲存變更
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* 通知偏好 */}
        <AccordionItem
          value="notifications"
          className="rounded-lg border bg-white px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="text-left">
              <p className="font-semibold text-neutral-900">通知偏好</p>
              <p className="text-sm text-neutral-500">管理您接收的通知類型</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>新訂單通知</Label>
                <p className="text-sm text-neutral-500">收到新訂單時推送通知</p>
              </div>
              <Switch
                checked={orderNotification}
                onCheckedChange={setOrderNotification}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>付款確認通知</Label>
                <p className="text-sm text-neutral-500">顧客完成付款時通知</p>
              </div>
              <Switch
                checked={paymentNotification}
                onCheckedChange={setPaymentNotification}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>取貨提醒通知</Label>
                <p className="text-sm text-neutral-500">取貨前一天提醒</p>
              </div>
              <Switch
                checked={reminderNotification}
                onCheckedChange={setReminderNotification}
              />
            </div>

            <Button className="w-full" onClick={handleSave}>
              儲存變更
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* 帳號安全 */}
        <AccordionItem
          value="security"
          className="rounded-lg border bg-white px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="text-left">
              <p className="font-semibold text-neutral-900">帳號安全</p>
              <p className="text-sm text-neutral-500">管理密碼與安全設定</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">登入信箱</Label>
              <Input
                id="email"
                type="email"
                defaultValue="admin@oflow.com"
                disabled
                className="bg-neutral-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">目前密碼</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="輸入目前密碼"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="輸入新密碼"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次輸入新密碼"
              />
            </div>

            <Button className="w-full" onClick={handleSave}>
              更新密碼
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* 危險區域 */}
      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <div>
          <h3 className="font-semibold text-red-900">危險區域</h3>
          <p className="text-sm text-red-700">以下操作無法復原，請謹慎操作</p>
        </div>
        <Button variant="destructive" className="w-full">
          刪除帳號
        </Button>
      </div>
    </div>
  );
}
