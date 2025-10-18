/**
 * 緊急訂單預覽組件
 * 顯示今天需要處理的訂單列表
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Order } from '@/types/order';
import { isToday } from '@/utils/timeHelpers';
import { SHADOWS } from '@/constants/design';

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
    <View className="mb-6">
      <View className="flex-row justify-between items-center px-6 mb-4">
        <Text className="text-lg font-bold text-gray-900">
          今日重點
        </Text>
        <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/orders')}>
          <Text className="text-sm text-primary-500 font-semibold">
            查看全部 →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24 }}
      >
        {urgentOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            onPress={() => router.push(`/(main)/order/${order.id}`)}
            activeOpacity={0.7}
            className="mr-3"
          >
            <Card 
              className="overflow-hidden"
              style={[SHADOWS.card, { width: 280 }]}
            >
              {/* 頂部紅色警告條 */}
              <LinearGradient
                colors={['#FEE2E2', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="absolute inset-0 opacity-50"
              />
              
              <Card.Content className="p-5">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900 mb-1">
                      {order.customerName}
                    </Text>
                    <Text className="text-sm text-gray-600" numberOfLines={1}>
                      {order.items[0].name}
                      {order.items.length > 1 && ` 等 ${order.items.length} 項`}
                    </Text>
                  </View>
                  <View className="bg-error-light px-2.5 py-1 rounded-lg border border-error/20">
                    <Text className="text-xs font-bold text-error-dark">
                      今天
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-neutral-100">
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-700">
                      {order.pickupTime}
                    </Text>
                  </View>
                  <Text className="text-2xl font-bold text-primary-500">
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
