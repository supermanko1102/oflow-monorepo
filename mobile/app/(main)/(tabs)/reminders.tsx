import React from 'react';
import { View, Text, SectionList } from 'react-native';
import { ReminderCard } from '@/components/ReminderCard';
import { EmptyState } from '@/components/EmptyState';
import { mockReminders } from '@/data/mockReminders';
import { Reminder } from '@/types/order';

interface ReminderSection {
  title: string;
  data: Reminder[];
}

export default function RemindersScreen() {
  // Group reminders by type
  const todayReminders = mockReminders.filter(r => r.reminderType === 'today');
  const threeDaysReminders = mockReminders.filter(r => r.reminderType === '3days');
  const sevenDaysReminders = mockReminders.filter(r => r.reminderType === '7days');

  const sections: ReminderSection[] = [
    { title: '🔴 今天', data: todayReminders },
    { title: '🟡 3 天內', data: threeDaysReminders },
    { title: '🟢 7 天內', data: sevenDaysReminders },
  ].filter(section => section.data.length > 0);

  const unreadCount = mockReminders.filter(r => !r.isRead).length;

  if (mockReminders.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">
            提醒通知
          </Text>
        </View>
        <EmptyState type="noReminders" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900">
            提醒通知
          </Text>
          {unreadCount > 0 && (
            <View className="bg-line-green rounded-full px-3 py-1">
              <Text className="text-white text-sm font-semibold">
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

