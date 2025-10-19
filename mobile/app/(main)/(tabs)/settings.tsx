import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { List, Divider, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useToast } from '@/hooks/useToast';
import * as NotificationService from '@/utils/notificationService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);

  const [notificationSettings, setNotificationSettings] = useState<NotificationService.NotificationSettings>({
    enabled: true,
    hour: 8,
    minute: 0,
  });

  // 載入通知設定
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const settings = await NotificationService.getNotificationSettings();
    setNotificationSettings(settings);
  };

  const handleLogout = () => {
    logout();
  };

  // 處理通知開關
  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    
    if (value) {
      // 請求權限
      const granted = await NotificationService.requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          '需要通知權限',
          '請到系統設定中開啟通知權限',
          [{ text: '確定' }]
        );
        setNotificationsEnabled(false);
        return;
      }
      toast.success('已開啟通知');
    } else {
      await NotificationService.cancelAllNotifications();
      toast.success('已關閉通知');
    }

    // 儲存設定
    await NotificationService.saveNotificationSettings({
      ...notificationSettings,
      enabled: value,
    });
  };

  // 處理通知時間設定
  const handleSetNotificationTime = () => {
    Alert.alert(
      '設定每日通知時間',
      `目前設定：每天 ${notificationSettings.hour.toString().padStart(2, '0')}:${notificationSettings.minute.toString().padStart(2, '0')}`,
      [
        {
          text: '早上 7:00',
          onPress: () => saveNotificationTime(7, 0),
        },
        {
          text: '早上 8:00',
          onPress: () => saveNotificationTime(8, 0),
        },
        {
          text: '早上 9:00',
          onPress: () => saveNotificationTime(9, 0),
        },
        {
          text: '取消',
          style: 'cancel',
        },
      ]
    );
  };

  const saveNotificationTime = async (hour: number, minute: number) => {
    const newSettings = {
      ...notificationSettings,
      hour,
      minute,
    };
    setNotificationSettings(newSettings);
    await NotificationService.saveNotificationSettings(newSettings);
    toast.success(`已設定為每天 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  };

  // 發送測試通知
  const handleTestNotification = async () => {
    await NotificationService.sendTestNotification();
    toast.success('測試通知已發送');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View 
        className="bg-white pb-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-4xl font-black text-gray-900">
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


      {/* Notification Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>通知設定</List.Subheader>
          <List.Item
            title="啟用每日通知"
            description="每天早上接收今日訂單摘要"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: '#00B900' }}
              />
            )}
          />
          <Divider />
          <List.Item
            title="通知時間"
            description={`每天 ${notificationSettings.hour.toString().padStart(2, '0')}:${notificationSettings.minute.toString().padStart(2, '0')}`}
            left={props => <List.Icon {...props} icon="clock-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSetNotificationTime}
            disabled={!notificationsEnabled}
          />
          <Divider />
          <List.Item
            title="測試通知"
            description="發送測試通知確認是否正常"
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleTestNotification}
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

