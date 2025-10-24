import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrders, useUpdateOrderStatus } from '@/hooks/queries/useOrders';
import { TodaySummaryCard } from '@/components/TodaySummaryCard';
import { TodayTodoList } from '@/components/TodayTodoList';
import { FutureOrdersSection } from '@/components/FutureOrdersSection';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { SHADOWS } from '@/constants/design';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const merchantName = useAuthStore((state) => state.userName);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const toast = useToast();
  const haptics = useHaptics();

  // 使用 React Query 查詢訂單
  const { data: orders = [], isLoading, refetch, isFetching } = useOrders(
    currentTeamId,
    undefined,
    !!currentTeamId
  );

  // 更新訂單狀態的 mutation
  const updateOrderStatus = useUpdateOrderStatus();

  // 在組件中計算訂單
  const todayPendingOrders = React.useMemo(() => {
    const today = new Date();
    return orders
      .filter(order => {
        const orderDate = new Date(order.pickupDate);
        return order.status === 'pending' &&
          orderDate.getFullYear() === today.getFullYear() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getDate() === today.getDate();
      })
      .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  }, [orders]);

  const todayCompletedOrders = React.useMemo(() => {
    const today = new Date();
    return orders
      .filter(order => {
        const orderDate = new Date(order.pickupDate);
        return order.status === 'completed' &&
          orderDate.getFullYear() === today.getFullYear() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getDate() === today.getDate();
      })
      .sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  }, [orders]);

  const futureOrders = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders
      .filter(order => {
        const orderDate = new Date(order.pickupDate);
        orderDate.setHours(0, 0, 0, 0);
        return order.status === 'pending' && orderDate > today;
      })
      .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
  }, [orders]);

  const onRefresh = useCallback(async () => {
    haptics.light();
    await refetch();
    toast.success('資料已更新');
  }, [haptics, toast, refetch]);

  // 處理訂單完成切換
  const handleToggleComplete = useCallback(async (orderId: string) => {
    const order = [...todayPendingOrders, ...todayCompletedOrders].find(o => o.id === orderId);
    if (!order) return;

    try {
      const newStatus = order.status === 'completed' ? 'pending' : 'completed';
      await updateOrderStatus.mutateAsync({
        order_id: orderId,
        status: newStatus,
      });
      
      haptics.success();
      if (newStatus === 'completed') {
        toast.success('已標記為完成');
      } else {
        toast.success('已標記為待處理');
      }
    } catch (error) {
      toast.error('更新失敗，請稍後再試');
    }
  }, [todayPendingOrders, todayCompletedOrders, updateOrderStatus, haptics, toast]);

  const today = new Date();

  const getCurrentGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  const formatDate = () => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const weekday = weekdays[today.getDay()];
    return `${month}/${date} (${weekday})`;
  };

  // 計算今日總營收
  const totalRevenue = [...todayPendingOrders, ...todayCompletedOrders].reduce(
    (sum, order) => sum + order.totalAmount,
    0
  );

  // 取得首筆取貨時間
  const firstPickupTime = todayPendingOrders.length > 0 
    ? todayPendingOrders[0].pickupTime 
    : undefined;

  // Loading state
  if (isLoading && !orders.length) {
    return <LoadingState message="載入中..." />;
  }

  // 沒有選擇團隊
  if (!currentTeamId) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <EmptyState
          title="請先選擇團隊"
          description="前往設定選擇或建立團隊"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Sticky Header */}
      <View 
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-4xl font-black text-gray-900 mb-2">
          {getCurrentGreeting()}，{merchantName}
        </Text>
        <Text className="text-base font-semibold text-gray-600">
          今天是 {formatDate()}
        </Text>
      </View>

      {/* 可滾動內容 */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor="#00B900"
            colors={['#00B900']}
          />
        }
      >
        {/* 今日摘要卡片 */}
        <TodaySummaryCard
          orderCount={todayPendingOrders.length + todayCompletedOrders.length}
          totalRevenue={totalRevenue}
          firstPickupTime={firstPickupTime}
        />

        {/* 今日待辦清單 */}
        <TodayTodoList
          pendingOrders={todayPendingOrders}
          completedOrders={todayCompletedOrders}
          onToggleComplete={handleToggleComplete}
        />

        {/* 未來訂單 */}
        <FutureOrdersSection futureOrders={futureOrders} />

        {/* 底部間距 */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
