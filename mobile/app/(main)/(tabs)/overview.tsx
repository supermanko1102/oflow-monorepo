import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { QuickActionCard } from "@/components/ui/QuickActionCard";
import {
  useDashboardSummary,
  useRevenueStats,
} from "@/hooks/queries/useDashboard";
import { useDashboardActivity } from "@/hooks/queries/useDashboardActivity";
import { useUpdateAutoMode } from "@/hooks/queries/useTeams";
import { useUser } from "@/hooks/queries/useUser";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useRouter } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { showApiError } from "@/lib/showApiError";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
};

function MetricCard({
  label,
  value,
  icon,
  trend,
  trendType = "neutral",
}: MetricCardProps) {
  const trendColor =
    trendType === "up"
      ? "#22C55E"
      : trendType === "down"
        ? "#EF4444"
        : "#94A3B8";

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4 mr-3 w-40 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: "#F8FAFC" }}
        >
          <Ionicons name={icon} size={18} color="#64748B" />
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Ionicons
              name={
                trendType === "up"
                  ? "arrow-up"
                  : trendType === "down"
                    ? "arrow-down"
                    : "remove"
              }
              size={12}
              color={trendColor}
            />
            <Text className="text-xs ml-0.5" style={{ color: trendColor }}>
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-bold text-slate-900 mb-1">{value}</Text>
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}

type OperationMode = "auto" | "semi";

export default function Overview() {
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const router = useRouter();

  // Fetch User
  const { data: user } = useUser();

  // Fetch Teams
  // Auto Mode Mutation
  const { mutateAsync: mutateAutoMode, isPending: isUpdatingMode } =
    useUpdateAutoMode();

  // Local state for mode to allow optimistic UI, synced with server state
  const [mode, setMode] = useState<OperationMode>("auto");
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    if (currentTeam) {
      setMode(currentTeam.auto_mode ? "auto" : "semi");
    }
  }, [currentTeam?.auto_mode, currentTeam]);

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
      showApiError(error);
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

  const { data: weekRevenueData, refetch: refetchWeekRevenue } =
    useRevenueStats(currentTeamId, "week");

  const { data: monthRevenueData, refetch: refetchMonthRevenue } =
    useRevenueStats(currentTeamId, "month");

  const {
    data: activityPages,
    isLoading: isActivityLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchActivity,
  } = useDashboardActivity({
    teamId: currentTeamId,
    enabled: !!currentTeamId,
    pageSize: 20,
  });

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

  // Generate Activities from real data
  const activities = useMemo(() => {
    const pageItems = activityPages?.pages.flatMap((p) => p.items || []) || [];

    if (pageItems.length > 0) {
      return pageItems.map((order) => {
        const date = order.createdAt || order.completedAt || order.updatedAt;
        const displayDate = date ? new Date(date) : new Date();
        const isNew =
          order.status === "pending" || order.status === "confirmed";
        const content = isNew
          ? `新訂單：${order.customerName || "客戶"} (${order.items?.length || 1}項商品)`
          : `${order.customerName || "客戶"} 的訂單已更新`;
        return {
          id: `activity-${order.id}-${order.status}-${order.createdAt}`,
          content,
          displayTime: format(displayDate, "HH:mm"),
          type: isNew ? "auto" : "success",
        };
      });
    }

    if (!dashboardData) return [];

    const fallbackOrders = [
      ...(dashboardData.todayPending || []),
      ...(dashboardData.todayCompleted || []),
    ];

    if (fallbackOrders.length === 0) {
      return [
        {
          id: "no-activity",
          content: "尚無今日動態",
          displayTime: "現在",
          type: "neutral" as const,
        },
      ];
    }

    return fallbackOrders.slice(0, 10).map((order) => {
      const date = order.createdAt || order.completedAt || order.updatedAt;
      const displayDate = date ? new Date(date) : new Date();
      const isNew = order.status === "pending" || order.status === "confirmed";
      const content = isNew
        ? `新訂單：${order.customerName || "客戶"} (${order.items?.length || 1}項商品)`
        : `${order.customerName || "客戶"} 的訂單已更新`;
      return {
        id: `fallback-${order.id}`,
        content,
        displayTime: format(displayDate, "HH:mm"),
        type: isNew ? "auto" : "success",
      };
    });
  }, [activityPages, dashboardData]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchDashboard(),
      refetchRevenue(),
      refetchWeekRevenue(),
      refetchMonthRevenue(),
      refetchActivity(),
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
              ? "AI 將自動建立訂單並回覆訊息"
              : "AI 將自動建立訂單但不回覆訊息"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-base font-bold text-slate-900">快捷功能</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            <QuickActionCard
              icon="cube-outline"
              title="商品管理"
              subtitle="管理商品與庫存"
              onPress={() => router.push("/production")}
            />
            <QuickActionCard
              icon="bicycle-outline"
              title="配送設定"
              subtitle="設定配送方式"
              onPress={() => router.push("/delivery")}
            />
            <QuickActionCard
              icon="chatbubble-ellipses-outline"
              title="LINE 設定"
              subtitle="連結 LINE 帳號"
              onPress={() => router.push("/lineConnect")}
            />
          </ScrollView>
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
                <Text className="text-lg font-bold text-slate-900">
                  今日概況
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-6 px-6"
              >
                <MetricCard
                  label="今日營收"
                  value={todayMetrics.revenue}
                  icon="cash-outline"
                  trend={
                    revenueData?.orderCount
                      ? `${revenueData.orderCount} 筆`
                      : undefined
                  }
                  trendType="up"
                />
                <MetricCard
                  label="今日訂單"
                  value={todayMetrics.orders}
                  icon="receipt-outline"
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
                  icon="time-outline"
                  trend={todayMetrics.pending > 0 ? "需關注" : "無"}
                  trendType={todayMetrics.pending > 0 ? "down" : "neutral"}
                />
                <MetricCard
                  label="本週訂單"
                  value={weekRevenueData?.orderCount || 0}
                  icon="calendar-outline"
                  trend={
                    weekRevenueData?.orderCount
                      ? `$${weekRevenueData.totalRevenue.toLocaleString()}`
                      : undefined
                  }
                  trendType="up"
                />
                <MetricCard
                  label="本月訂單"
                  value={monthRevenueData?.orderCount || 0}
                  icon="stats-chart-outline"
                  trend={
                    monthRevenueData?.orderCount
                      ? `$${monthRevenueData.totalRevenue.toLocaleString()}`
                      : undefined
                  }
                  trendType="up"
                />
              </ScrollView>
            </View>

            {/* Timeline / Feed */}
            <View className="mb-8">
              {/* Activities */}
              <View className="space-y-4">
                <Text className="text-sm font-semibold text-gray-500 px-1">
                  最新動態
                </Text>
                {isActivityLoading && activities.length === 0 ? (
                  <View className="py-6 items-center justify-center">
                    <ActivityIndicator size="small" color="#008080" />
                    <Text className="text-gray-500 mt-2 text-sm">
                      載入動態中...
                    </Text>
                  </View>
                ) : activities.length === 0 ? (
                  <View className="py-4 px-2">
                    <Text className="text-gray-500 text-sm">尚無最新動態</Text>
                  </View>
                ) : (
                  activities.map((item) => (
                    <View key={item.id} className="flex-row items-start px-1">
                      <View className="mt-1 w-2 h-2 rounded-full bg-brand-teal mr-3" />
                      <View className="flex-1">
                        <Text className="text-gray-800 text-sm mb-0.5">
                          {item.content}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {item.displayTime}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
                {hasNextPage ? (
                  <TouchableOpacity
                    onPress={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2 self-start px-3 py-2 rounded-lg bg-white border border-gray-200"
                  >
                    <Text className="text-sm font-semibold text-brand-teal">
                      {isFetchingNextPage ? "載入中..." : "載入更多"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </MainLayout>
  );
}
