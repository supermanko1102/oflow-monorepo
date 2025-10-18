/**
 * Reminder Card 組件 - 極簡風格
 * 與設置頁面風格一致：灰色為主 + LINE green 僅用於品牌標記
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { Reminder } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { useRouter } from 'expo-router';

interface ReminderCardProps {
  reminder: Reminder;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const router = useRouter();
  const { order } = reminder;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getReminderLabel = () => {
    switch (reminder.reminderType) {
      case 'today':
        return '今天';
      case '3days':
        return '3天內';
      case '7days':
        return '7天內';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.7}
    >
      <Card className="mb-3 mx-4 bg-white">
        <Card.Content className="p-4">
          <View className="flex-row items-center mb-2">
            {/* 提醒類型標籤 - 統一灰色風格 */}
            <View className="px-2 py-1 rounded-md bg-gray-100 mr-2">
              <Text className="text-xs font-semibold text-gray-700">
                {getReminderLabel()}
              </Text>
            </View>
            {/* 未讀標記 - 使用 LINE green */}
            {!reminder.isRead && (
              <View className="w-2 h-2 rounded-full bg-line-green" />
            )}
          </View>

          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600">
                {order.items[0]?.name}
                {order.items.length > 1 && ` 等 ${order.items.length} 項`}
              </Text>
            </View>
            <StatusBadge type="source" value={order.source} />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">
              {formatDate(order.pickupDate)} {order.pickupTime}
            </Text>
            <Text className="text-base font-bold text-gray-900">
              ${order.totalAmount}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
