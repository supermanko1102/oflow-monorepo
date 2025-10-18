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
import { SHADOWS } from '@/constants/design';
import { CheckCircleIcon, CloseCircleIcon } from '@/components/icons';

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
      <Card className="mx-4 bg-white" style={SHADOWS.card}>
        <Card.Content className="p-5 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-4">
            <CloseCircleIcon size={24} color="#9CA3AF" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-1">尚未設定排班</Text>
            <Text className="text-sm text-gray-600">點擊設定營業時間</Text>
          </View>
          <TouchableOpacity
            className="bg-primary-100 px-4 py-2.5 rounded-xl"
            onPress={() => router.push('/(main)/schedule')}
          >
            <Text className="text-sm font-bold text-primary-600">設定</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  }

  const isBusiness = isBusinessDay(today, schedule);
  const businessHours = getBusinessHours(today, schedule);
  const businessStatus = getBusinessStatus(today, schedule);

  const getStatusConfig = () => {
    if (!isBusiness) return {
      textColor: 'text-gray-600',
      iconColor: '#9CA3AF',
      IconComponent: CloseCircleIcon,
    };
    return {
      textColor: 'text-success',
      iconColor: '#10B981',
      IconComponent: CheckCircleIcon,
    };
  };

  const statusConfig = getStatusConfig();

  // 計算可用時段（預約制）
  let availableInfo = null;
  if (schedule.businessType === 'appointment' && isBusiness) {
    const allSlots = getAllSlots(today, schedule);
    const availableSlots = getAvailableSlots(today, schedule);
    availableInfo = {
      available: availableSlots.length,
      total: allSlots.length,
      percentage: allSlots.length > 0 ? (availableSlots.length / allSlots.length) * 100 : 0,
    };
  }

  return (
    <TouchableOpacity
      className="mb-4"
      onPress={() => router.push('/(main)/schedule')}
      activeOpacity={0.7}
    >
      <Card className="mx-4 bg-white" style={SHADOWS.card}>
        <Card.Content className="p-5 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-4">
            <statusConfig.IconComponent size={24} color={statusConfig.iconColor} />
          </View>
          
          <View className="flex-1">
            <Text className={`text-lg font-bold ${statusConfig.textColor} mb-1`}>
              {businessStatus}
            </Text>
            
            {isBusiness ? (
              <View>
                <Text className="text-sm text-gray-600">
                  {businessHours.openTime} - {businessHours.closeTime}
                </Text>
                
                {/* 預約制：顯示可用時段 */}
                {availableInfo && (
                  <View className="flex-row items-center mt-2">
                    <View className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden mr-2">
                      <View 
                        className="h-full bg-success rounded-full"
                        style={{ width: `${availableInfo.percentage}%` }}
                      />
                    </View>
                    <Text className="text-xs font-semibold text-success">
                      {availableInfo.available}/{availableInfo.total} 可預約
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-sm text-gray-600">今日休息</Text>
            )}
          </View>

          <Text className="text-2xl ml-2">→</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}
