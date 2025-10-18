/**
 * 今日訂單列表（精簡版）
 * 顯示今天需處理的訂單，最多3筆
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/native/Card';
import { Order } from '@/types/order';
import { useHaptics } from '@/hooks/useHaptics';

interface TodayOrdersListProps {
  orders: Order[];
}

export function TodayOrdersList({ orders }: TodayOrdersListProps) {
  const router = useRouter();
  const haptics = useHaptics();
  
  if (orders.length === 0) {
    return null;
  }
  
  return (
    <Card className="mx-6 mt-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-900">
          今日訂單
        </Text>
        <Text className="text-sm font-medium text-gray-600">
          {orders.length} 筆待處理
        </Text>
      </View>

      {orders.map((order, index) => (
        <Pressable
          key={order.id}
          onPress={() => {
            haptics.light();
            router.push(`/(main)/order/${order.id}`);
          }}
          className={`py-3 ${index < orders.length - 1 ? 'border-b border-gray-100' : ''}`}
          style={({ pressed }) => [
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="text-base font-semibold text-gray-900 mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600">
                {order.pickupTime} · {order.items[0].name}
                {order.items.length > 1 && ` 等 ${order.items.length} 項`}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-lg font-bold text-line-green">
                ${order.totalAmount}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}

      <Pressable
        onPress={() => {
          haptics.light();
          router.push('/(main)/(tabs)/orders');
        }}
        className="mt-3 py-2"
        style={({ pressed }) => [
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <Text className="text-sm text-line-green font-bold text-center">
          查看全部訂單 →
        </Text>
      </Pressable>
    </Card>
  );
}

