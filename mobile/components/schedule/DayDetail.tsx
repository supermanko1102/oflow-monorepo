import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
      <View style={styles.container}>
        <Text style={styles.errorText}>無排班資料</Text>
      </View>
    );
  }

  const isBusiness = isBusinessDay(date, schedule);
  const businessHours = getBusinessHours(date, schedule);
  const businessStatus = getBusinessStatus(date, schedule);
  const weekday = getWeekdayFromDate(date);
  const dateObj = parseISO(date);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 日期標題 */}
      <View style={styles.header}>
        <Text style={styles.dateText}>
          {format(dateObj, 'M月d日', { locale: zhTW })}
        </Text>
        <Text style={styles.weekdayText}>
          {getWeekdayLabel(weekday)}
        </Text>
      </View>

      {/* 營業狀態 */}
      <View style={[styles.statusCard, !isBusiness && styles.statusCardClosed]}>
        <Text style={[styles.statusText, !isBusiness && styles.statusTextClosed]}>
          {businessStatus}
        </Text>
      </View>

      {/* 營業時間 */}
      {isBusiness && businessHours && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>營業時間</Text>
            <Text style={styles.infoValue}>
              {businessHours.open} - {businessHours.close}
            </Text>
          </View>
        </View>
      )}

      {/* 預約制：時段詳情 */}
      {isBusiness && schedule.businessType === 'appointment' && (
        <View style={styles.slotsSection}>
          <Text style={styles.sectionTitle}>預約時段</Text>
          <TimeSlotGrid
            date={date}
            schedule={schedule}
            onSlotPress={(slot) => {
              // 可以在這裡處理時段點擊，例如顯示訂單詳情
              console.log('Slot pressed:', slot);
            }}
          />
        </View>
      )}

      {/* 特殊日期說明 */}
      {schedule.specialDates.find((sd) => sd.date === date)?.reason && (
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>備註</Text>
          <Text style={styles.noteText}>
            {schedule.specialDates.find((sd) => sd.date === date)?.reason}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusCardClosed: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  statusTextClosed: {
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  slotsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 14,
    color: '#78350F',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 32,
  },
});

