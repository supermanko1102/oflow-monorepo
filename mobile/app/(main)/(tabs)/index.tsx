import { EmptyState } from "@/components/EmptyState";
import { FutureOrdersSection } from "@/components/FutureOrdersSection";
import { LoadingState } from "@/components/LoadingState";
import { TodaySummaryCard } from "@/components/TodaySummaryCard";
import { TodayTodoList } from "@/components/TodayTodoList";
import { SHADOWS } from "@/constants/design";
import { useDashboardSummary } from "@/hooks/queries/useDashboard";
import { useUpdateOrderStatus } from "@/hooks/queries/useOrders";
import { useHaptics } from "@/hooks/useHaptics";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const toast = useToast();
  const haptics = useHaptics();

  // 視圖切換狀態

  // 使用 Dashboard Summary API（後端已完成分類和排序）
  const {
    data: dashboardData,
    isLoading,
    refetch,
    isFetching,
  } = useDashboardSummary(currentTeamId, !!currentTeamId);

  // 更新訂單狀態的 mutation
  const updateOrderStatus = useUpdateOrderStatus();

  // 直接使用後端回傳的分類資料
  const todayPendingOrders = dashboardData?.todayPending || [];
  const todayCompletedOrders = dashboardData?.todayCompleted || [];
  const futureOrders = dashboardData?.future || [];

  const onRefresh = useCallback(async () => {
    haptics.light();
    await refetch();
    toast.success("資料已更新");
  }, [haptics, toast, refetch]);

  // 處理訂單完成切換
  const handleToggleComplete = useCallback(
    async (orderId: string) => {
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

  // 計算今日總營收
  const totalRevenue = [...todayPendingOrders, ...todayCompletedOrders].reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );
  // Loading state
  if (isLoading && !dashboardData) {
    return <LoadingState message="載入中..." />;
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
        className="flex-row items-center justify-end px-6 py-4 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
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
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor="#00B900"
            colors={["#00B900"]}
          />
        }
      >
        {/* 今日摘要卡片 */}
        <TodaySummaryCard
          orderCount={todayPendingOrders.length + todayCompletedOrders.length}
          totalRevenue={totalRevenue}
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
