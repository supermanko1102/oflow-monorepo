import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { TodayOverviewCard } from '@/components/TodayOverviewCard';
import { TodayOrdersList } from '@/components/TodayOrdersList';
import { WeeklyOrderChart } from '@/components/WeeklyOrderChart';
import { QuickActions } from '@/components/QuickActions';
import { mockOrders } from '@/data/mockOrders';
import { mockDailyStats } from '@/data/mockStats';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { SHADOWS } from '@/constants/design';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const merchantName = useAuthStore((state) => state.merchantName);
  const schedule = useScheduleStore((state) => state.schedule);
  const toast = useToast();
  const haptics = useHaptics();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    
    // 模擬資料重新載入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRefreshing(false);
    toast.success('資料已更新');
  }, [haptics, toast]);

  // 取得今日訂單
  const today = new Date();
  const todayOrders = mockOrders
    .filter(order => order.status === 'pending')
    .slice(0, 3);

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

  // 模擬本週訂單數據（用於圖表）
  const weeklyOrderData = [12, 15, 8, 20, 18, 14, 22];

  // Sticky Header Component
  const renderHeader = () => (
    <View 
      className="pb-6 px-6 bg-white border-b border-gray-100"
      style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
    >
      <Text className="text-4xl font-black text-gray-900 mb-2">
        {getCurrentGreeting()}，{merchantName}
      </Text>
      <Text className="text-base font-semibold text-gray-600">
        今天是 {formatDate()}
      </Text>
    </View>
  );

  // Main Content Component
  const renderContent = () => (
    <View className="bg-gray-50">
      {/* 1. 今日概覽（合併：排班 + 數據 + 待辦） */}
      <TodayOverviewCard 
        schedule={schedule}
        stats={mockDailyStats}
        taskCount={todayOrders.length}
      />

      {/* 2. 今日訂單（精簡列表，最多3筆） */}
      <TodayOrdersList orders={todayOrders} />

      {/* 3. 本週趨勢圖 */}
      <WeeklyOrderChart data={weeklyOrderData} />

      {/* 4. 快速操作 */}
      <QuickActions />

      {/* 底部間距 */}
      <View className="h-8" />
    </View>
  );

  return (
    <FlatList
      data={[{ key: 'content' }]}
      renderItem={renderContent}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={renderHeader}
      stickyHeaderIndices={[0]}
      className="flex-1 bg-gray-50"
      // 性能優化配置
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={3}
      updateCellsBatchingPeriod={50}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00B900"
          colors={['#00B900']}
        />
      }
    />
  );
}
