import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { Card } from "react-native-paper";
import type { TimeRange, PaymentStats } from "@/types/order";
import { TIME_RANGE_LABELS, PAYMENT_METHOD_LABELS } from "@/types/order";

interface TodaySummaryCardProps {
  orderCount: number;
  totalRevenue: number;
  timeRange: TimeRange;
  paymentStats?: PaymentStats;
}

export function TodaySummaryCard({
  orderCount,
  totalRevenue,
  timeRange,
  paymentStats,
}: TodaySummaryCardProps) {
  return (
    <Card className="mx-4 mt-4 mb-3">
      <Card.Content className="p-4">
        {/* 時間範圍標題 */}
        <View className="mb-3">
          <Text className="text-sm font-semibold text-gray-700 text-center">
            {TIME_RANGE_LABELS[timeRange]}營收統計
          </Text>
        </View>

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
        </View>

        {/* 付款方式統計（如果有數據） */}
        {paymentStats && (
          <View className="mt-4 pt-4 border-t border-gray-200">
            <Text className="text-xs text-gray-500 text-center mb-2">
              付款方式明細
            </Text>
            <View className="flex-row justify-around">
              {(Object.entries(paymentStats) as [keyof PaymentStats, number][]).map(
                ([method, amount]) => (
                  <View key={method} className="items-center">
                    <Text className="text-xs text-gray-600">
                      {PAYMENT_METHOD_LABELS[method]}
                    </Text>
                    <Text className="text-sm font-semibold text-gray-900 mt-1">
                      ${amount.toLocaleString()}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}
