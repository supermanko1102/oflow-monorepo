/**
 * 今日概覽卡片（合併組件）
 * 整合：今日排班 + 今日數據 + 今日待辦
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/native/Card';
import { CheckCircleIcon, CloseCircleIcon } from '@/components/icons';
import { Schedule } from '@/types/schedule';
import { DailyStats } from '@/data/mockStats';
import { isBusinessDay, getBusinessHours } from '@/utils/scheduleHelpers';
import { format } from 'date-fns';

interface TodayOverviewCardProps {
  schedule: Schedule | null;
  stats: DailyStats;
  taskCount: number;
}

export function TodayOverviewCard({ schedule, stats, taskCount }: TodayOverviewCardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const isOpen = schedule ? isBusinessDay(today, schedule) : false;
  const businessHours = schedule ? getBusinessHours(today, schedule) : null;
  
  const formatCurrency = (amount: number) => {
    return amount >= 1000 
      ? `$${(amount / 1000).toFixed(1)}K`
      : `$${amount}`;
  };
  
  return (
    <Card className="mx-6 mt-4">
      {/* 營業狀態 */}
      <View className="flex-row items-center mb-4 pb-4 border-b border-gray-100">
        <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
          {isOpen ? (
            <CheckCircleIcon size={20} color="#10B981" />
          ) : (
            <CloseCircleIcon size={20} color="#9CA3AF" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {isOpen ? '營業中' : '休息'}
          </Text>
          <Text className="text-sm text-gray-600">
            {isOpen && businessHours 
              ? `${businessHours.openTime} - ${businessHours.closeTime}` 
              : '今日休息'}
          </Text>
        </View>
      </View>

      {/* 今日數據（精簡版） */}
      <View className="flex-row justify-around">
        <View className="items-center">
          <Text className="text-3xl font-bold text-gray-900">{stats.todayOrderCount}</Text>
          <Text className="text-xs font-semibold text-gray-600 mt-1">訂單</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-line-green">
            {formatCurrency(stats.todayRevenue)}
          </Text>
          <Text className="text-xs font-semibold text-gray-600 mt-1">營收</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-gray-900">{taskCount}</Text>
          <Text className="text-xs font-semibold text-gray-600 mt-1">待處理</Text>
        </View>
      </View>
    </Card>
  );
}

