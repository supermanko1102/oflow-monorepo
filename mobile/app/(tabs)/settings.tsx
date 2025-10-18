import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { List, Divider, Button } from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const autoMode = useSettingsStore((state) => state.autoMode);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const reminderToday = useSettingsStore((state) => state.reminderToday);
  const reminder3Days = useSettingsStore((state) => state.reminder3Days);
  const reminder7Days = useSettingsStore((state) => state.reminder7Days);
  const setAutoMode = useSettingsStore((state) => state.setAutoMode);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const setReminderToday = useSettingsStore((state) => state.setReminderToday);
  const setReminder3Days = useSettingsStore((state) => state.setReminder3Days);
  const setReminder7Days = useSettingsStore((state) => state.setReminder7Days);

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">
          設置
        </Text>
      </View>

      {/* Account Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>帳號資訊</List.Subheader>
          <List.Item
            title="LINE 帳號"
            description="已連接"
            left={props => <List.Icon {...props} icon="account" />}
            right={() => (
              <View className="justify-center">
                <Text className="text-line-green font-medium">已連接</Text>
              </View>
            )}
          />
        </List.Section>
      </View>

      {/* Order Mode Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>接單模式</List.Subheader>
          <List.Item
            title="全自動模式"
            description={autoMode ? "AI 自動接單並建立訂單" : "需要手動確認才會建立訂單"}
            left={props => <List.Icon {...props} icon="robot" />}
            right={() => (
              <Switch
                value={autoMode}
                onValueChange={setAutoMode}
                trackColor={{ true: '#00B900' }}
              />
            )}
          />
          <Divider />
          <List.Item
            title="排班設定"
            description="設定可接單的時間"
            left={props => <List.Icon {...props} icon="calendar" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>
      </View>

      {/* Notification Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>通知設定</List.Subheader>
          <List.Item
            title="啟用通知"
            description="接收訂單提醒通知"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: '#00B900' }}
              />
            )}
          />
          <Divider />
          <List.Item
            title="當天提醒"
            description="訂單當天早上提醒"
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={() => (
              <Switch
                value={reminderToday}
                onValueChange={setReminderToday}
                disabled={!notificationsEnabled}
                trackColor={{ true: '#00B900' }}
              />
            )}
            disabled={!notificationsEnabled}
          />
          <Divider />
          <List.Item
            title="3 天前提醒"
            description="提前 3 天提醒準備"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={() => (
              <Switch
                value={reminder3Days}
                onValueChange={setReminder3Days}
                disabled={!notificationsEnabled}
                trackColor={{ true: '#00B900' }}
              />
            )}
            disabled={!notificationsEnabled}
          />
          <Divider />
          <List.Item
            title="7 天前提醒"
            description="提前 7 天規劃行程"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={() => (
              <Switch
                value={reminder7Days}
                onValueChange={setReminder7Days}
                disabled={!notificationsEnabled}
                trackColor={{ true: '#00B900' }}
              />
            )}
            disabled={!notificationsEnabled}
          />
        </List.Section>
      </View>

      {/* About Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>關於</List.Subheader>
          <List.Item
            title="應用版本"
            description="v1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="使用說明"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="隱私政策"
            left={props => <List.Icon {...props} icon="shield-check" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>
      </View>

      {/* Logout Button */}
      <View className="px-4 py-6">
        <Button
          mode="outlined"
          onPress={handleLogout}
          textColor="#EF4444"
          style={{ borderColor: '#EF4444' }}
        >
          登出
        </Button>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}

