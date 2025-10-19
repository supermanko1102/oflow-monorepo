import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Order } from '@/types/order';
import { useRouter } from 'expo-router';

interface FutureOrdersSectionProps {
  futureOrders: Order[];
}

export function FutureOrdersSection({ futureOrders }: FutureOrdersSectionProps) {
  const router = useRouter();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  if (futureOrders.length === 0) {
    return null;
  }

  // 按日期分組訂單
  const ordersByDate = futureOrders.reduce((acc, order) => {
    const date = order.pickupDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // 格式化日期顯示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 檢查是否為明天
    if (
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()
    ) {
      return '明天';
    }

    // 檢查是否為後天
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    if (
      date.getFullYear() === dayAfterTomorrow.getFullYear() &&
      date.getMonth() === dayAfterTomorrow.getMonth() &&
      date.getDate() === dayAfterTomorrow.getDate()
    ) {
      return '後天';
    }

    // 其他日期顯示月/日
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
  };

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  return (
    <View className="mt-4">
      <View className="px-4 py-3 bg-gray-100">
        <Text className="text-sm font-semibold text-gray-700">
          未來訂單
        </Text>
      </View>

      {Object.entries(ordersByDate).map(([date, orders]) => {
        const isExpanded = expandedDates.has(date);
        const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        return (
          <View key={date}>
            {/* 日期標題（可點擊展開） */}
            <TouchableOpacity
              onPress={() => toggleDate(date)}
              className="mx-4 mt-3 p-4 bg-white rounded-lg border border-gray-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    {formatDate(date)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {orders.length} 筆訂單 · ${totalAmount.toLocaleString()}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#6B7280"
                />
              </View>
            </TouchableOpacity>

            {/* 展開顯示訂單列表 */}
            {isExpanded && (
              <View className="mx-4 mt-2 mb-2 bg-gray-50 rounded-lg border border-gray-200">
                {orders.map((order, index) => (
                  <TouchableOpacity
                    key={order.id}
                    onPress={() => router.push(`/order/${order.id}`)}
                    className={`p-3 ${
                      index < orders.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={14}
                            color="#6B7280"
                          />
                          <Text className="ml-1 text-sm text-gray-600">
                            {order.pickupTime}
                          </Text>
                          <Text className="ml-2 text-base font-semibold text-gray-900">
                            {order.customerName}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-600">
                          {order.items[0].name}
                          {order.items.length > 1 && ` 等 ${order.items.length} 項`}
                        </Text>
                      </View>
                      <Text className="text-base font-bold text-gray-900">
                        ${order.totalAmount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

