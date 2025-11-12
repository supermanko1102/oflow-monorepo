import { EmptyState } from "@/components/EmptyState";
import { FutureOrdersSection } from "@/components/FutureOrdersSection";
import { HomeSkeleton } from "@/components/skeletons/HomeSkeleton";
import { TodaySummaryCard } from "@/components/TodaySummaryCard";
import { TodayTodoList } from "@/components/TodayTodoList";
import { SHADOWS } from "@/constants/design";
import {
  useDashboardSummary,
  useRevenueStats,
} from "@/hooks/queries/useDashboard";
import { useUpdateOrderStatus } from "@/hooks/queries/useOrders";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import type { PaymentMethod, TimeRange } from "@/types/order";
import { TIME_RANGE_LABELS } from "@/types/order";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// TODO: Menu 需要用 BottomSheet 替換
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const toast = useToast();
  const haptics = useHaptics();

  // 時間範圍選擇狀態
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [menuVisible, setMenuVisible] = useState(false);

  // 使用 Dashboard Summary API（後端已完成分類和排序）
  const {
    data: dashboardData,
    isLoading,
    refetch: refetchDashboard,
    isFetching: isFetchingDashboard,
  } = useDashboardSummary(currentTeamId, !!currentTeamId);

  // 查詢營收統計
  const {
    data: revenueStats,
    isLoading: isLoadingRevenue,
    refetch: refetchRevenue,
    isFetching: isFetchingRevenue,
  } = useRevenueStats(currentTeamId, timeRange, !!currentTeamId);

  // 更新訂單狀態的 mutation
  const updateOrderStatus = useUpdateOrderStatus();

  // 直接使用後端回傳的分類資料
  const todayPendingOrders = dashboardData?.todayPending || [];
  const todayCompletedOrders = dashboardData?.todayCompleted || [];
  const futureOrders = dashboardData?.future || [];

  const onRefresh = useCallback(async () => {
    haptics.light();
    await Promise.all([refetchDashboard(), refetchRevenue()]);
    toast.success("資料已更新");
  }, [haptics, toast, refetchDashboard, refetchRevenue]);

  // 處理訂單完成切換（支援付款方式）
  const handleToggleComplete = useCallback(
    async (orderId: string, paymentMethod?: PaymentMethod) => {
      const order = [...todayPendingOrders, ...todayCompletedOrders].find(
        (o) => o.id === orderId
      );
      if (!order) return;

      try {
        const newStatus =
          order.status === "completed" ? "pending" : "completed";
        await updateOrderStatus.mutateAsync({
          order_id: orderId,
          status: newStatus,
          payment_method: paymentMethod,
        });

        haptics.success();
        if (newStatus === "completed") {
          toast.success("已標記為完成");
        } else {
          toast.success("已標記為待處理");
        }
      } catch (error) {
        toast.error("更新失敗，請稍後再試," + error);
      }
    },
    [
      todayPendingOrders,
      todayCompletedOrders,
      updateOrderStatus,
      haptics,
      toast,
    ]
  );
  // 通知處理
  const handleNotification = () => {
    haptics.light();
    toast.info("通知功能即將推出");
  };

  // 時間範圍選擇處理
  const handleTimeRangeSelect = (range: TimeRange) => {
    haptics.light();
    setTimeRange(range);
    setMenuVisible(false);
  };

  // Loading state
  if ((isLoading || isLoadingRevenue) && !dashboardData) {
    return <HomeSkeleton />;
  }

  // 沒有選擇團隊
  if (!currentTeamId) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <EmptyState title="請先選擇團隊" description="前往設定選擇或建立團隊" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* 極簡功能型 Header */}
      <View
        className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        {/* 左側：時間範圍選擇器 */}
        <View>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setMenuVisible(!menuVisible);
            }}
            activeOpacity={0.6}
            className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
          >
            <Text className="text-sm font-semibold text-gray-700 mr-1">
              {TIME_RANGE_LABELS[timeRange]}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#374151"
            />
          </TouchableOpacity>

          {/* 下拉選單 */}
          {menuVisible && (
            <View className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              {(["day", "week", "month", "year"] as TimeRange[]).map(
                (range) => (
                  <TouchableOpacity
                    key={range}
                    onPress={() => handleTimeRangeSelect(range)}
                    className="px-4 py-3 border-b border-gray-100"
                    activeOpacity={0.7}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        color: timeRange === range ? "#00B900" : "#374151",
                        fontWeight: timeRange === range ? "600" : "normal",
                      }}
                    >
                      {TIME_RANGE_LABELS[range]}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </View>

        {/* 右側：功能圖標 */}
        <View className="flex-row gap-4">
          {/* 通知 icon */}
          <TouchableOpacity
            onPress={handleNotification}
            activeOpacity={0.6}
            accessibilityLabel="通知"
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 可滾動內容 */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isFetchingDashboard || isFetchingRevenue}
            onRefresh={onRefresh}
            tintColor="#00B900"
            colors={["#00B900"]}
          />
        }
      >
        {/* 營收統計卡片 */}
        <TodaySummaryCard
          orderCount={revenueStats?.orderCount || 0}
          totalRevenue={revenueStats?.totalRevenue || 0}
          timeRange={timeRange}
          paymentStats={revenueStats?.paymentStats}
        />
        {/* 今日訂單列表（待處理 + 已完成） */}
        <TodayTodoList
          pendingOrders={todayPendingOrders}
          completedOrders={todayCompletedOrders}
          onToggleComplete={handleToggleComplete}
        />

        {/* 未來訂單區塊 */}
        <FutureOrdersSection futureOrders={futureOrders} />

        {/* 底部間距 */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
