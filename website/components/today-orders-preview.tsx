"use client";

import { SuborderTimeline } from "@/components/suborder-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Order, OrderStatus } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface TodayOrdersPreviewProps {
  orders: Order[];
  onOrderUpdate?: (orderId: string, newStatus: OrderStatus) => void;
}

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

export function TodayOrdersPreview({
  orders,
  onOrderUpdate,
}: TodayOrdersPreviewProps) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 取得今日訂單（最新 5 筆）
  const todayOrders = orders.slice(0, 5);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleViewAll = () => {
    router.push("/dashboard/orders");
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    onOrderUpdate?.(orderId, newStatus);
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

  if (todayOrders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-neutral-500">今日尚無訂單</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* 訂單列表 */}
      {todayOrders.map((order) => (
        <Card
          key={order.id}
          className="p-3 transition-all hover:shadow-md active:scale-[0.98]"
          onClick={() => handleOrderClick(order)}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-neutral-900">
                  {order.customer?.name || "未知顧客"}
                </p>
                <Badge
                  variant={statusConfig[order.status].variant}
                  className="text-xs"
                >
                  {statusConfig[order.status].label}
                </Badge>
              </div>
              <p className="text-xs text-neutral-500">
                {new Date(order.createdAt).toLocaleTimeString("zh-TW", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-neutral-900">
                ${order.total}
              </p>
            </div>
          </div>
        </Card>
      ))}

      {/* 查看全部按鈕 */}
      <Button variant="outline" className="w-full" onClick={handleViewAll}>
        查看全部 {orders.length} 筆訂單
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>

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
                        handleStatusUpdate(selectedOrder.id, "paid")
                      }
                    >
                      標記為已付款
                    </Button>
                  )}
                  {selectedOrder.status === "paid" && (
                    <Button
                      className="h-12 w-full"
                      onClick={() =>
                        handleStatusUpdate(selectedOrder.id, "shipped")
                      }
                    >
                      標記為已出貨
                    </Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button
                      className="h-12 w-full"
                      onClick={() =>
                        handleStatusUpdate(selectedOrder.id, "completed")
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
