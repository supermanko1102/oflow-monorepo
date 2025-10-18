import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      <Card style={styles.card} className="mx-4">
        <Card.Content style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📅</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>尚未設定排班</Text>
            <Text style={styles.description}>點擊設定營業時間</Text>
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(main)/schedule')}
          >
            <Text style={styles.actionText}>設定</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  }

  const isBusiness = isBusinessDay(today, schedule);
  const businessHours = getBusinessHours(today, schedule);
  const businessStatus = getBusinessStatus(today, schedule);

  const getStatusColor = () => {
    if (!isBusiness) return '#9CA3AF';
    return '#10B981';
  };

  const getStatusIcon = () => {
    if (!isBusiness) return '⚪';
    return '🟢';
  };

  return (
    <TouchableOpacity
      style={styles.cardTouchable}
      onPress={() => router.push('/(main)/schedule')}
      activeOpacity={0.7}
    >
      <Card style={styles.card} className="mx-4">
        <Card.Content style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getStatusIcon()}</Text>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: getStatusColor() }]}>
              {businessStatus}
            </Text>
            
            {isBusiness && businessHours && (
              <Text style={styles.description}>
                {businessHours.open} - {businessHours.close}
              </Text>
            )}

            {isBusiness && schedule.businessType === 'appointment' && (
              <View style={styles.slotInfo}>
                <Text style={styles.slotText}>
                  可預約：{getAvailableSlots(today, schedule).length}/
                  {getAllSlots(today, schedule).length} 時段
                </Text>
              </View>
            )}

            {!isBusiness && (
              <Text style={styles.description}>今天休息</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardTouchable: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
  },
  slotInfo: {
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  slotText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B900',
  },
});

