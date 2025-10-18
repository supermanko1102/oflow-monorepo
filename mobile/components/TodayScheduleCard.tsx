import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Schedule } from '@/types/schedule';
import {
  isBusinessDay,
  getBusinessHours,
  getBusinessStatus,
  getAvailableSlots,
  getAllSlots,
} from '@/utils/scheduleHelpers';
import { format } from 'date-fns';

interface TodayScheduleCardProps {
  schedule: Schedule | null;
}

/**
 * 今日排班卡片
 * 
 * 功能：
 * - 顯示今日營業狀態
 * - 取貨制：顯示營業時間
 * - 預約制：顯示可預約時段數
 * - 點擊進入排班設定
 */
export function TodayScheduleCard({ schedule }: TodayScheduleCardProps) {
  const router = useRouter();
  const today = format(new Date(), 'yyyy-MM-dd');

  if (!schedule) {
    return (
      <Card className="mx-4 bg-white">
        <Card.Content className="p-4 flex-row items-center">
          <View className="mr-4">
            <Text className="text-3xl">📅</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 mb-1">尚未設定排班</Text>
            <Text className="text-sm text-gray-600">點擊設定營業時間</Text>
          </View>
          <TouchableOpacity
            className="bg-green-50 px-4 py-2 rounded-lg"
            onPress={() => router.push('/(main)/schedule')}
          >
            <Text className="text-sm font-semibold text-line-green">設定</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  }

  const isBusiness = isBusinessDay(today, schedule);
  const businessHours = getBusinessHours(today, schedule);
  const businessStatus = getBusinessStatus(today, schedule);

  const getStatusColor = () => {
    if (!isBusiness) return 'text-gray-500';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!isBusiness) return '⚪';
    return '🟢';
  };

  return (
    <TouchableOpacity
      className="mb-4"
      onPress={() => router.push('/(main)/schedule')}
      activeOpacity={0.7}
    >
      <Card className="mx-4 bg-white">
        <Card.Content className="p-4 flex-row items-center">
          <View className="mr-4">
            <Text className="text-3xl">{getStatusIcon()}</Text>
          </View>
          
          <View className="flex-1">
            <Text className={`text-base font-bold mb-1 ${getStatusColor()}`}>
              {businessStatus}
            </Text>
            
            {isBusiness && businessHours && (
              <Text className="text-sm text-gray-600">
                {businessHours.open} - {businessHours.close}
              </Text>
            )}

            {isBusiness && schedule.businessType === 'appointment' && (
              <View className="mt-1.5 bg-green-50 px-2.5 py-1 rounded-lg self-start">
                <Text className="text-xs text-green-600 font-semibold">
                  可預約：{getAvailableSlots(today, schedule).length}/
                  {getAllSlots(today, schedule).length} 時段
                </Text>
              </View>
            )}

            {!isBusiness && (
              <Text className="text-sm text-gray-600">今天休息</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
