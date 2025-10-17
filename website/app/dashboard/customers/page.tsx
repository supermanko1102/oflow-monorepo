"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { mockCustomers, mockOrders } from "@/lib/mock-data";
import type { Customer, CustomerTag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DollarSign, Phone, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

const tagConfig: Record<CustomerTag, { label: string; color: string }> = {
  VIP: { label: "VIP", color: "bg-purple-100 text-purple-700" },
  returning: { label: "回頭客", color: "bg-blue-100 text-blue-700" },
  new: { label: "新客", color: "bg-green-100 text-green-700" },
  frequent: { label: "常客", color: "bg-orange-100 text-orange-700" },
};

const filterTags: { label: string; value: CustomerTag | "all" }[] = [
  { label: "全部", value: "all" },
  { label: "VIP", value: "VIP" },
  { label: "回頭客", value: "returning" },
  { label: "新客", value: "new" },
];

export default function CustomersPage() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [filter, setFilter] = useState<CustomerTag | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    const matchesFilter =
      filter === "all" || customer.tags.includes(filter as CustomerTag);
    const matchesSearch =
      searchQuery === "" ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSheetOpen(true);
  };

  const getCustomerOrders = (customerId: string) => {
    return mockOrders
      .filter((order) => order.customerId === customerId)
      .slice(0, 5);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <div className="space-y-4 p-4">
      {/* 頂部標題 */}
      <h1 className="text-2xl font-bold text-neutral-900">顧客管理</h1>

      {/* 搜尋列 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="搜尋顧客姓名或電話"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-10"
        />
      </div>

      {/* 標籤篩選 */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {filterTags.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                filter === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* 顧客列表 */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-neutral-500">沒有找到顧客</p>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 transition-all hover:shadow-md active:scale-[0.98]"
              onClick={() => handleCustomerClick(customer)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900">
                      {customer.name}
                    </p>
                    {customer.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className={cn("text-xs", tagConfig[tag].color)}
                        variant="secondary"
                      >
                        {tagConfig[tag].label}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {customer.totalOrders} 筆訂單
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />$
                      {customer.totalSpent?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 顧客詳情 Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>顧客詳情</SheetTitle>
          </SheetHeader>

          {selectedCustomer && (
            <ScrollArea className="h-[calc(90vh-80px)] pr-4">
              <div className="space-y-6 py-4">
                {/* 顧客頭像與基本資訊 */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-blue-100 text-xl text-blue-700">
                      {getInitials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {selectedCustomer.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className={cn("text-xs", tagConfig[tag].color)}
                          variant="secondary"
                        >
                          {tagConfig[tag].label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 聯絡資訊 */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-900">聯絡資訊</h4>
                  <div className="space-y-2 rounded-lg bg-neutral-50 p-4">
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-neutral-600" />
                        <span className="text-sm text-neutral-900">
                          {selectedCustomer.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">最後互動</span>
                      <span className="text-neutral-900">
                        {new Date(
                          selectedCustomer.lastSeenAt
                        ).toLocaleDateString("zh-TW", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 消費統計 */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-900">消費統計</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-neutral-600">總訂單數</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedCustomer.totalOrders}
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4">
                      <p className="text-sm text-neutral-600">總消費</p>
                      <p className="text-2xl font-bold text-purple-600">
                        ${selectedCustomer.totalSpent?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 最近訂單 */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-neutral-900">
                    最近訂單（5筆）
                  </h4>
                  <div className="space-y-2">
                    {getCustomerOrders(selectedCustomer.id).map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg bg-neutral-50 p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-neutral-900">
                              {order.items.map((item) => item.name).join("、")}
                            </p>
                            <p className="text-xs text-neutral-600">
                              {new Date(order.createdAt).toLocaleDateString(
                                "zh-TW",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-neutral-900">
                            ${order.total}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="space-y-2 pt-4">
                  <Button className="h-12 w-full">撥打電話</Button>
                  <Button variant="outline" className="h-12 w-full">
                    發送訊息
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    關閉
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
