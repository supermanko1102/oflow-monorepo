import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { Order } from '@/types/order';
import { StatusBadge } from './StatusBadge';
import { useRouter } from 'expo-router';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const itemsSummary = order.items.length === 1 
    ? order.items[0].name 
    : `${order.items[0].name} 等 ${order.items.length} 項`;

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.7}
    >
      <Card className="mb-3 mx-4">
        <Card.Content className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {order.customerName}
              </Text>
              <Text className="text-sm text-gray-600">
                {itemsSummary}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <StatusBadge type="source" value={order.source} />
              <StatusBadge type="status" value={order.status} />
            </View>
          </View>
          
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-600 mr-4">
                📅 {formatDate(order.pickupDate)} {order.pickupTime}
              </Text>
            </View>
            <Text className="text-lg font-bold text-line-green">
              ${order.totalAmount}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

