import { MainLayout } from "@/components/layout/MainLayout";
import { logout } from "@/services/auth";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TouchableOpacity,
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

function MetricCard({
  label,
  value,
  icon,
  accent = "gray",
  note,
  emphasized,
}: MetricCardProps) {
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
    <View className={`rounded-xl p-4 bg-white ${borderMap[accent] || ""} `}>
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

type RevenueRange = "day" | "week" | "month" | "year";

const revenueRangeLabels: Record<RevenueRange, string> = {
  day: "昨日",
  week: "上週",
  month: "上月",
  year: "去年",
};

type OperationMode = "auto" | "semi";

export default function Overview() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>("day");
  const [mode, setMode] = useState<OperationMode>("auto");

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

  const revenueStats = useMemo(
    () => ({
      day: { amount: 12580, change: +12 },
      week: { amount: 86540, change: +8 },
      month: { amount: 345200, change: +5 },
      year: { amount: 4120000, change: +15 },
    }),
    []
  );

  const orderStats = useMemo(
    () => ({
      day: { count: 18, change: +8 },
      week: { count: 96, change: +12 },
      month: { count: 382, change: +6 },
      year: { count: 4210, change: +18 },
    }),
    []
  );

  const metrics = useMemo(
    () => ({
      pendingOrders: 5,
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

  const highlightOrders = todayOrders.slice(0, 2);

  const renderContent = () => (
    <>
    <View className="rounded-2xl border border-gray-100 bg-white p-4 ">
      <Text className="text-sm font-semibold text-gray-900 mb-3">
        營運模式
      </Text>
      <View className="flex-row bg-gray-100 rounded-full p-1">
        {([
          { key: "auto", label: "全自動", detail: "AI 自動回覆建單" },
          { key: "semi", label: "半自動", detail: "需商家確認" },
        ] as { key: OperationMode; label: string; detail: string }[]).map(
          (option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setMode(option.key)}
              className={`flex-1 px-3 py-2 rounded-full ${
                mode === option.key ? "bg-white " : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold text-center ${
                  mode === option.key ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {option.label}
              </Text>
              <Text
                className={`text-[11px] text-center ${
                  mode === option.key ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {option.detail}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
      <Text className="text-[11px] text-gray-500 mt-2">
        {mode === "auto"
          ? "AI 會自動處理對話並建立訂單，對話結果可在 Inbox 的自動紀錄查看。"
          : "AI 先整理草稿，待你或團隊在 Inbox 確認/補欄位後建單。"}
      </Text>
    </View>

    {/* Revenue & Orders Segments */}
    <View className="my-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-700">
          營收 / 訂單期間
        </Text>
        <View className="flex-row bg-gray-100 rounded-full p-1">
          {(["day", "week", "month", "year"] as RevenueRange[]).map(
            (range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setRevenueRange(range)}
                className={`px-3 py-1 rounded-full ${
                  revenueRange === range ? "bg-white shadow" : ""
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    revenueRange === range
                      ? "text-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  {range === "day"
                    ? "當日"
                    : range === "week"
                    ? "當週"
                    : range === "month"
                    ? "當月"
                    : "當年"}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
      <View className="flex-row -mx-1">
        <View className="w-1/2 px-1">
          <MetricCard
            label={`${
              revenueRange === "day"
                ? "今日"
                : revenueRange === "week"
                ? "本週"
                : revenueRange === "month"
                ? "本月"
                : "本年"
            }營收`}
            value={`$${revenueStats[revenueRange].amount.toLocaleString()}`}
            note={`較${revenueRangeLabels[revenueRange]} ${
              revenueStats[revenueRange].change > 0 ? "+" : ""
            }${revenueStats[revenueRange].change}%`}
            accent="blue"
            icon={<Ionicons name="trending-up" size={16} />}
          />
        </View>
        <View className="w-1/2 px-1">
          <MetricCard
            label={`${
              revenueRange === "day"
                ? "今日"
                : revenueRange === "week"
                ? "本週"
                : revenueRange === "month"
                ? "本月"
                : "本年"
            }訂單`}
            value={`${orderStats[revenueRange].count} 筆`}
            note={`較${revenueRangeLabels[revenueRange]} ${
              orderStats[revenueRange].change > 0 ? "+" : ""
            }${orderStats[revenueRange].change}%`}
            accent="green"
            icon={<Ionicons name="bag-handle" size={16} />}
          />
        </View>
      </View>
    </View>

    {/* KPI Grid */}
    <View className="flex-row flex-wrap -mx-1">
      <View className="w-full px-1 mb-2">
        <MetricCard
          label="待處理訂單"
          value={metrics.pendingOrders}
          note="筆待確認"
          accent="orange"
          emphasized
          icon={<Ionicons name="alert-circle" size={16} />}
        />
      </View>
    
    </View>

    {/* Reminders */}
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-semibold text-gray-900">待辦與提醒</Text>
        <Text className="text-xs text-gray-500">
          共 {reminders.length} 項
        </Text>
      </View>
      <View className="space-y-2">
        {reminders.map((r) => (
          <View
            key={r.id}
            className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white p-3 "
          >
            <View className="flex-row items-center gap-3">
              {r.type === "draft" ? (
                <MaterialCommunityIcons
                  name="inbox"
                  size={18}
                  color="#9333ea"
                />
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

    {/* Highlight Orders */}
    <View className="mt-6">
      <Text className="font-semibold text-gray-900 mb-2">最新訂單</Text>
      <View className="space-y-2">
        {highlightOrders.map((o) => (
          <View
            key={o.id}
            className="flex-row items-center justify-between rounded-xl border border-gray-100 bg-white p-3 "
          >
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-gray-500">{o.time}</Text>
                <Text
                  className="text-sm font-medium text-gray-900"
                  numberOfLines={1}
                >
                  {o.customer}
                </Text>
              </View>
              <Text
                className="text-xs text-gray-600 mt-0.5"
                numberOfLines={1}
              >
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
      <Text className="text-xs text-gray-500 mt-2">
        其餘訂單請至「訂單」頁查看
      </Text>
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
            <Text className="text-white font-semibold text-base ml-2">
              登出中...
            </Text>
          </View>
        ) : (
          <Text className="text-white font-semibold text-base">登出</Text>
        )}
      </Pressable>
    </View>
  </>
  )
  return (
    <MainLayout
      title="首頁總覽"
      subtitle={`今日 ${orderStats.day.count} 筆訂單 · ${today}`}
      teamName="甜點工作室 A"
      teamStatus="open"
      onCreatePress={() => console.log("create")}
      onNotificationsPress={() => console.log("notifications")}
      onSearchPress={() => console.log("search")}
      onTeamPress={() => console.log("team picker")}
    >
     {renderContent()}
    </MainLayout>
  );
}
