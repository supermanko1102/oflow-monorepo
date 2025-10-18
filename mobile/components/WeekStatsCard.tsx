import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { WeeklyStats } from '@/data/mockStats';

interface WeekStatsCardProps {
  stats: WeeklyStats;
}

export function WeekStatsCard({ stats }: WeekStatsCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Card className="mx-4 mb-4">
      <Card.Content className="p-4">
        <View className="flex-row items-center mb-3">
          <Text className="text-lg font-semibold text-gray-900 flex-1">
            📈 本週表現
          </Text>
          <View className="bg-green-100 px-2 py-1 rounded-full">
            <Text className="text-xs font-semibold text-green-700">
              ↑ {stats.growthRate}%
            </Text>
          </View>
        </View>

        <View className="space-y-2">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-gray-700">
              新訂單
            </Text>
            <Text className="text-base font-semibold text-gray-900">
              {stats.weekOrderCount} 筆
              <Text className="text-xs text-gray-500"> (比上週多 {stats.weekOrderCount - stats.lastWeekOrderCount} 筆)</Text>
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-gray-700">
              本週營收
            </Text>
            <Text className="text-base font-semibold text-line-green">
              {formatCurrency(stats.weekRevenue)}
            </Text>
          </View>

          <View className="border-t border-gray-100 pt-3 mt-2">
            <View className="bg-blue-50/20 p-3 rounded-lg">
              <View className="flex-row items-center mb-2">
                <Text className="text-base mr-2">🤖</Text>
                <Text className="text-sm font-semibold text-blue-900">
                  AI 智能助理
                </Text>
              </View>
              <Text className="text-sm text-gray-700 mb-1">
                自動處理了 {stats.aiAutoProcessed} 筆訂單
              </Text>
              <Text className="text-xs text-gray-600">
                💰 幫你省下 <Text className="font-semibold text-line-green">{stats.timeSaved} 分鐘</Text>
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

