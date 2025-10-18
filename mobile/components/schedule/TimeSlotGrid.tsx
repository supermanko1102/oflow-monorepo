import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
      <View className="py-8 items-center">
        <Text className="text-sm text-gray-500">今日無可預約時段</Text>
      </View>
    );
  }

  const availableSlots = slots.filter((s) => !s.booked).length;
  const totalSlots = slots.length;

  return (
    <View className="bg-white rounded-xl p-4 border border-gray-200">
      {/* 統計資訊 */}
      <View className="flex-row mb-4 pb-4 border-b border-gray-200">
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-green-600">{availableSlots}</Text>
          <Text className="text-xs text-gray-600">可預約</Text>
        </View>
        <View className="w-px bg-gray-200" />
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-gray-600">{totalSlots - availableSlots}</Text>
          <Text className="text-xs text-gray-600">已預約</Text>
        </View>
        <View className="w-px bg-gray-200" />
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-gray-900">{totalSlots}</Text>
          <Text className="text-xs text-gray-600">總共</Text>
        </View>
      </View>

      {/* 時段網格 */}
      <ScrollView
        className="max-h-96"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
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
      className={`flex-row items-center justify-between p-3.5 rounded-lg border-2 ${
        isBooked ? 'bg-white border-gray-200' : 'bg-gray-50 border-green-600'
      }`}
      onPress={onPress}
      disabled={!isBooked}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center gap-1.5">
        <Text className={`text-base font-semibold ${isBooked ? 'text-gray-400' : 'text-green-600'}`}>
          {slot.start}
        </Text>
        <Text className={`text-sm ${isBooked ? 'text-gray-300' : 'text-green-500'}`}>-</Text>
        <Text className={`text-base font-semibold ${isBooked ? 'text-gray-400' : 'text-green-600'}`}>
          {slot.end}
        </Text>
      </View>
      
      <View className="flex-row items-center gap-1.5">
        <View className={`w-2 h-2 rounded-full ${isBooked ? 'bg-gray-300' : 'bg-green-600'}`} />
        <Text className={`text-xs font-medium ${isBooked ? 'text-gray-500' : 'text-green-600'}`}>
          {isBooked ? '已預約' : '可預約'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
