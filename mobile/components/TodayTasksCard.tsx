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

  return (
    <Card className="mx-4 mb-4">
      <Card.Content className="p-4">
        <View className="flex-row items-center mb-3">
          <Text className="text-xl mr-2">⏰</Text>
          <Text className="text-base font-semibold text-gray-900">
            今日待辦
          </Text>
        </View>

        {/* 今天取貨 */}
        {todayOrders.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(main)/(tabs)/orders')}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">🔴</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  今天取貨
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {todayOrders.length} 筆訂單需要準備
                </Text>
              </View>
            </View>
            <Text className="text-base font-bold text-red-500">
              {todayOrders.length}
            </Text>
          </TouchableOpacity>
        )}

        {/* 明天取貨 */}
        {tomorrowOrders.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(main)/(tabs)/orders')}
            className="flex-row items-center justify-between py-3 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">🟡</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  明天取貨
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  提前準備更輕鬆
                </Text>
              </View>
            </View>
            <Text className="text-base font-bold text-amber-500">
              {tomorrowOrders.length}
            </Text>
          </TouchableOpacity>
        )}

        {/* 已完成 */}
        {completedCount > 0 && (
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">✅</Text>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  已完成
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  太棒了！
                </Text>
              </View>
            </View>
            <Text className="text-base font-bold text-green-500">
              {completedCount}
            </Text>
          </View>
        )}

        {/* 進度條 */}
        {totalTasks > 0 && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs text-gray-600">今日進度</Text>
              <Text className="text-xs text-gray-600">
                {completedCount}/{totalTasks + completedCount}
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View 
                className="h-full bg-line-green rounded-full"
                style={{ 
                  width: `${totalTasks + completedCount === 0 ? 0 : (completedCount / (totalTasks + completedCount)) * 100}%` 
                }}
              />
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

