import { MainLayout } from "@/components/layout/MainLayout";
import {
  useDashboardSummary,
  useRevenueStats,
} from "@/hooks/queries/useDashboard";
import { useDashboardActivity } from "@/hooks/queries/useDashboardActivity";
import { useUser } from "@/hooks/queries/useUser";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  Pressable,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

export default function Overview() {
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const router = useRouter();

  // Fetch User
  const { data: user } = useUser();

  // Fetch Teams

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
      return pageItems.slice(0, 7).map((order) => {
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

  const quickLinks = [
    {
      icon: "receipt-outline" as const,
      label: "商品管理",
      onPress: () => router.push("/production"),
    },
    {
      icon: "bicycle-outline" as const,
      label: "配送設定",
      onPress: () => router.push("/delivery"),
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      label: "LINE 設定",
      onPress: () => router.push("/lineConnect"),
    },
  ];

  return (
    <MainLayout
      title={`Hi, ${user?.displayName || "店主"}`}
      subtitle={`今日 ${todayMetrics.orders} 筆訂單 · ${today}`}
      teamName={currentTeam?.team_name || "載入中..."}
      teamStatus="open"
      showActions={false}
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
        {/* Hero Summary */}
        <View className="mb-6 px-1">
          <View className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
            <Text className="text-sm font-semibold text-slate-500">
              今日狀態
            </Text>
            <Text className="text-2xl font-extrabold text-slate-900 mt-1">
              {todayMetrics.orders} 筆訂單 · {todayMetrics.pending} 待處理
            </Text>
            <Text className="text-[12px] text-slate-500 mt-1">
              團隊：{currentTeam?.team_name || "載入中..."}
            </Text>
            <View className="flex-row items-center gap-2 mt-3">
              <Pressable
                onPress={() => router.push("/(main)/(tabs)/inbox")}
                className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-brand-teal"
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text className="text-white text-sm font-semibold">
                  前往收件匣
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-1 px-3 py-2 rounded-full bg-slate-100">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color="#0F172A"
                />
                <Text className="text-[12px] font-semibold text-slate-700">
                  AI 建單啟用中
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#008080" />
            <Text className="text-gray-500 mt-4">載入中...</Text>
          </View>
        ) : (
          <>
            {/* Metrics Grid */}
            <View className="mb-8 px-1">
              <Text className="text-lg font-bold text-slate-900 mb-3">
                概況
              </Text>
              <View className="flex-row flex-wrap gap-3">
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
              </View>
            </View>

            {/* Quick Links */}
            <View className="mb-8 px-1">
              <Text className="text-lg font-bold text-slate-900 mb-3">
                快速入口
              </Text>
              <View className="gap-3">
                {quickLinks.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    className="flex-row items-center justify-between rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                        <Ionicons name={item.icon} size={18} color="#0F172A" />
                      </View>
                      <Text className="text-sm font-semibold text-slate-900">
                        {item.label}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94A3B8"
                    />
                  </Pressable>
                ))}
              </View>
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
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </MainLayout>
  );
}
