import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { logout } from "@/services/auth";
import {
  useDashboardSummary,
  useRevenueStats,
} from "@/hooks/queries/useDashboard";
import { useUpdateAutoMode } from "@/hooks/queries/useTeams";
import { useUser } from "@/hooks/queries/useUser";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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
      className={`rounded-2xl p-4 mr-3 w-40 ${
        primary ? "bg-brand-teal" : "bg-white border border-gray-100"
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View
          className={`p-1.5 rounded-full ${
            primary ? "bg-white/20" : "bg-gray-100"
          }`}
        >
          {icon}
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Ionicons
              name={trendType === "up" ? "arrow-up" : "arrow-down"}
              size={12}
              color={
                primary ? "white" : trendType === "up" ? "#22C55E" : "#EF4444"
              }
            />
            <Text
              className={`text-xs ml-0.5 ${
                primary
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
        className={`text-2xl font-bold mb-1 ${
          primary ? "text-white" : "text-brand-slate"
        }`}
      >
        {value}
      </Text>
      <Text
        className={`text-xs ${primary ? "text-white/80" : "text-gray-500"}`}
      >
        {label}
      </Text>
    </View>
  );
}

type OperationMode = "auto" | "semi";

export default function Overview() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { currentTeam, currentTeamId } = useCurrentTeam();

  // Fetch User
  const { data: user } = useUser();

  // Fetch Teams
  // Auto Mode Mutation
  const { mutateAsync: mutateAutoMode, isPending: isUpdatingMode } =
    useUpdateAutoMode();

  // Local state for mode to allow optimistic UI, synced with server state
  const [mode, setMode] = useState<OperationMode>("auto");

  useEffect(() => {
    if (currentTeam) {
      setMode(currentTeam.auto_mode ? "auto" : "semi");
    }
  }, [currentTeam?.auto_mode]);

  const handleModeChange = async (newMode: OperationMode) => {
    if (!currentTeamId || isUpdatingMode) return;

    try {
      // Wait for server confirmation
      await mutateAutoMode({
        teamId: currentTeamId,
        autoMode: newMode === "auto",
      });
      // Update local state only after success
      setMode(newMode);
    } catch (error) {
      Alert.alert("更新失敗", "無法更新自動模式設定");
    }
  };

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
    isRefetching: isDashboardRefetching,
  } = useDashboardSummary(currentTeamId);

  const {
    data: revenueData,
    isLoading: isRevenueLoading,
    refetch: refetchRevenue,
  } = useRevenueStats(currentTeamId, "day");

  const isLoading = isDashboardLoading || isRevenueLoading;
  const isRefreshing = isDashboardRefetching;

  // Calculate metrics from real data
  const todayMetrics = useMemo(() => {
    if (!dashboardData || !revenueData) {
      return {
        revenue: "$0",
        orders: 0,
        pending: 0,
      };
    }

    const todayOrders =
      dashboardData.todayPending.length + dashboardData.todayCompleted.length;
    const pendingCount = dashboardData.todayPending.length;

    return {
      revenue: `$${revenueData.totalRevenue.toLocaleString()}`,
      orders: todayOrders,
      pending: pendingCount,
    };
  }, [dashboardData, revenueData]);

  // Generate Reminders from real data
  const reminders = useMemo(() => {
    if (!dashboardData) return [];

    const items = [];

    // Pending orders reminder
    if (dashboardData.todayPending.length > 0) {
      items.push({
        id: "pending-orders",
        title: `今天還有 ${dashboardData.todayPending.length} 筆訂單需處理`,
        time: "現在",
        type: "alert",
      });
    }

    // Future orders reminder
    if (dashboardData.future.length > 0) {
      const tomorrowOrders = dashboardData.future.filter((o) => {
        const date = new Date(o.appointmentDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.getDate() === tomorrow.getDate();
      });

      if (tomorrowOrders.length > 0) {
        items.push({
          id: "tomorrow-orders",
          title: `明天有 ${tomorrowOrders.length} 筆預約/訂單`,
          time: "明天",
          type: "warning",
        });
      }
    }

    if (items.length === 0) {
      items.push({
        id: "no-reminders",
        title: "目前沒有緊急待辦事項",
        time: "現在",
        type: "success",
      });
    }

    return items;
  }, [dashboardData]);

  // Generate Activities from real data
  const activities = useMemo(() => {
    if (!dashboardData) return [];

    const items = [];

    // Recent completed orders
    dashboardData.todayCompleted.slice(0, 5).forEach((order) => {
      items.push({
        id: `completed-${order.id}`,
        content: `${order.customerName || "客戶"} 的訂單已完成`,
        time: order.completedAt
          ? new Date(order.completedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "剛剛",
        type: "success",
      });
    });

    // Recent pending orders (newly created)
    dashboardData.todayPending.slice(0, 3).forEach((order) => {
      items.push({
        id: `new-${order.id}`,
        content: `新訂單：${order.customerName || "客戶"} (${order.items?.length || 1}項商品)`,
        time: order.createdAt
          ? new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "剛剛",
        type: "auto",
      });
    });

    if (items.length === 0) {
      items.push({
        id: "no-activity",
        content: "尚無今日動態",
        time: "現在",
        type: "neutral",
      });
    }

    return items.sort((a, b) => (b.time > a.time ? 1 : -1)).slice(0, 5);
  }, [dashboardData]);

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchRevenue()]);
  };

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
            Alert.alert("登出失敗", "無法完成登出，請稍後再試", [
              { text: "確定" },
            ]);
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
      title={`Hi, ${user?.displayName || "店主"}`}
      subtitle={`今日 ${todayMetrics.orders} 筆訂單 · ${today}`}
      teamName={currentTeam?.team_name || "載入中..."}
      teamStatus="open"
      showActions={false}
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#008080"
          />
        }
      >
        {/* Webhook Warning Banner */}
        {!currentTeam?.line_channel_id && (
          <Pressable
            onPress={() => router.push("../settings/line-connection")}
            className="mb-6 flex-row items-center justify-between rounded-2xl border border-yellow-200 bg-yellow-50 p-4"
          >
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Ionicons name="warning" size={24} color="#EAB308" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-yellow-800">
                  尚未連接 LINE 官方帳號
                </Text>
                <Text className="text-xs text-yellow-600">
                  點擊此處完成設定以接收訂單
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EAB308" />
          </Pressable>
        )}

        {/* AI Mode Switcher */}
        <View className="mb-6 bg-gray-100 p-1 rounded-full flex-row">
          <TouchableOpacity
            onPress={() => handleModeChange("auto")}
            disabled={isUpdatingMode}
            className={`flex-1 py-3 px-4 rounded-full flex-row items-center justify-center space-x-2 ${
              mode === "auto" ? "bg-white " : ""
            }`}
          >
            {isUpdatingMode && mode !== "auto" ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <MaterialCommunityIcons
                name="robot"
                size={20}
                color={mode === "auto" ? "#008080" : "#9CA3AF"}
              />
            )}
            <View>
              <Text
                className={`text-sm font-bold ${
                  mode === "auto" ? "text-brand-teal" : "text-gray-500"
                }`}
              >
                全自動
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleModeChange("semi")}
            disabled={isUpdatingMode}
            className={`flex-1 py-3 px-4 rounded-full flex-row items-center justify-center space-x-2 ${
              mode === "semi" ? "bg-white " : ""
            }`}
          >
            {isUpdatingMode && mode !== "semi" ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <MaterialCommunityIcons
                name="file-document-edit"
                size={20}
                color={mode === "semi" ? "#5A6B7C" : "#9CA3AF"}
              />
            )}
            <View>
              <Text
                className={`text-sm font-bold ${
                  mode === "semi" ? "text-brand-slate" : "text-gray-500"
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

        {/* Loading State */}
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#008080" />
            <Text className="text-gray-500 mt-4">載入中...</Text>
          </View>
        ) : (
          <>
            {/* Metrics Carousel */}
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4 px-1">
                <Text className="text-lg font-bold text-brand-slate">
                  今日概況
                </Text>
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
                  trend={
                    revenueData?.orderCount
                      ? `${revenueData.orderCount} 筆`
                      : undefined
                  }
                  trendType="up"
                  primary
                />
                <MetricCard
                  label="今日訂單"
                  value={todayMetrics.orders}
                  icon={
                    <Ionicons
                      name="receipt"
                      size={20}
                      color="rgb(90, 107, 124)"
                    />
                  }
                  trend={
                    dashboardData?.todayCompleted.length
                      ? `${dashboardData.todayCompleted.length} 已完成`
                      : undefined
                  }
                  trendType="up"
                />
                <MetricCard
                  label="待處理訂單"
                  value={todayMetrics.pending}
                  icon={
                    <MaterialCommunityIcons
                      name="message-processing"
                      size={20}
                      color="rgb(249, 115, 22)"
                    />
                  }
                  trend={todayMetrics.pending > 0 ? "需關注" : "無"}
                  trendType={todayMetrics.pending > 0 ? "down" : "neutral"}
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
                      <Ionicons
                        name="notifications"
                        size={20}
                        color="#008080"
                      />
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
                <Text className="text-sm font-semibold text-gray-500 px-1">
                  最新動態
                </Text>
                {activities.map((item) => (
                  <View key={item.id} className="flex-row items-start px-1">
                    <View className="mt-1 w-2 h-2 rounded-full bg-brand-teal mr-3" />
                    <View className="flex-1">
                      <Text className="text-gray-800 text-sm mb-0.5">
                        {item.content}
                      </Text>
                      <Text className="text-gray-400 text-xs">{item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

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
      </ScrollView>
    </MainLayout>
  );
}
