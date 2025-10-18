import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Schedule } from '@/types/schedule';
import { isBusinessDay, getBusinessLevel } from '@/utils/scheduleHelpers';
import { format } from 'date-fns';

interface MonthCalendarProps {
  schedule: Schedule | null;
  onDayPress: (date: string) => void;
  selectedDate?: string;
  orderCounts?: Record<string, number>; // 日期 -> 訂單數量
}

/**
 * 月曆組件
 * 
 * 功能：
 * - 顯示整月日曆
 * - 標記營業日/休息日
 * - 顯示訂單數量
 * - 顯示忙碌程度（預約制）
 * - 支援點擊日期查看詳情
 */
export function MonthCalendar({
  schedule,
  onDayPress,
  selectedDate,
  orderCounts = {},
}: MonthCalendarProps) {
  // 生成標記
  const markedDates = useMemo(() => {
    if (!schedule) return {};

    const marks: Record<string, any> = {};
    const today = format(new Date(), 'yyyy-MM-dd');

    // 為接下來的 60 天生成標記
    for (let i = -30; i < 60; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = format(date, 'yyyy-MM-dd');

      const isBusiness = isBusinessDay(dateString, schedule);
      const orderCount = orderCounts[dateString] || 0;

      // 基本標記
      const mark: any = {
        marked: isBusiness || orderCount > 0,
      };

      // 營業日：綠色點
      if (isBusiness) {
        mark.dotColor = '#10B981';
      }

      // 休息日：灰色
      if (!isBusiness) {
        mark.disabled = true;
        mark.disableTouchEvent = false;
      }

      // 預約制：根據忙碌程度顯示不同顏色
      if (schedule.businessType === 'appointment' && isBusiness) {
        const busyLevel = getBusinessLevel(dateString, schedule);
        if (busyLevel >= 0.9) {
          mark.dotColor = '#EF4444'; // 紅色：已滿
        } else if (busyLevel >= 0.7) {
          mark.dotColor = '#F59E0B'; // 橘色：即將額滿
        } else {
          mark.dotColor = '#10B981'; // 綠色：可預約
        }
      }

      // 有訂單：顯示徽章
      if (orderCount > 0) {
        mark.marked = true;
        mark.customStyles = {
          container: {
            backgroundColor: isBusiness ? '#E0F2FE' : '#F3F4F6',
            borderRadius: 16,
          },
          text: {
            color: '#1E293B',
            fontWeight: '600',
          },
        };
      }

      // 選中的日期
      if (dateString === selectedDate) {
        mark.selected = true;
        mark.selectedColor = '#00B900';
      }

      // 今天：藍色邊框
      if (dateString === today && dateString !== selectedDate) {
        mark.customStyles = {
          ...mark.customStyles,
          container: {
            ...mark.customStyles?.container,
            borderWidth: 2,
            borderColor: '#3B82F6',
          },
        };
      }

      marks[dateString] = mark;
    }

    return marks;
  }, [schedule, selectedDate, orderCounts]);

  const handleDayPress = (day: DateData) => {
    onDayPress(day.dateString);
  };

  return (
    <View className="bg-white rounded-xl p-4">
      <Calendar
        markedDates={markedDates}
        onDayPress={handleDayPress}
        markingType="custom"
        theme={{
          backgroundColor: '#FFFFFF',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: '#6B7280',
          selectedDayBackgroundColor: '#00B900',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#3B82F6',
          dayTextColor: '#1E293B',
          textDisabledColor: '#D1D5DB',
          dotColor: '#00B900',
          selectedDotColor: '#FFFFFF',
          arrowColor: '#00B900',
          monthTextColor: '#1E293B',
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        className="rounded-xl"
        enableSwipeMonths
      />

      {/* 圖例 */}
      <View className="flex-row flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
        {schedule?.businessType === 'pickup' && (
          <>
            <LegendItem color="#10B981" label="營業日" />
            <LegendItem color="#D1D5DB" label="休息日" />
          </>
        )}
        {schedule?.businessType === 'appointment' && (
          <>
            <LegendItem color="#10B981" label="可預約" />
            <LegendItem color="#F59E0B" label="即將額滿" />
            <LegendItem color="#EF4444" label="已額滿" />
            <LegendItem color="#D1D5DB" label="休息日" />
          </>
        )}
      </View>
    </View>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-gray-600">{label}</Text>
    </View>
  );
}
