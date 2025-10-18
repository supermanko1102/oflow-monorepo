import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimeSlotPickerProps {
  openTime: string;
  closeTime: string;
  onChange: (openTime: string, closeTime: string) => void;
}

/**
 * 時段選擇器組件
 * 
 * 功能：
 * - 選擇開始時間
 * - 選擇結束時間
 * - 自動驗證時間範圍
 */
export function TimeSlotPicker({ openTime, closeTime, onChange }: TimeSlotPickerProps) {
  const [showOpenPicker, setShowOpenPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);

  // 將時間字串轉換為 Date 對象
  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // 將 Date 對象轉換為時間字串
  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleOpenTimeChange = (event: any, selectedDate?: Date) => {
    setShowOpenPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newOpenTime = formatTime(selectedDate);
      onChange(newOpenTime, closeTime);
    }
  };

  const handleCloseTimeChange = (event: any, selectedDate?: Date) => {
    setShowClosePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newCloseTime = formatTime(selectedDate);
      onChange(openTime, newCloseTime);
    }
  };

  return (
    <View style={styles.container}>
      {/* 開始時間 */}
      <View style={styles.timeRow}>
        <Text style={styles.label}>開始時間</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowOpenPicker(true)}
        >
          <Text style={styles.timeText}>{openTime}</Text>
        </TouchableOpacity>
      </View>

      {showOpenPicker && (
        <DateTimePicker
          value={parseTime(openTime)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleOpenTimeChange}
          minuteInterval={30}
        />
      )}

      {/* 結束時間 */}
      <View style={styles.timeRow}>
        <Text style={styles.label}>結束時間</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowClosePicker(true)}
        >
          <Text style={styles.timeText}>{closeTime}</Text>
        </TouchableOpacity>
      </View>

      {showClosePicker && (
        <DateTimePicker
          value={parseTime(closeTime)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleCloseTimeChange}
          minuteInterval={30}
        />
      )}

      {/* 時段長度提示 */}
      <View style={styles.durationInfo}>
        <Text style={styles.durationText}>
          營業時數：{calculateDuration(openTime, closeTime)} 小時
        </Text>
      </View>
    </View>
  );
}

/**
 * 計算時段長度
 */
function calculateDuration(openTime: string, closeTime: string): string {
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  const durationMinutes = closeMinutes - openMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (minutes === 0) {
    return `${hours}`;
  }
  return `${hours}.${minutes === 30 ? '5' : '0'}`;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  timeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  durationInfo: {
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    marginTop: 4,
  },
  durationText: {
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
  },
});

