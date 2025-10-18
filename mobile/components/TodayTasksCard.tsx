/**
 * 今日待辦卡片
 * 顯示今天和明天需要處理的訂單摘要
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Order } from '@/types/order';
import { isToday, isTomorrow } from '@/utils/timeHelpers';
import { SHADOWS } from '@/constants/design';

interface TodayTasksCardProps {
  orders: Order[];
}

export function TodayTasksCard({ orders }: TodayTasksCardProps) {
  const router = useRouter();

  // 統計今天和明天的訂單
  const todayOrders = orders.filter(o => o.status === 'pending' && isToday(o.pickupDate));
  const tomorrowOrders = orders.filter(o => o.status === 'pending' && isTomorrow(o.pickupDate));
  const completedToday = orders.filter(o => o.status === 'completed' && isToday(o.pickupDate));
  
  const totalTasks = todayOrders.length + tomorrowOrders.length;
  const completedCount = completedToday.length;

  if (totalTasks === 0 && completedCount === 0) {
    return null; // 如果沒有任務就不顯示
  }

  const progressPercent = totalTasks + completedCount === 0 
    ? 0 
    : (completedCount / (totalTasks + completedCount)) * 100;

  return (
    <Card className="mx-4 mb-4 bg-white" style={SHADOWS.card}>
      <Card.Content className="p-5">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          今日待辦
        </Text>

        {/* 今天取貨 */}
        {todayOrders.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(main)/(tabs)/orders')}
            className="flex-row items-center justify-between py-4 px-3 border-l-4 border-error mb-2 rounded-lg"
            activeOpacity={0.7}
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                今天取貨
              </Text>
              <Text className="text-xs text-gray-600 mt-0.5">
                {todayOrders.length} 筆訂單需要準備
              </Text>
            </View>
            <View className="border-2 border-error px-3 py-1 rounded-lg">
              <Text className="text-base font-bold text-error">
                {todayOrders.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 明天取貨 */}
        {tomorrowOrders.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(main)/(tabs)/orders')}
            className="flex-row items-center justify-between py-4 px-3 border-l-4 border-warning mb-2 rounded-lg"
            activeOpacity={0.7}
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                明天取貨
              </Text>
              <Text className="text-xs text-gray-600 mt-0.5">
                提前準備更輕鬆
              </Text>
            </View>
            <View className="border-2 border-warning px-3 py-1 rounded-lg">
              <Text className="text-base font-bold text-warning">
                {tomorrowOrders.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 已完成 */}
        {completedCount > 0 && (
          <View className="flex-row items-center justify-between py-4 px-3 border-l-4 border-success rounded-lg">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                已完成
              </Text>
              <Text className="text-xs text-gray-600 mt-0.5">
                太棒了！
              </Text>
            </View>
            <Text className="text-xl font-bold text-success">
              {completedCount}
            </Text>
          </View>
        )}

        {/* 進度條 */}
        {totalTasks > 0 && (
          <View className="mt-4 pt-4 border-t border-neutral-100">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-gray-700">今日進度</Text>
              <Text className="text-sm font-bold text-gray-900">
                {completedCount}/{totalTasks + completedCount}
              </Text>
            </View>
            <View className="h-3 bg-neutral-200 rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full bg-success"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}
