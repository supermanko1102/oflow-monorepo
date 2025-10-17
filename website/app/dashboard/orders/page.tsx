"use client";

import { EmptyState } from "@/components/empty-state";
import { SuborderTimeline } from "@/components/suborder-timeline";
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
import { mockOrders } from "@/lib/mock-data";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search, ShoppingBag, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  pending: { label: "待付款", variant: "outline", color: "text-orange-600" },
  paid: { label: "已付款", variant: "default", color: "text-blue-600" },
  shipped: { label: "已出貨", variant: "secondary", color: "text-purple-600" },
  completed: { label: "已完成", variant: "secondary", color: "text-green-600" },
  cancelled: { label: "已取消", variant: "destructive", color: "text-red-600" },
};

const filterOptions: { label: string; value: OrderStatus | "all" }[] = [
  { label: "全部", value: "all" },
  { label: "待付款", value: "pending" },
  { label: "已付款", value: "paid" },
  { label: "已出貨", value: "shipped" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
];

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 處理 URL 參數篩選
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (
      filterParam &&
      (filterParam === "all" ||
        filterParam === "pending" ||
        filterParam === "paid" ||
        filterParam === "shipped" ||
        filterParam === "completed" ||
        filterParam === "cancelled")
    ) {
      setFilter(filterParam as OrderStatus | "all");
    }
  }, [searchParams]);

  // 篩選 + 搜尋
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === "all" || order.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }

    // Toast 通知
    const statusLabels = {
      paid: "已付款",
      shipped: "已出貨",
      completed: "已完成",
      pending: "待付款",
      cancelled: "已取消",
    };
    toast.success(`訂單狀態已更新為「${statusLabels[newStatus]}」`);
  };

  return (
    <div className="space-y-4 p-4">
      {/* 頂部標題 */}
      <h1 className="text-2xl font-bold text-neutral-900">訂單管理</h1>

      {/* 搜尋列 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="搜尋顧客名稱或訂單編號..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 狀態篩選 Chips */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {filterOptions.map((option) => (
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

      {/* 訂單列表 */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={Search}
              title="找不到訂單"
              description={`沒有符合「${searchQuery}」的訂單，試試其他關鍵字吧`}
              action={{
                label: "清除搜尋",
                onClick: () => setSearchQuery(""),
              }}
            />
          ) : (
            <EmptyState
              icon={ShoppingBag}
              title="還沒有訂單"
              description="當顧客下單後，訂單會顯示在這裡"
            />
          )
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="p-4 transition-all hover:shadow-md active:scale-[0.98]"
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900">
                      {order.customer?.name || "未知顧客"}
                    </p>
                    <Badge
                      variant={statusConfig[order.status].variant}
                      className="text-xs"
                    >
                      {statusConfig[order.status].label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-neutral-600">
                      {order.items.map((item) => item.name).join("、")}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(order.createdAt).toLocaleDateString("zh-TW", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-neutral-900">
                    ${order.total}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 訂單詳情 Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>訂單詳情</SheetTitle>
          </SheetHeader>

          {selectedOrder && (
            <ScrollArea className="h-[calc(90vh-80px)] pr-4">
              <div className="space-y-6 py-4">
                {/* 訂單狀態 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">訂單狀態</span>
                  <Badge
                    variant={statusConfig[selectedOrder.status].variant}
                    className="text-sm"
                  >
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </div>

                <Separator />

                {/* 顧客資訊 */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-neutral-900">顧客資訊</h3>
                  <div className="space-y-2 rounded-lg bg-neutral-50 p-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">姓名</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {selectedOrder.customer?.name}
                      </span>
                    </div>
                    {selectedOrder.customer?.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">電話</span>
                        <span className="text-sm font-medium text-neutral-900">
                          {selectedOrder.customer.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">取貨方式</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {selectedOrder.deliveryMethod === "pickup"
                          ? "自取"
                          : selectedOrder.deliveryMethod === "delivery"
                          ? "外送"
                          : "到店服務"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 訂單明細 */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-neutral-900">訂單明細</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-neutral-50 p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-neutral-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-neutral-600">
                            ${item.unitPrice} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-neutral-900">
                          ${item.unitPrice * item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                    <span className="font-semibold text-neutral-900">總計</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${selectedOrder.total}
                    </span>
                  </div>
                </div>

                {/* 分段取貨時間軸 */}
                {selectedOrder.suborders &&
                  selectedOrder.suborders.length > 0 && (
                    <>
                      <Separator />
                      <SuborderTimeline suborders={selectedOrder.suborders} />
                    </>
                  )}

                {/* 備註 */}
                {selectedOrder.notes && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-neutral-900">備註</h3>
                      <p className="text-sm text-neutral-600">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* 操作按鈕 */}
                <div className="space-y-2 pt-4">
                  {selectedOrder.status === "pending" && (
                    <Button
                      className="h-12 w-full"
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, "paid")
                      }
                    >
                      標記為已付款
                    </Button>
                  )}
                  {selectedOrder.status === "paid" && (
                    <Button
                      className="h-12 w-full"
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, "shipped")
                      }
                    >
                      標記為已出貨
                    </Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button
                      className="h-12 w-full"
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, "completed")
                      }
                    >
                      標記為已完成
                    </Button>
                  )}
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-4">載入中...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
