"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockAnalyticsData,
  mockRevenueData,
  mockTopProducts,
} from "@/lib/mock-data";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

type TimeRange = "today" | "week" | "month";

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const customerData = [
    {
      name: "新客",
      value: mockAnalyticsData.customerStats.new,
      color: COLORS[4],
    },
    {
      name: "回頭客",
      value: mockAnalyticsData.customerStats.returning,
      color: COLORS[0],
    },
    {
      name: "VIP",
      value: mockAnalyticsData.customerStats.vip,
      color: COLORS[2],
    },
  ];

  // 模擬不同時間範圍的資料
  const getRevenueByTimeRange = () => {
    switch (timeRange) {
      case "today":
        return [
          { date: "09:00", revenue: 300 },
          { date: "12:00", revenue: 800 },
          { date: "15:00", revenue: 1200 },
          { date: "18:00", revenue: 1600 },
          { date: "21:00", revenue: 2100 },
        ];
      case "month":
        return [
          { date: "第1週", revenue: 18000 },
          { date: "第2週", revenue: 22000 },
          { date: "第3週", revenue: 25000 },
          { date: "第4週", revenue: 28000 },
        ];
      default:
        return mockRevenueData;
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* 頂部導航 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-neutral-900">報表中心</h1>
      </div>

      {/* 時間範圍選擇 */}
      <Tabs
        value={timeRange}
        onValueChange={(v) => setTimeRange(v as TimeRange)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">今日</TabsTrigger>
          <TabsTrigger value="week">本週</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 關鍵指標對比 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">本期營收</p>
            <p className="text-2xl font-bold text-neutral-900">$28,460</p>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+15.3%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">訂單數量</p>
            <p className="text-2xl font-bold text-neutral-900">87</p>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+8.7%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">平均客單價</p>
            <p className="text-2xl font-bold text-neutral-900">$327</p>
            <div className="flex items-center gap-1 text-sm text-red-600">
              <TrendingDown className="h-4 w-4" />
              <span>-2.1%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">完成率</p>
            <p className="text-2xl font-bold text-neutral-900">94%</p>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+3.2%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 營收趨勢圖 */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-neutral-900">營收趨勢</h2>
            <Badge variant="secondary">
              {timeRange === "today"
                ? "今日"
                : timeRange === "week"
                ? "本週"
                : "本月"}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={getRevenueByTimeRange()}>
              <XAxis
                dataKey="date"
                stroke="#a3a3a3"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#a3a3a3"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`$${value}`, "營收"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 熱銷商品 Top 5 */}
      <Card className="p-4">
        <div className="space-y-4">
          <h2 className="font-semibold text-neutral-900">熱銷商品 Top 5</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockTopProducts} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value, name) => [
                  name === "revenue" ? `$${value}` : value,
                  name === "revenue" ? "營收" : "銷量",
                ]}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 顧客分析 */}
      <Card className="p-4">
        <div className="space-y-4">
          <h2 className="font-semibold text-neutral-900">顧客分布</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={customerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {customerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {customerData.map((item) => (
              <div key={item.name} className="text-center">
                <div
                  className="mx-auto mb-1 h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-neutral-600">{item.name}</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* AI 洞察建議 */}
      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
              AI
            </div>
            <h3 className="font-semibold text-blue-900">智慧建議</h3>
          </div>
          <div className="space-y-2 text-sm text-blue-800">
            <p>📈 本週營收成長 15.3%，表現優異！</p>
            <p>⭐ 原味巴斯克蛋糕最受歡迎，建議增加產量</p>
            <p>👥 回頭客佔比 68%，客戶黏性良好</p>
            <p>💡 週五下午訂單量最高，建議提前備料</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
