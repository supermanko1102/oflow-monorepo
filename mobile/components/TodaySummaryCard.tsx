import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { Card } from "react-native-paper";

interface TodaySummaryCardProps {
  orderCount: number;
  totalRevenue: number;
}

export function TodaySummaryCard({
  orderCount,
  totalRevenue,
}: TodaySummaryCardProps) {
  return (
    <Card className="mx-4 mt-4 mb-3 ">
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
            <Text className="text-xs text-gray-600 mt-1">筆訂單</Text>
          </View>

          {/* 分隔線 */}
          <View className="w-px h-16 bg-gray-200" />

          {/* 總營收 */}
          <View className="flex-1 items-center">
            <MaterialCommunityIcons name="cash" size={28} color="#00B900" />
            <Text className="text-2xl font-bold text-line-green mt-2">
              ${totalRevenue.toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">總營收</Text>
          </View>

          {/* 分隔線 */}
          <View className="w-px h-16 bg-gray-200" />
        </View>
      </Card.Content>
    </Card>
  );
}
