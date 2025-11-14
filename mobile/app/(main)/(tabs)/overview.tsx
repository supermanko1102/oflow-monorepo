import { logout } from "@/services/auth";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "blue" | "green" | "orange" | "purple" | "gray";
  note?: string;
  emphasized?: boolean;
};

function MetricCard({ label, value, icon, accent = "gray", note, emphasized }: MetricCardProps) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600",
    purple: "text-purple-600",
    gray: "text-gray-600",
  };
  const borderMap: Record<string, string> = {
    orange: "border-2 border-orange-200 bg-orange-50",
    blue: "",
    green: "",
    purple: "",
    gray: "",
  };

  return (
    <View className={`rounded-xl p-4 bg-white ${borderMap[accent] || ""} shadow-sm`}>
      <View className="flex-row items-center justify-between">
        <Text className={`text-xs ${accent === "orange" ? "text-orange-700 font-medium" : "text-gray-600"}`}>
          {label}
        </Text>
        <View className={`${colorMap[accent]}`}>{icon}</View>
      </View>
      <View className="mt-2">
        <Text className={`font-bold ${emphasized ? "text-2xl" : "text-2xl"} ${accent === "orange" ? "text-orange-600" : "text-gray-900"}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </Text>
        {note ? (
          <Text className={`text-xs mt-1 ${accent === "orange" ? "text-orange-600" : "text-gray-500"}`}>{note}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function Overview() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Mock data for static preview
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
    []
  );

  const metrics = useMemo(
    () => ({
      todayRevenue: 12580,
      revenueChange: +12,
      todayOrders: 18,
      ordersChange: +8,
      pendingOrders: 5,
      weeklyReturnRate: 27,
    }),
    []
  );

  const reminders = [
    { id: "r1", type: "today", title: "14:00 取貨 - 陳小姐 巴斯克6吋", tag: "今日" },
    { id: "r2", type: "3day", title: "3 天後取貨 - 公司團購 12 入盒", tag: "3天" },
    { id: "r3", type: "draft", title: "AI 草稿待確認 - 王小姐 改17:00", tag: "待確認" },
  ];

  const todayOrders = [
    { id: "o1", time: "10:30", customer: "王小明", item: "巴斯克6吋x1", status: "pending" },
    { id: "o2", time: "14:00", customer: "陳小姐", item: "檸檬塔x2", status: "paid" },
    { id: "o3", time: "17:30", customer: "劉先生", item: "布朗尼x3", status: "completed" },
  ];

  const handleLogout = async () => {
    Alert.alert("確認登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch (error) {
            console.error("登出失敗:", error);
            Alert.alert("登出失敗", "無法完成登出，請稍後再試", [{ text: "確定" }]);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6 pb-8">
      {/* Header */}
      <View className="mb-5">
        <Text className="text-2xl font-extrabold text-gray-900">早安，店長 👋</Text>
        <Text className="text-xs text-gray-600 mt-1">{today}</Text>
      </View>

      {/* KPI Grid */}
      <View className="flex-row flex-wrap -mx-1">
        <View className="w-1/2 px-1 mb-2">
          <MetricCard
          label="今日營收"
          value={`$${metrics.todayRevenue.toLocaleString()}`}
          note={`較昨日 ${metrics.revenueChange > 0 ? "+" : ""}${metrics.revenueChange}%`}
          accent="blue"
          icon={<Ionicons name="trending-up" size={16} />}
          />
        </View>
        <View className="w-1/2 px-1 mb-2">
          <MetricCard
          label="今日訂單"
          value={metrics.todayOrders}
          note={`較昨日 +${metrics.ordersChange}%`}
          accent="green"
          icon={<Ionicons name="bag-handle" size={16} />}
          />
        </View>
        <View className="w-1/2 px-1 mb-2">
          <MetricCard
          label="待處理"
          value={metrics.pendingOrders}
          note="筆訂單待確認"
          accent="orange"
          emphasized
          icon={<Ionicons name="alert-circle" size={16} />}
          />
        </View>
        <View className="w-1/2 px-1 mb-2">
          <MetricCard
          label="本週回購"
          value={`${metrics.weeklyReturnRate}%`}
          accent="purple"
          icon={<Ionicons name="people" size={16} />}
          />
        </View>
      </View>

      {/* Reminders & Drafts */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-semibold text-gray-900">待辦/提醒</Text>
          <Text className="text-xs text-gray-500">共 {reminders.length} 項</Text>
        </View>
        <View className="space-y-2">
          {reminders.map((r) => (
            <View
              key={r.id}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                {r.type === "draft" ? (
                  <MaterialCommunityIcons name="inbox" size={18} color="#9333ea" />
                ) : (
                  <Ionicons name="alarm" size={18} color="#2563eb" />
                )}
                <Text className="text-sm text-gray-800" numberOfLines={1}>
                  {r.title}
                </Text>
              </View>
              <View className="rounded-full bg-gray-100 px-2 py-1">
                <Text className="text-[10px] text-gray-600">{r.tag}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Today Orders Preview */}
      <View className="mt-6">
        <Text className="font-semibold text-gray-900 mb-2">今日訂單</Text>
        <View className="space-y-2">
          {todayOrders.map((o) => (
            <View
              key={o.id}
              className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-gray-500">{o.time}</Text>
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {o.customer}
                  </Text>
                </View>
                <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                  {o.item}
                </Text>
              </View>
              <View
                className={`rounded-full px-2 py-1 ${
                  o.status === "completed"
                    ? "bg-green-100"
                    : o.status === "paid"
                    ? "bg-blue-100"
                    : "bg-orange-100"
                }`}
              >
                <Text
                  className={`text-[10px] ${
                    o.status === "completed"
                      ? "text-green-700"
                      : o.status === "paid"
                      ? "text-blue-700"
                      : "text-orange-700"
                  }`}
                >
                  {o.status === "completed"
                    ? "已完成"
                    : o.status === "paid"
                    ? "已付款"
                    : "待處理"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View className="mt-6 flex-row -mx-1">
        <Pressable className="h-12 rounded-lg border border-gray-200 items-center justify-center bg-white w-1/2 mx-1">
          <View className="flex-row items-center">
            <Ionicons name="add-circle-outline" size={16} color="#111827" />
            <Text className="ml-2 text-sm font-medium text-gray-900">新增訂單</Text>
          </View>
        </Pressable>
        <Pressable className="h-12 rounded-lg border border-gray-200 items-center justify-center bg-white w-1/2 mx-1">
          <View className="flex-row items-center">
            <Ionicons name="bar-chart" size={16} color="#111827" />
            <Text className="ml-2 text-sm font-medium text-gray-900">查看報表</Text>
          </View>
        </Pressable>
      </View>

      {/* Logout */}
      <View className="mt-8">
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-12 bg-red-500 rounded-lg items-center justify-center"
          style={{ opacity: isLoggingOut ? 0.6 : 1 }}
        >
          {isLoggingOut ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />
              <Text className="text-white font-semibold text-base ml-2">登出中...</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">登出</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
