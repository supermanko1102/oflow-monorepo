import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TodaySummaryCardProps {
  orderCount: number;
  totalRevenue: number;
  firstPickupTime?: string;
}

export function TodaySummaryCard({ 
  orderCount, 
  totalRevenue, 
  firstPickupTime 
}: TodaySummaryCardProps) {
  return (
    <Card className="mx-4 mt-4 mb-3 bg-white">
      <Card.Content className="p-4">
        <View className="flex-row justify-between items-center">
          {/* 訂單數量 */}
          <View className="flex-1 items-center">
            <MaterialCommunityIcons 
              name="clipboard-text-outline" 
              size={28} 
              color="#6B7280" 
            />
            <Text className="text-2xl font-bold text-gray-900 mt-2">
              {orderCount}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              筆訂單
            </Text>
          </View>

          {/* 分隔線 */}
          <View className="w-px h-16 bg-gray-200" />

          {/* 總營收 */}
          <View className="flex-1 items-center">
            <MaterialCommunityIcons 
              name="cash" 
              size={28} 
              color="#00B900" 
            />
            <Text className="text-2xl font-bold text-line-green mt-2">
              ${totalRevenue.toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              總營收
            </Text>
          </View>

          {/* 分隔線 */}
          <View className="w-px h-16 bg-gray-200" />

          {/* 首筆取貨 */}
          <View className="flex-1 items-center">
            <MaterialCommunityIcons 
              name="clock-outline" 
              size={28} 
              color="#6B7280" 
            />
            <Text className="text-2xl font-bold text-gray-900 mt-2">
              {firstPickupTime || '--:--'}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              首筆取貨
            </Text>
          </View>
        </View>

        {/* 如果今天沒訂單，顯示鼓勵訊息 */}
        {orderCount === 0 && (
          <View className="mt-4 pt-4 border-t border-gray-100">
            <Text className="text-center text-gray-500 text-sm">
              🎉 今天沒有訂單，好好休息一下！
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

