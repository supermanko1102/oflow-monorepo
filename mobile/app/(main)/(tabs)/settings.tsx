import { LineSettingsBottomSheet } from "@/components/settings/LineSettingsBottomSheet";
import { MembersBottomSheet } from "@/components/settings/MembersBottomSheet";
import { MoreMenuBottomSheet } from "@/components/settings/MoreMenuBottomSheet";
import { useTeams } from "@/hooks/queries/useTeams";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import * as NotificationService from "@/utils/notificationService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Divider, IconButton, List } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Auth store (client state) - 統一使用 AuthStore
  const userId = useAuthStore((state) => state.userId);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // React Query (server state)
  const { data: teams } = useTeams();

  // Settings store
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled
  );
  const setNotificationsEnabled = useSettingsStore(
    (state) => state.setNotificationsEnabled
  );
  const autoMode = useSettingsStore((state) => state.autoMode);
  const setAutoMode = useSettingsStore((state) => state.setAutoMode);

  // BottomSheet visibility state
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [lineSheetVisible, setLineSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationService.NotificationSettings>({
      enabled: true,
      hour: 8,
      minute: 0,
    });

  // 從 teams 中找到當前團隊
  const currentTeam = teams?.find((t) => t.team_id === currentTeamId);

  // 取得當前用戶在團隊中的角色
  const myRole = currentTeam?.role || "member";
  const canManageTeam = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  // 載入通知設定
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const settings = await NotificationService.getNotificationSettings();
    setNotificationSettings(settings);
  };

  // 處理通知開關
  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);

    if (value) {
      // 請求權限
      const granted =
        await NotificationService.requestNotificationPermissions();
      if (!granted) {
        Alert.alert("需要通知權限", "請到系統設定中開啟通知權限", [
          { text: "確定" },
        ]);
        setNotificationsEnabled(false);
        return;
      }
      toast.success("已開啟通知");
    } else {
      await NotificationService.cancelAllNotifications();
      toast.success("已關閉通知");
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
      "設定每日通知時間",
      `目前設定：每天 ${notificationSettings.hour
        .toString()
        .padStart(2, "0")}:${notificationSettings.minute
        .toString()
        .padStart(2, "0")}`,
      [
        {
          text: "早上 7:00",
          onPress: () => saveNotificationTime(7, 0),
        },
        {
          text: "早上 8:00",
          onPress: () => saveNotificationTime(8, 0),
        },
        {
          text: "早上 9:00",
          onPress: () => saveNotificationTime(9, 0),
        },
        {
          text: "取消",
          style: "cancel",
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
    toast.success(
      `已設定為每天 ${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`
    );
  };

  // 發送測試通知
  const handleTestNotification = async () => {
    await NotificationService.sendTestNotification();
    toast.success("測試通知已發送");
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white pb-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-4xl font-black text-gray-900">設置</Text>
          <View className="flex-row items-center gap-1">
            {canManageTeam && (
              <>
                <IconButton
                  icon="account-group"
                  size={24}
                  onPress={() => setMembersSheetVisible(true)}
                />
                <IconButton
                  icon="message-text"
                  size={24}
                  onPress={() => setLineSheetVisible(true)}
                />
              </>
            )}
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={() => setMoreSheetVisible(true)}
            />
          </View>
        </View>
      </View>

      {/* Order Mode Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>接單模式</List.Subheader>

          {/* 全自動模式卡片 */}
          <View className="px-4 pb-4">
            <Card
              className={`border-2 ${
                autoMode
                  ? "border-line-green bg-white"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Card.Content className="p-4">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <MaterialCommunityIcons
                        name="robot"
                        size={24}
                        color={autoMode ? "#00B900" : "#6B7280"}
                      />
                      <Text
                        className={`text-lg font-bold ml-2 ${
                          autoMode ? "text-line-green" : "text-gray-900"
                        }`}
                      >
                        全自動模式
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-600 mb-2">
                      AI 自動回覆顧客並建立訂單
                    </Text>
                  </View>
                  <Switch
                    value={autoMode}
                    onValueChange={(value) => {
                      setAutoMode(value);
                      toast.success(
                        value ? "已切換至全自動模式" : "已切換至半自動模式"
                      );
                    }}
                    trackColor={{ true: "#00B900" }}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* 半自動模式卡片 */}
          <View className="px-4 pb-4">
            <Card
              className={`border-2 ${
                !autoMode
                  ? "border-line-green bg-white"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Card.Content className="p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <MaterialCommunityIcons
                        name="account-check"
                        size={24}
                        color={!autoMode ? "#00B900" : "#6B7280"}
                      />
                      <Text
                        className={`text-lg font-bold ml-2 ${
                          !autoMode ? "text-line-green" : "text-gray-900"
                        }`}
                      >
                        半自動模式
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-600 mb-2">
                      你手動確認後，AI 才會建立訂單
                    </Text>
                  </View>
                  <Switch
                    value={!autoMode}
                    onValueChange={(value) => {
                      setAutoMode(!value);
                      toast.success(
                        !value ? "已切換至全自動模式" : "已切換至半自動模式"
                      );
                    }}
                    trackColor={{ true: "#00B900" }}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        </List.Section>
      </View>

      {/* Notification Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>通知設定</List.Subheader>
          <List.Item
            title="啟用每日通知"
            description="每天早上接收今日訂單摘要"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: "#00B900" }}
              />
            )}
          />
          <Divider />
          <List.Item
            title="通知時間"
            description={`每天 ${notificationSettings.hour
              .toString()
              .padStart(2, "0")}:${notificationSettings.minute
              .toString()
              .padStart(2, "0")}`}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSetNotificationTime}
            disabled={!notificationsEnabled}
          />
          <Divider />
          <List.Item
            title="測試通知"
            description="發送測試通知確認是否正常"
            left={(props) => <List.Icon {...props} icon="bell-ring" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleTestNotification}
            disabled={!notificationsEnabled}
          />
        </List.Section>
      </View>

      <View className="h-8" />

      {/* BottomSheet 組件 */}
      {canManageTeam && currentTeamId && (
        <>
          <MembersBottomSheet
            visible={membersSheetVisible}
            onDismiss={() => setMembersSheetVisible(false)}
            teamId={currentTeamId}
            teamName={currentTeam?.team_name || ""}
            currentUserId={userId || ""}
            currentUserRole={myRole}
            isOwner={isOwner}
          />
          <LineSettingsBottomSheet
            visible={lineSheetVisible}
            onDismiss={() => setLineSheetVisible(false)}
            teamId={currentTeamId}
            currentChannelName={currentTeam?.line_channel_name}
          />
        </>
      )}
      <MoreMenuBottomSheet
        visible={moreSheetVisible}
        onDismiss={() => setMoreSheetVisible(false)}
        currentTeamId={currentTeamId}
        currentTeamName={currentTeam?.team_name || ""}
        isOwner={isOwner}
      />
    </ScrollView>
  );
}
