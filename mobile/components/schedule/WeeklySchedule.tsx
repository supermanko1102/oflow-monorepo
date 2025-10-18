import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Switch, IconButton } from 'react-native-paper';
import { Weekday, DaySchedule, AppointmentDaySchedule, BusinessType } from '@/types/schedule';
import { getWeekdayLabel, generateTimeSlots } from '@/utils/scheduleHelpers';
import { TimeSlotPicker } from './TimeSlotPicker';

interface WeeklyScheduleProps {
  businessType: BusinessType;
  weeklySchedule: Record<Weekday, DaySchedule | AppointmentDaySchedule>;
  onDayScheduleChange: (day: Weekday, schedule: DaySchedule | AppointmentDaySchedule) => void;
  slotDuration?: number; // 預約制使用
}

const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * 每週排班設定組件
 * 
 * 功能：
 * - 設定每日營業開關
 * - 設定營業時間
 * - 預約制：自動生成時段
 */
export function WeeklySchedule({
  businessType,
  weeklySchedule,
  onDayScheduleChange,
  slotDuration = 60,
}: WeeklyScheduleProps) {
  const [expandedDay, setExpandedDay] = useState<Weekday | null>(null);

  const handleToggleDay = (day: Weekday, enabled: boolean) => {
    const currentSchedule = weeklySchedule[day];
    const updatedSchedule = {
      ...currentSchedule,
      enabled,
    };
    onDayScheduleChange(day, updatedSchedule);
  };

  const handleTimeChange = (day: Weekday, openTime: string, closeTime: string) => {
    const currentSchedule = weeklySchedule[day];
    
    if (businessType === 'appointment') {
      // 預約制：重新生成時段
      const timeSlots = generateTimeSlots(openTime, closeTime, slotDuration);
      const updatedSchedule: AppointmentDaySchedule = {
        ...currentSchedule as AppointmentDaySchedule,
        openTime,
        closeTime,
        timeSlots,
      };
      onDayScheduleChange(day, updatedSchedule);
    } else {
      // 取貨制：只更新時間
      const updatedSchedule: DaySchedule = {
        ...currentSchedule,
        openTime,
        closeTime,
      };
      onDayScheduleChange(day, updatedSchedule);
    }
  };

  const handleExpandDay = (day: Weekday) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  const handleCopyToAll = (day: Weekday) => {
    const sourceSchedule = weeklySchedule[day];
    weekdays.forEach((d) => {
      if (d !== day && d !== 'sunday') {
        onDayScheduleChange(d, { ...sourceSchedule });
      }
    });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <Text className="text-lg font-bold text-gray-900 mb-1">每週排班設定</Text>
      <Text className="text-sm text-gray-600 mb-4">設定每天的營業時間</Text>

      {weekdays.map((day) => {
        const schedule = weeklySchedule[day];
        const isExpanded = expandedDay === day;

        return (
          <View key={day} className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden">
            {/* 標題列 */}
            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => handleExpandDay(day)}
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  {getWeekdayLabel(day)}
                </Text>
                {schedule.enabled && (
                  <Text className="text-sm text-green-600">
                    {schedule.openTime} - {schedule.closeTime}
                  </Text>
                )}
                {!schedule.enabled && (
                  <Text className="text-sm text-gray-500">休息</Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                <Switch
                  value={schedule.enabled}
                  onValueChange={(enabled) => handleToggleDay(day, enabled)}
                  color="#00B900"
                />
                <IconButton
                  icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  onPress={() => handleExpandDay(day)}
                />
              </View>
            </TouchableOpacity>

            {/* 展開內容 */}
            {isExpanded && schedule.enabled && (
              <View className="p-4 pt-0 border-t border-gray-100">
                <TimeSlotPicker
                  openTime={schedule.openTime}
                  closeTime={schedule.closeTime}
                  onChange={(open, close) => handleTimeChange(day, open, close)}
                />

                {/* 複製到其他日子 */}
                <TouchableOpacity
                  className="bg-gray-100 py-2.5 px-4 rounded-lg mt-3 items-center"
                  onPress={() => handleCopyToAll(day)}
                >
                  <Text className="text-sm text-gray-600 font-medium">複製到其他工作日</Text>
                </TouchableOpacity>

                {/* 預約制：顯示時段數量 */}
                {businessType === 'appointment' && (
                  <View className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <Text className="text-xs text-blue-700 text-center">
                      將自動生成 {(schedule as AppointmentDaySchedule).timeSlots.length} 個時段
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
