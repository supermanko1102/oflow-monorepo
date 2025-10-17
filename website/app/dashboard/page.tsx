"use client";

import { AlertBanner } from "@/components/alert-banner";
import { QuickTodoList } from "@/components/quick-todo-list";
import { TodayOrdersPreview } from "@/components/today-orders-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  mockDashboardStats,
  mockOrders,
  mockRevenueData,
  mockTodoItems,
} from "@/lib/mock-data";
import type { OrderStatus, TodoItem } from "@/lib/types";
import {
  AlertCircle,
  BarChart3,
  Plus,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const [todos, setTodos] = useState(mockTodoItems);
  const [orders, setOrders] = useState(mockOrders);
  const stats = mockDashboardStats;

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleTodoClick = (todo: TodoItem) => {
    if (todo.orderId) {
      router.push(`/dashboard/orders`);
    }
  };

  const handleOrderUpdate = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    // Toast 會在 TodayOrdersPreview 組件中處理
  };

  return (
    <div className="space-y-6 p-4">
      {/* 緊急通知橫幅 */}
      <AlertBanner pendingCount={stats.pendingOrders} />

      {/* 頂部問候 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">早安，店長 👋</h1>
        <p className="text-sm text-neutral-600">
          {new Date().toLocaleDateString("zh-TW", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      {/* 關鍵指標卡片 - 2x2 網格 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 今日營收 */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">今日營收</span>
              {stats.revenueChange > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-neutral-900">
                ${stats.todayRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500">
                較昨日 {stats.revenueChange > 0 ? "+" : ""}
                {stats.revenueChange}%
              </p>
            </div>
          </div>
        </Card>

        {/* 今日訂單 */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">今日訂單</span>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-neutral-900">
                {stats.todayOrders}
              </p>
              <p className="text-xs text-neutral-500">
                較昨日 +{stats.ordersChange}%
              </p>
            </div>
          </div>
        </Card>

        {/* 待處理訂單 - 橙色強調 */}
        <Card className="border-2 border-orange-200 bg-orange-50 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">
                待處理
              </span>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-600">
                {stats.pendingOrders}
              </p>
              <p className="text-xs text-orange-600">筆訂單待確認</p>
            </div>
          </div>
        </Card>

        {/* 回購率 */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">本週回購</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-neutral-900">
                {stats.weeklyReturnRate}%
              </p>
              <p className="text-xs text-neutral-500">較上週 +3%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 營收趨勢圖 */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">7 日營收趨勢</h2>
            <Badge variant="secondary" className="text-xs">
              本週
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={mockRevenueData}>
              <XAxis
                dataKey="date"
                stroke="#a3a3a3"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 今日必做事項 - 使用新組件 */}
      <QuickTodoList
        todos={todos}
        onToggle={toggleTodo}
        onItemClick={handleTodoClick}
      />

      {/* 今日訂單快覽 */}
      <div className="space-y-3">
        <h2 className="font-semibold text-neutral-900">今日訂單</h2>
        <TodayOrdersPreview orders={orders} onOrderUpdate={handleOrderUpdate} />
      </div>

      {/* 快速操作按鈕 */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 w-full" onClick={() => {}}>
          <Plus className="mr-2 h-4 w-4" />
          新增訂單
        </Button>
        <Button variant="outline" className="h-12 w-full" onClick={() => {}}>
          <BarChart3 className="mr-2 h-4 w-4" />
          查看報表
        </Button>
      </div>
    </div>
  );
}
