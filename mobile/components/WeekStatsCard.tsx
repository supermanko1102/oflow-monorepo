import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { WeeklyStats } from '@/data/mockStats';
import { SHADOWS } from '@/constants/design';

interface WeekStatsCardProps {
  stats: WeeklyStats;
}

export function WeekStatsCard({ stats }: WeekStatsCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Card className="mx-6 mb-6" style={SHADOWS.card}>
      <Card.Content className="p-5">
        <View className="flex-row items-center mb-4">
          <Text className="text-lg font-bold text-gray-900 flex-1">
            📈 本週表現
          </Text>
          <View className="bg-success-light px-3 py-1.5 rounded-full border border-success/20">
            <Text className="text-xs font-bold text-success">
              ↑ {stats.growthRate}%
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm font-medium text-gray-700">
              新訂單
            </Text>
            <View className="items-end">
              <Text className="text-base font-bold text-gray-900">
                {stats.weekOrderCount} 筆
              </Text>
              <Text className="text-xs text-success">
                比上週多 {stats.weekOrderCount - stats.lastWeekOrderCount} 筆
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm font-medium text-gray-700">
              本週營收
            </Text>
            <Text className="text-lg font-bold text-success">
              {formatCurrency(stats.weekRevenue)}
            </Text>
          </View>

          <View className="border-t border-neutral-100 pt-4 mt-2">
            <View className="p-4 rounded-xl bg-gray-50">
              <Text className="text-base font-bold text-gray-900 mb-2">
                AI 智能助理
              </Text>
              <Text className="text-sm text-gray-700 mb-1">
                自動處理了 <Text className="font-bold text-primary-600">{stats.aiAutoProcessed} 筆</Text> 訂單
              </Text>
              <Text className="text-xs text-gray-600">
                幫你省下 <Text className="font-bold text-success">{stats.timeSaved} 分鐘</Text> 的時間
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}
