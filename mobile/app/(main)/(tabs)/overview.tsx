import { MainLayout } from "@/components/layout/MainLayout";
import { IconButton } from "@/components/Navbar";
import { logout } from "@/services/auth";
import {
  useDashboardSummary,
  useRevenueStats,
} from "@/hooks/queries/useDashboard";
import { useDashboardActivity } from "@/hooks/queries/useDashboardActivity";
import { useUpdateAutoMode } from "@/hooks/queries/useTeams";
import { useUser } from "@/hooks/queries/useUser";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
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
              ? "AI 將自動回覆訊息並建立訂單"
              : "AI 生成草稿，需您確認後發送"}
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
