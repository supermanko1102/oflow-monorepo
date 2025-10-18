import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Schedule, TimeSlot } from '@/types/schedule';
import { getAllSlots } from '@/utils/scheduleHelpers';

interface TimeSlotGridProps {
  date: string; // YYYY-MM-DD
  schedule: Schedule;
  onSlotPress?: (slot: TimeSlot) => void;
}

/**
 * 時段網格組件
 * 
 * 功能：
 * - 顯示所有時段
 * - 區分已預約/可預約狀態
 * - 支援點擊時段查看詳情
 */
export function TimeSlotGrid({ date, schedule, onSlotPress }: TimeSlotGridProps) {
  if (schedule.businessType !== 'appointment') {
    return null;
  }

  const slots = getAllSlots(date, schedule);

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>今日無可預約時段</Text>
      </View>
    );
  }

  const availableSlots = slots.filter((s) => !s.booked).length;
  const totalSlots = slots.length;

  return (
    <View style={styles.container}>
      {/* 統計資訊 */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{availableSlots}</Text>
          <Text style={styles.statLabel}>可預約</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6B7280' }]}>
            {totalSlots - availableSlots}
          </Text>
          <Text style={styles.statLabel}>已預約</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSlots}</Text>
          <Text style={styles.statLabel}>總共</Text>
        </View>
      </View>

      {/* 時段網格 */}
      <ScrollView
        style={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        {slots.map((slot, index) => (
          <TimeSlotCard
            key={`${slot.start}-${slot.end}`}
            slot={slot}
            onPress={() => onSlotPress?.(slot)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface TimeSlotCardProps {
  slot: TimeSlot;
  onPress: () => void;
}

function TimeSlotCard({ slot, onPress }: TimeSlotCardProps) {
  const isBooked = slot.booked;

  return (
    <TouchableOpacity
      style={[styles.slotCard, isBooked && styles.slotCardBooked]}
      onPress={onPress}
      disabled={!isBooked} // 只有已預約的時段可以點擊查看詳情
      activeOpacity={0.7}
    >
      <View style={styles.slotTimeContainer}>
        <Text style={[styles.slotTime, isBooked && styles.slotTimeBooked]}>
          {slot.start}
        </Text>
        <Text style={[styles.slotDivider, isBooked && styles.slotDividerBooked]}>
          -
        </Text>
        <Text style={[styles.slotTime, isBooked && styles.slotTimeBooked]}>
          {slot.end}
        </Text>
      </View>
      
      <View style={styles.slotStatusContainer}>
        {isBooked ? (
          <>
            <View style={styles.bookedDot} />
            <Text style={styles.slotStatusBooked}>已預約</Text>
          </>
        ) : (
          <>
            <View style={styles.availableDot} />
            <Text style={styles.slotStatusAvailable}>可預約</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsBar: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  gridContainer: {
    maxHeight: 400,
  },
  gridContent: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  slotCardBooked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  slotTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  slotTimeBooked: {
    color: '#9CA3AF',
  },
  slotDivider: {
    fontSize: 14,
    color: '#10B981',
  },
  slotDividerBooked: {
    color: '#D1D5DB',
  },
  slotStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  bookedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  slotStatusAvailable: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
  slotStatusBooked: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});

