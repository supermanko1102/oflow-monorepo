import React from 'react';
import { View, Text, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReminderCard } from '@/components/ReminderCard';
import { EmptyState } from '@/components/EmptyState';
import { mockReminders } from '@/data/mockReminders';
import { Reminder } from '@/types/order';
import { SHADOWS } from '@/constants/design';

interface ReminderSection {
  title: string;
  data: Reminder[];
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  
  // Group reminders by type
  const todayReminders = mockReminders.filter(r => r.reminderType === 'today');
  const threeDaysReminders = mockReminders.filter(r => r.reminderType === '3days');
  const sevenDaysReminders = mockReminders.filter(r => r.reminderType === '7days');

  const sections: ReminderSection[] = [
    { title: '今天', data: todayReminders },
    { title: '3 天內', data: threeDaysReminders },
    { title: '7 天內', data: sevenDaysReminders },
  ].filter(section => section.data.length > 0);

  const unreadCount = mockReminders.filter(r => !r.isRead).length;

  if (mockReminders.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <View
          className="pb-5 px-6 bg-white border-b border-gray-100"
          style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
        >
          <Text className="text-4xl font-black text-gray-900">
            提醒通知
          </Text>
        </View>
        <EmptyState
          title="沒有提醒"
          description="當有重要訂單需要注意時，會顯示在這裡"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="pb-5 px-6 bg-white border-b border-gray-100"
        style={[SHADOWS.soft, { paddingTop: insets.top + 16 }]}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-4xl font-black text-gray-900">
            提醒通知
          </Text>
          {unreadCount > 0 && (
            <View className="bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200">
              <Text className="text-gray-700 text-xs font-semibold">
                {unreadCount} 則未讀
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Reminders List */}
      <SectionList
        sections={sections}
        renderItem={({ item }) => <ReminderCard reminder={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <View className="bg-gray-100 px-4 py-2">
            <Text className="text-sm font-semibold text-gray-700">
              {title}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        stickySectionHeadersEnabled={true}
      />
    </View>
  );
}

