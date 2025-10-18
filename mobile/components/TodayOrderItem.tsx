import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Order } from '@/types/order';
import { useRouter } from 'expo-router';

interface TodayOrderItemProps {
  order: Order;
}

export function TodayOrderItem({ order }: TodayOrderItemProps) {
  const router = useRouter();

  const itemsSummary = order.items.length === 1 
    ? order.items[0].name 
    : `${order.items[0].name} 等 ${order.items.length} 項`;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.7}
      className="flex-row items-center py-3 border-b border-gray-100"
    >
      <View className="w-2 h-2 rounded-full bg-red-500 mr-3" />
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 mb-1">
          {order.customerName}
        </Text>
        <Text className="text-sm text-gray-600">
          {itemsSummary}
        </Text>
      </View>
      <Text className="text-sm font-medium text-gray-700">
        {order.pickupTime}
      </Text>
    </TouchableOpacity>
  );
}

