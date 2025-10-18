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

  const getReminderIcon = () => {
    switch (reminder.reminderType) {
      case 'today':
        return '🔴';
      case '3days':
        return '🟡';
      case '7days':
        return '🟢';
      default:
        return '⚪';
    }
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
      <Card className={`mb-3 mx-4 ${!reminder.isRead ? 'border-l-4 border-line-green' : ''}`}>
        <Card.Content className="p-4">
          <View className="flex-row items-center mb-2">
            <Text className="text-xl mr-2">{getReminderIcon()}</Text>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getReminderLabel()}
            </Text>
            {!reminder.isRead && (
              <View className="ml-2 w-2 h-2 rounded-full bg-line-green" />
            )}
          </View>

          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {order.items[0]?.name}
                {order.items.length > 1 && ` 等 ${order.items.length} 項`}
              </Text>
            </View>
            <StatusBadge type="source" value={order.source} />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              📅 {formatDate(order.pickupDate)} {order.pickupTime}
            </Text>
            <Text className="text-base font-bold text-line-green">
              ${order.totalAmount}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

