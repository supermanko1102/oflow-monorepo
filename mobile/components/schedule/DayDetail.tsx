import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Schedule } from '@/types/schedule';
import {
  isBusinessDay,
  getBusinessHours,
  getBusinessStatus,
  getWeekdayFromDate,
  getWeekdayLabel,
} from '@/utils/scheduleHelpers';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TimeSlotGrid } from './TimeSlotGrid';

interface DayDetailProps {
  date: string; // YYYY-MM-DD
  schedule: Schedule | null;
  onClose?: () => void;
}

/**
 * 單日詳情組件
 * 
 * 功能：
 * - 顯示指定日期的營業狀態
 * - 取貨制：顯示營業時間
 * - 預約制：顯示所有時段和預約狀況
 */
export function DayDetail({ date, schedule }: DayDetailProps) {
  if (!schedule) {
    return (
      <View className="flex-1 bg-gray-50 p-4">
        <Text className="text-base text-gray-600 text-center mt-8">無排班資料</Text>
      </View>
    );
  }

  const isBusiness = isBusinessDay(date, schedule);
  const businessHours = getBusinessHours(date, schedule);
  const businessStatus = getBusinessStatus(date, schedule);
  const weekday = getWeekdayFromDate(date);
  const dateObj = parseISO(date);

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      {/* 日期標題 */}
      <View className="mb-4">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {format(dateObj, 'M月d日', { locale: zhTW })}
        </Text>
        <Text className="text-base text-gray-600">{getWeekdayLabel(weekday)}</Text>
      </View>

      {/* 營業狀態 */}
      <View
        className={`p-4 rounded-xl mb-4 border ${
          isBusiness ? 'bg-green-50 border-green-600' : 'bg-gray-100 border-gray-300'
        }`}
      >
        <Text
          className={`text-base font-semibold text-center ${
            isBusiness ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          {businessStatus}
        </Text>
      </View>

      {/* 營業時間 */}
      {isBusiness && businessHours && (
        <View className="bg-white p-4 rounded-xl mb-4 border border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">營業時間</Text>
            <Text className="text-base font-semibold text-gray-900">
              {businessHours.open} - {businessHours.close}
            </Text>
          </View>
        </View>
      )}

      {/* 預約制：時段詳情 */}
      {isBusiness && schedule.businessType === 'appointment' && (
        <View className="mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">預約時段</Text>
          <TimeSlotGrid
            date={date}
            schedule={schedule}
            onSlotPress={(slot) => {
              console.log('Slot pressed:', slot);
            }}
          />
        </View>
      )}

      {/* 特殊日期說明 */}
      {schedule.specialDates.find((sd) => sd.date === date)?.reason && (
        <View className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <Text className="text-xs font-semibold text-amber-900 mb-1 uppercase">備註</Text>
          <Text className="text-sm text-amber-800">
            {schedule.specialDates.find((sd) => sd.date === date)?.reason}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
