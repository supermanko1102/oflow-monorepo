/**
 * 緊急訂單預覽組件
 * 顯示今天需要處理的訂單列表
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Order } from '@/types/order';
import { isToday } from '@/utils/timeHelpers';

interface UrgentOrderPreviewProps {
  orders: Order[];
}

export function UrgentOrderPreview({ orders }: UrgentOrderPreviewProps) {
  const router = useRouter();

  // 只顯示今天取貨且待處理的訂單
  const urgentOrders = orders.filter(
    o => o.status === 'pending' && isToday(o.pickupDate)
  );

  if (urgentOrders.length === 0) {
    return null;
  }

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center px-4 mb-3">
        <Text className="text-base font-semibold text-gray-900">
          🔴 今日重點
        </Text>
        <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/orders')}>
          <Text className="text-sm text-line-green font-medium">
            查看全部 →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {urgentOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => router.push(`/(main)/order/${order.id}`)}
            activeOpacity={0.7}
          >
            <Card 
              className="mr-3"
              style={{ width: 280 }}
            >
              <Card.Content className="p-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 mb-1">
                      {order.customerName}
                    </Text>
                    <Text className="text-sm text-gray-600" numberOfLines={1}>
                      {order.items[0].name}
                      {order.items.length > 1 && ` 等 ${order.items.length} 項`}
                    </Text>
                  </View>
                  <Chip 
                    mode="flat"
                    textStyle={{ fontSize: 10, color: '#991B1B' }}
                    style={{ 
                      height: 24,
                      backgroundColor: '#FEE2E2',
                    }}
                  >
                    今天
                  </Chip>
                </View>

                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-sm text-gray-600">
                    {order.pickupTime}
                  </Text>
                  <Text className="text-lg font-bold text-line-green">
                    ${order.totalAmount}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

