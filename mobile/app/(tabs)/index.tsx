import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { StatCard } from '@/components/StatCard';
import { TodayOrderItem } from '@/components/TodayOrderItem';
import { WeekStatsCard } from '@/components/WeekStatsCard';
import { mockOrders } from '@/data/mockOrders';
import { mockDailyStats, mockWeeklyStats } from '@/data/mockStats';
import { mockReminders } from '@/data/mockReminders';

export default function DashboardScreen() {
  const router = useRouter();
  const merchantName = useAuthStore((state) => state.merchantName);

  // 取得今日訂單（pickupDate 是今天的）
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
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
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          👋 {getCurrentGreeting()}，{merchantName}
        </Text>
        <Text className="text-sm text-gray-600">
          今天是 {formatDate()}
        </Text>
      </View>

      {/* Today Stats */}
      <View className="px-4 py-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">
          📊 今日數據
        </Text>
        <View className="flex-row gap-3">
          <StatCard
            icon="📦"
            label="訂單數"
            value={mockDailyStats.todayOrderCount}
            color="gray-900"
          />
          <StatCard
            icon="💰"
            label="營收"
            value={formatCurrency(mockDailyStats.todayRevenue)}
            color="line-green"
          />
          <StatCard
            icon="⏳"
            label="待處理"
            value={mockDailyStats.pendingOrderCount}
            color="orange-500"
          />
        </View>
      </View>

      {/* Today's Orders */}
      <View className="bg-white mx-4 rounded-xl p-4 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-semibold text-gray-900">
            🔴 今日重點
          </Text>
          <Text className="text-sm text-gray-600">
            {todayOrders.length} 筆訂單要取貨
          </Text>
        </View>

        {todayOrders.length > 0 ? (
          <>
            {todayOrders.map((order) => (
              <TodayOrderItem key={order.id} order={order} />
            ))}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/orders')}
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
      <View className="px-4 mb-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">
          ⚡ 快速操作
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              mode="contained"
              onPress={() => router.push('/(tabs)/orders')}
              buttonColor="#00B900"
              contentStyle={{ paddingVertical: 4 }}
            >
              查看所有訂單
            </Button>
          </View>
          <View className="flex-1">
            <Button
              mode="outlined"
              onPress={() => {}}
              textColor="#6B7280"
              style={{ borderColor: '#D1D5DB' }}
              contentStyle={{ paddingVertical: 4 }}
            >
              手動新增
            </Button>
          </View>
        </View>
      </View>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <View className="bg-white mx-4 rounded-xl p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-semibold text-gray-900">
              🔔 近期提醒
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/reminders')}>
              <Text className="text-sm text-line-green font-medium">
                查看全部
              </Text>
            </TouchableOpacity>
          </View>

          {upcomingReminders.map((reminder) => (
            <TouchableOpacity
              key={reminder.id}
              onPress={() => router.push(`/order/${reminder.orderId}`)}
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
