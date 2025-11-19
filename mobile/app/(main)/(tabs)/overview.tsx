import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { logout } from "@/services/auth";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  primary?: boolean;
};

function MetricCard({
  label,
  value,
  icon,
  trend,
  trendType = "neutral",
  primary,
}: MetricCardProps) {
  return (
    <View
      className={`rounded-2xl p-4 mr-3 w-40 ${primary ? "bg-brand-teal" : "bg-white border border-gray-100"
        }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View
          className={`p-1.5 rounded-full ${primary ? "bg-white/20" : "bg-gray-100"
            }`}
        >
          {icon}
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Ionicons
              name={trendType === "up" ? "arrow-up" : "arrow-down"}
              size={12}
              color={primary ? "white" : trendType === "up" ? "#22C55E" : "#EF4444"}
            />
            <Text
              className={`text-xs ml-0.5 ${primary
                ? "text-white"
                : trendType === "up"
                  ? "text-status-success"
                  : "text-status-danger"
                }`}
            >
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text
        className={`text-2xl font-bold mb-1 ${primary ? "text-white" : "text-brand-slate"
          }`}
      >
        {value}
      </Text>
      <Text className={`text-xs ${primary ? "text-white/80" : "text-gray-500"}`}>
        {label}
      </Text>
    </View>
  );
}

type OperationMode = "auto" | "semi";

export default function Overview() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mode, setMode] = useState<OperationMode>("auto");

  // Mock Data
  const todayMetrics = {
    revenue: "$12,580",
    orders: 18,
    pending: 5,
  };

  const reminders = [
    {
      id: "r1",
      title: "明天有 3 筆訂單需備貨",
      time: "10:00 AM",
      type: "alert",
    },
    {
      id: "r2",
      title: "王小姐的生日蛋糕需確認口味",
      time: "14:30 PM",
      type: "warning",
    },
  ];

  const activities = [
    {
      id: "a1",
      content: "AI 剛自動建立了 1 筆訂單",
      time: "5 分鐘前",
      type: "auto",
    },
    {
      id: "a2",
      content: "陳先生 完成了付款",
      time: "15 分鐘前",
      type: "success",
    },
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

  const today = new Date().toLocaleDateString("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <MainLayout
      title="Hi, 店主 Alex"
      subtitle={`今日 ${todayMetrics.orders} 筆訂單 · ${today}`}
      teamName="甜點工作室 A"
      teamStatus="open"
      showActions={false} // Custom actions via rightContent
      rightContent={
        <View className="flex-row items-center gap-3">
          <IconButton
            icon="notifications-outline"
            ariaLabel="提醒"
            onPress={() => console.log("notifications")}
            isDark={false}
          />
        </View>
      }
      onNotificationsPress={() => console.log("notifications")}
    >
      {/* AI Mode Switcher */}
      <View className="mb-6 bg-gray-100 p-1 rounded-full flex-row">
        <TouchableOpacity
          onPress={() => setMode("auto")}
          className={`flex-1 py-3 px-4 rounded-full flex-row items-center justify-center space-x-2 ${mode === "auto" ? "bg-white " : ""
            }`}
        >
          <MaterialCommunityIcons
            name="robot"
            size={20}
            color={mode === "auto" ? "#008080" : "#9CA3AF"}
          />
          <View>
            <Text
              className={`text-sm font-bold ${mode === "auto" ? "text-brand-teal" : "text-gray-500"
                }`}
            >
              全自動
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("semi")}
          className={`flex-1 py-3 px-4 rounded-full flex-row items-center justify-center space-x-2 ${mode === "semi" ? "bg-white " : ""
            }`}
        >
          <MaterialCommunityIcons
            name="file-document-edit"
            size={20}
            color={mode === "semi" ? "#5A6B7C" : "#9CA3AF"}
          />
          <View>
            <Text
              className={`text-sm font-bold ${mode === "semi" ? "text-brand-slate" : "text-gray-500"
                }`}
            >
              半自動
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Mode Description */}
      <View className="mb-6 px-2">
        <Text className="text-center text-gray-500 text-sm">
          {mode === "auto"
            ? "✨ AI 將自動回覆訊息並建立訂單"
            : "📝 AI 生成草稿，需您確認後發送"}
        </Text>
      </View>

      {/* Metrics Carousel */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4 px-1">
          <Text className="text-lg font-bold text-brand-slate">今日概況</Text>
          <Text className="text-xs text-gray-400">Updated just now</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-6 px-6"
        >
          <MetricCard
            label="今日營收"
            value={todayMetrics.revenue}
            icon={<Ionicons name="cash" size={20} color="white" />}
            trend="+12%"
            trendType="up"
            primary
          />
          <MetricCard
            label="今日訂單"
            value={todayMetrics.orders}
            icon={
              <Ionicons name="receipt" size={20} color="rgb(90, 107, 124)" />
            }
            trend="+5"
            trendType="up"
          />
          <MetricCard
            label="待處理訊息"
            value={todayMetrics.pending}
            icon={
              <MaterialCommunityIcons
                name="message-processing"
                size={20}
                color="rgb(249, 115, 22)"
              />
            }
            trend="需關注"
            trendType="down"
          />
        </ScrollView>
      </View>

      {/* Timeline / Feed */}
      <View className="mb-8">
        <Text className="text-lg font-bold text-brand-slate mb-4 px-1">
          待辦與動態
        </Text>

        {/* Reminders */}
        <View className="space-y-3 mb-6">
          {reminders.map((item) => (
            <View
              key={item.id}
              className="bg-white p-4 rounded-xl border-l-4 border-l-brand-teal flex-row items-center"
            >
              <View className="bg-teal-50 p-2 rounded-full mr-3">
                <Ionicons name="notifications" size={20} color="#008080" />
              </View>
              <View className="flex-1">
                <Text className="text-brand-slate font-semibold text-sm mb-1">
                  {item.title}
                </Text>
                <Text className="text-gray-400 text-xs">{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Activities */}
        <View className="space-y-4">
          <Text className="text-sm font-semibold text-gray-500 px-1">最新動態</Text>
          {activities.map((item) => (
            <View key={item.id} className="flex-row items-start px-1">
              <View className="mt-1 w-2 h-2 rounded-full bg-brand-teal mr-3" />
              <View className="flex-1">
                <Text className="text-gray-800 text-sm mb-0.5">{item.content}</Text>
                <Text className="text-gray-400 text-xs">{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Logout */}
      <View className="mt-4 mb-8">
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-12 bg-gray-100 rounded-xl items-center justify-center active:bg-gray-200"
          style={{ opacity: isLoggingOut ? 0.6 : 1 }}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#666" />
          ) : (
            <Text className="text-gray-600 font-semibold">登出</Text>
          )}
        </Pressable>
      </View>
    </MainLayout>
  );
}
