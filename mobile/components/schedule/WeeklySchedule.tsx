import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
      if (d !== day && d !== 'sunday') { // 預設不複製到週日
        onDayScheduleChange(d, { ...sourceSchedule });
      }
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>每週排班設定</Text>
      <Text style={styles.subtitle}>設定每天的營業時間</Text>

      {weekdays.map((day) => {
        const schedule = weeklySchedule[day];
        const isExpanded = expandedDay === day;

        return (
          <View key={day} style={styles.dayCard}>
            {/* 標題列 */}
            <TouchableOpacity
              style={styles.dayHeader}
              onPress={() => handleExpandDay(day)}
              activeOpacity={0.7}
            >
              <View style={styles.dayHeaderLeft}>
                <Text style={styles.dayLabel}>{getWeekdayLabel(day)}</Text>
                {schedule.enabled && (
                  <Text style={styles.dayTime}>
                    {schedule.openTime} - {schedule.closeTime}
                  </Text>
                )}
                {!schedule.enabled && (
                  <Text style={styles.dayClosed}>休息</Text>
                )}
              </View>
              <View style={styles.dayHeaderRight}>
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
              <View style={styles.dayContent}>
                <TimeSlotPicker
                  openTime={schedule.openTime}
                  closeTime={schedule.closeTime}
                  onChange={(open, close) => handleTimeChange(day, open, close)}
                />

                {/* 複製到其他日子 */}
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopyToAll(day)}
                >
                  <Text style={styles.copyButtonText}>複製到其他工作日</Text>
                </TouchableOpacity>

                {/* 預約制：顯示時段數量 */}
                {businessType === 'appointment' && (
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotInfoText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  dayTime: {
    fontSize: 14,
    color: '#10B981',
  },
  dayClosed: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  copyButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  slotInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
  },
  slotInfoText: {
    fontSize: 13,
    color: '#0369A1',
    textAlign: 'center',
  },
});

