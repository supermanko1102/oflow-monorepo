import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { StatCard } from '@/components/StatCard';
import { TodayOrderItem } from '@/components/TodayOrderItem';
import { WeekStatsCard } from '@/components/WeekStatsCard';
import { TodayTasksCard } from '@/components/TodayTasksCard';
import { UrgentOrderPreview } from '@/components/UrgentOrderPreview';
import { TodayScheduleCard } from '@/components/TodayScheduleCard';
import { mockOrders } from '@/data/mockOrders';
import { mockDailyStats, mockWeeklyStats } from '@/data/mockStats';
import { mockReminders } from '@/data/mockReminders';
import { useToast } from '@/hooks/useToast';
import { useHaptics } from '@/hooks/useHaptics';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { SHADOWS } from '@/constants/design';

export default function DashboardScreen() {
  const router = useRouter();
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

  // 取得今日訂單（pickupDate 是今天的）
  const today = new Date();
  
  // 模擬今日訂單 - 取前3筆待處理的訂單
  const todayOrders = mockOrders
    .filter(order => order.status === 'pending')
    .slice(0, 3);

  // 取得近期提醒
  const upcomingReminders = mockReminders
    .filter(r => !r.isRead)
    .slice(0, 2);

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

  const formatCurrency = (amount: number) => {
    return amount >= 1000 
      ? `$${(amount / 1000).toFixed(1)}K`
      : `$${amount}`;
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#00B900"
          colors={['#00B900']}
        />
      }
    >
      {/* Header */}
      <View 
        className="pb-6 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          {getCurrentGreeting()}，{merchantName}
        </Text>
        <Text className="text-base text-gray-600">
          今天是 {formatDate()}
        </Text>
      </View>

      {/* Today Schedule Card - 新增：今日排班 */}
      <View className="mt-4">
        <TodayScheduleCard schedule={schedule} />
      </View>

      {/* Today Tasks Card - 新增：今日待辦 */}
      <View className="mt-0">
        <TodayTasksCard orders={mockOrders} />
      </View>

      {/* Urgent Order Preview - 新增：緊急訂單預覽 */}
      <UrgentOrderPreview orders={mockOrders} />

      {/* Today Stats */}
      <View className="px-6 py-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          今日數據
        </Text>
        <View className="flex-row gap-3">
          <StatCard
            icon="package"
            label="訂單數"
            value={mockDailyStats.todayOrderCount}
            color="info"
          />
          <StatCard
            icon="cash"
            label="營收"
            value={formatCurrency(mockDailyStats.todayRevenue)}
            color="success"
          />
          <StatCard
            icon="clock"
            label="待處理"
            value={mockDailyStats.pendingOrderCount}
            color="warning"
          />
        </View>
      </View>

      {/* Today's Orders */}
      <View className="bg-white mx-6 rounded-2xl p-5 mb-6" style={SHADOWS.card}>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-gray-900">
            今日重點
          </Text>
          <Text className="text-sm font-medium text-gray-600">
            {todayOrders.length} 筆訂單
          </Text>
        </View>

        {todayOrders.length > 0 ? (
          <>
            {todayOrders.map((order) => (
              <TodayOrderItem key={order.id} order={order} />
            ))}
            <TouchableOpacity
              onPress={() => router.push('/(main)/(tabs)/orders')}
              className="mt-3 py-2"
            >
              <Text className="text-sm text-line-green font-medium text-center">
                查看全部訂單 →
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="py-6">
            <Text className="text-center text-gray-500">
              今天沒有待取貨訂單
            </Text>
          </View>
        )}
      </View>

      {/* Weekly Stats */}
      <WeekStatsCard stats={mockWeeklyStats} />

      {/* Quick Actions */}
      <View className="px-6 mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          快速操作
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              mode="contained"
              onPress={() => router.push('/(main)/(tabs)/orders')}
              buttonColor="#00B900"
              contentStyle={{ paddingVertical: 8 }}
              style={{ borderRadius: 12 }}
            >
              查看所有訂單
            </Button>
          </View>
          <View className="flex-1">
            <Button
              mode="outlined"
              onPress={() => {}}
              textColor="#6B7280"
              style={{ borderColor: '#D1D5DB', borderRadius: 12 }}
              contentStyle={{ paddingVertical: 8 }}
            >
              手動新增
            </Button>
          </View>
        </View>
      </View>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <View className="bg-white mx-6 rounded-2xl p-5 mb-6" style={SHADOWS.card}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              近期提醒
            </Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/reminders')}>
              <Text className="text-sm text-primary-500 font-semibold">
                查看全部 →
              </Text>
            </TouchableOpacity>
          </View>

          {upcomingReminders.map((reminder) => (
            <TouchableOpacity
              key={reminder.id}
              onPress={() => router.push(`/(main)/order/${reminder.orderId}`)}
              className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0"
            >
              <Text className="text-xl mr-3">
                {reminder.reminderType === 'today' ? '🔴' : 
                 reminder.reminderType === '3days' ? '🟡' : '🟢'}
              </Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 mb-1">
                  {reminder.order.customerName}
                </Text>
                <Text className="text-xs text-gray-600">
                  {reminder.order.pickupDate} {reminder.order.pickupTime}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-gray-700">
                ${reminder.order.totalAmount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}

