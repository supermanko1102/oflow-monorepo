import { InviteCodeDialog } from "@/components/team/InviteCodeDialog";
import { MemberList } from "@/components/team/MemberList";
import { TeamSelector } from "@/components/team/TeamSelector";
import { queryKeys } from "@/hooks/queries/queryKeys";
import {
  useDeleteTeam,
  useInviteCode,
  useLeaveTeam,
  useTeamMembers,
  useTeams,
} from "@/hooks/queries/useTeams";
import { useToast } from "@/hooks/useToast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { updateLineSettings } from "@/services/teamService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import * as NotificationService from "@/utils/notificationService";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Divider, List, Modal, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  // Auth store (client state) - 統一使用 AuthStore
  const userId = useAuthStore((state) => state.userId);
  const userName = useAuthStore((state) => state.userName);
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const logout = useAuthStore((state) => state.logout);

  // React Query (server state)
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const {
    data: teamMembers,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useTeamMembers(currentTeamId || "", !!currentTeamId);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const { data: inviteCodeData, isLoading: inviteCodeLoading } = useInviteCode(
    currentTeamId || "",
    showInviteCode && !!currentTeamId
  );
  const leaveTeamMutation = useLeaveTeam();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const deleteTeamMutation = useDeleteTeam();

  // Settings store
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled
  );
  const setNotificationsEnabled = useSettingsStore(
    (state) => state.setNotificationsEnabled
  );

  // UI state
  const [teamSelectorVisible, setTeamSelectorVisible] = useState(false);
  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);
  const [lineSettingsExpanded, setLineSettingsExpanded] = useState(false);

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationService.NotificationSettings>({
      enabled: true,
      hour: 8,
      minute: 0,
    });

  // LINE 官方帳號設定狀態
  const [lineSettings, setLineSettings] = useState({
    channelId: "",
    channelSecret: "",
    accessToken: "",
    channelName: "",
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);

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

  // 團隊相關處理函數
  const handleSwitchTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    toast.success("已切換團隊");
  };

  const handleLeaveTeam = async () => {
    if (!currentTeamId) return;

    Alert.alert(
      "離開團隊",
      `確定要離開「${currentTeam?.team_name}」嗎？\n\n離開後將無法存取該團隊的訂單資料。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "離開",
          style: "destructive",
          onPress: async () => {
            try {
              // 使用 React Query mutation
              await leaveTeamMutation.mutateAsync(currentTeamId);

              toast.success("已離開團隊");

              // React Query 會自動 invalidate teams list
              // 等待 teams 重新載入後再導航
              setTimeout(() => {
                // 從 queryClient 取得最新的 teams
                const updatedTeams = queryClient.getQueryData(
                  queryKeys.teams.list()
                );
                if (
                  updatedTeams &&
                  Array.isArray(updatedTeams) &&
                  updatedTeams.length > 0
                ) {
                  handleSwitchTeam(updatedTeams[0].team_id);
                } else {
                  setCurrentTeamId(null);
                  router.replace("/(auth)/team-setup");
                }
              }, 500);
            } catch (error: any) {
              toast.error(error.message || "離開團隊失敗");
            }
          },
        },
      ]
    );
  };

  // 第一層：顯示警告對話框
  const handleDeleteTeamPress = () => {
    if (!currentTeamId || !currentTeam) return;

    Alert.alert(
      "⚠️ 刪除團隊",
      "刪除後會發生什麼？\n\n• 所有訂單、客戶資料將永久刪除\n• 此操作無法復原\n• 團隊成員將失去存取權限\n\n確定要繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "繼續",
          style: "destructive",
          onPress: () => setShowDeleteModal(true), // 第二層
        },
      ]
    );
  };

  // 第二層：輸入團隊名稱確認
  const handleConfirmDelete = async () => {
    if (!currentTeamId || !currentTeam) return;

    // 檢查輸入的團隊名稱是否正確
    if (deleteConfirmText !== currentTeam.team_name) {
      toast.error("團隊名稱不正確");
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync(currentTeamId);

      setShowDeleteModal(false);
      setDeleteConfirmText("");
      toast.success("團隊已永久刪除");

      // 清除當前團隊並導航
      setTimeout(() => {
        setCurrentTeamId(null);
        router.replace("/(auth)/team-setup");
      }, 500);
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const handleRegenerateInviteCode = () => {
    if (!currentTeamId) return;

    Alert.alert("重新生成邀請碼", "舊的邀請碼將立即失效，確定要繼續嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "確定",
        onPress: () => {
          // TODO: 實作 regenerateInviteCode Edge Function endpoint
          toast.error("重新生成邀請碼功能尚未實作");

          // 未來實作：
          // await regenerateInviteCodeMutation.mutateAsync(currentTeamId);
          // toast.success("已重新生成邀請碼");
        },
      },
    ]);
  };

  const handleLogout = async () => {
    // 1. 先呼叫 Zustand logout（會自動持久化）
    logout();

    // 2. 清除 Supabase session
    await supabase.auth.signOut();

    // 3. 清除 React Query cache
    queryClient.clear();

    // 4. Root Layout 會自動偵測 isLoggedIn = false 並導向 login
    // 不需要手動 router.replace()
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

  // 處理 LINE 官方帳號設定
  const handleUpdateLineSettings = async () => {
    if (!currentTeamId) return;

    if (
      !lineSettings.channelId ||
      !lineSettings.channelSecret ||
      !lineSettings.accessToken
    ) {
      toast.error("請填寫所有必要欄位");
      return;
    }

    try {
      setIsUpdatingLine(true);
      const response = await updateLineSettings({
        team_id: currentTeamId,
        line_channel_id: lineSettings.channelId,
        line_channel_secret: lineSettings.channelSecret,
        line_channel_access_token: lineSettings.accessToken,
        line_channel_name: lineSettings.channelName || undefined,
      });

      setWebhookUrl(response.webhook_url);
      toast.success("LINE 官方帳號設定已更新");

      // 刷新團隊資料
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });

      // 顯示 Webhook URL（完整顯示在 UI 中，用戶可以長按複製）
      Alert.alert(
        "設定成功",
        "LINE 官方帳號已成功連接！\n\n請查看下方的 Webhook URL 並設定到 LINE Developers Console。",
        [{ text: "確定" }]
      );
    } catch (error: any) {
      toast.error(error.message || "更新 LINE 設定失敗");
    } finally {
      setIsUpdatingLine(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      Alert.alert("Webhook URL", webhookUrl, [{ text: "確定" }]);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white pb-4 px-4 border-b border-gray-200"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-4xl font-black text-gray-900">設置</Text>
      </View>

      {/* Account Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>帳號資訊</List.Subheader>
          <List.Item
            title="LINE 帳號"
            description={userName || "已連接"}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={() => (
              <View className="justify-center">
                <Text className="text-line-green font-medium">已連接</Text>
              </View>
            )}
          />
        </List.Section>
      </View>

      {/* Team Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>團隊資訊</List.Subheader>
          <List.Item
            title="當前團隊"
            description={currentTeam?.team_name || "未選擇團隊"}
            left={(props) => <List.Icon {...props} icon="account-group" />}
            right={(props) =>
              teams && teams.length > 1 ? (
                <List.Icon {...props} icon="chevron-right" />
              ) : null
            }
            onPress={() =>
              teams && teams.length > 1 && setTeamSelectorVisible(true)
            }
          />
          <Divider />
          <List.Item
            title="我的角色"
            description={
              myRole === "owner"
                ? "擁有者"
                : myRole === "admin"
                ? "管理員"
                : "成員"
            }
            left={(props) => <List.Icon {...props} icon="shield-account" />}
          />
          {currentTeam?.line_channel_name && (
            <>
              <Divider />
              <List.Item
                title="LINE 官方帳號"
                description={currentTeam.line_channel_name}
                left={(props) => <List.Icon {...props} icon="link" />}
              />
            </>
          )}
        </List.Section>
      </View>

      {/* LINE Official Account Settings (Owner/Admin only) */}
      {canManageTeam && currentTeamId && (
        <View className="bg-white mt-4">
          <List.Section>
            <List.Subheader>LINE 官方帳號設定</List.Subheader>
            <List.Item
              title="更新 LINE 設定"
              description={
                currentTeam?.line_channel_name
                  ? `已連接：${currentTeam.line_channel_name}`
                  : "點擊以檢視設定"
              }
              left={(props) => <List.Icon {...props} icon="message-text" />}
              right={(props) => (
                <List.Icon
                  {...props}
                  icon={lineSettingsExpanded ? "chevron-up" : "chevron-down"}
                />
              )}
              onPress={() => setLineSettingsExpanded(!lineSettingsExpanded)}
            />
            {lineSettingsExpanded && (
              <View className="px-4 pb-4">
                <Text className="text-gray-600 text-sm mb-4">
                  更新或修改 LINE 官方帳號設定，確保系統正常接收顧客訊息
                </Text>

                <Text className="text-gray-700 font-semibold mb-2">
                  Channel ID
                </Text>
                <TextInput
                  value={lineSettings.channelId}
                  onChangeText={(text) =>
                    setLineSettings({ ...lineSettings, channelId: text })
                  }
                  placeholder="輸入 LINE Channel ID"
                  className="border border-gray-300 rounded px-3 py-2 mb-3"
                />

                <Text className="text-gray-700 font-semibold mb-2">
                  Channel Secret
                </Text>
                <TextInput
                  value={lineSettings.channelSecret}
                  onChangeText={(text) =>
                    setLineSettings({ ...lineSettings, channelSecret: text })
                  }
                  placeholder="輸入 LINE Channel Secret"
                  secureTextEntry
                  className="border border-gray-300 rounded px-3 py-2 mb-3"
                />

                <Text className="text-gray-700 font-semibold mb-2">
                  Channel Access Token
                </Text>
                <TextInput
                  value={lineSettings.accessToken}
                  onChangeText={(text) =>
                    setLineSettings({ ...lineSettings, accessToken: text })
                  }
                  placeholder="輸入 LINE Channel Access Token"
                  secureTextEntry
                  className="border border-gray-300 rounded px-3 py-2 mb-3"
                />

                <Button
                  mode="contained"
                  onPress={handleUpdateLineSettings}
                  loading={isUpdatingLine}
                  disabled={isUpdatingLine}
                  buttonColor="#00B900"
                  className="mb-2"
                >
                  更新設定
                </Button>

                {webhookUrl && (
                  <View className="mt-4 p-3 bg-gray-100 rounded">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Webhook URL
                    </Text>
                    <Text className="text-gray-600 text-xs mb-2">
                      請將此 URL 設定到 LINE Developers Console
                    </Text>
                    <TouchableOpacity
                      onPress={handleCopyWebhookUrl}
                      className="bg-white p-2 rounded border border-gray-300"
                    >
                      <Text
                        className="text-gray-800 text-xs"
                        numberOfLines={3}
                        selectable={true}
                      >
                        {webhookUrl}
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-line-green text-xs mt-2 text-center">
                      長按文字可複製
                    </Text>
                  </View>
                )}
              </View>
            )}
          </List.Section>
        </View>
      )}

      {/* Member Management Section (Owner/Admin only) */}
      {canManageTeam && currentTeamId && (
        <View className="bg-white mt-4">
          <List.Section>
            <View className="flex-row justify-between items-center px-4 py-2">
              <List.Subheader style={{ margin: 0 }}>成員管理</List.Subheader>
              <TouchableOpacity
                onPress={() => {
                  setShowInviteCode(true);
                  setInviteDialogVisible(true);
                }}
                className="px-3 py-1 bg-line-green rounded"
              >
                <Text className="text-white text-xs font-semibold">
                  邀請成員
                </Text>
              </TouchableOpacity>
            </View>
            {membersLoading ? (
              <View className="p-4 items-center">
                <ActivityIndicator size="small" color="#00B900" />
                <Text className="text-gray-500 mt-2">載入成員中...</Text>
              </View>
            ) : teamMembers && teamMembers.length > 0 ? (
              <MemberList
                members={teamMembers.map((m) => ({
                  id: m.member_id,
                  userId: m.user_id,
                  userName: m.user_name,
                  userPictureUrl: m.user_picture_url,
                  teamId: currentTeamId!,
                  role: m.role as any,
                  joinedAt: m.joined_at,
                }))}
                currentUserId={userId || ""}
                currentUserRole={myRole as any}
                onUpdateRole={(targetUserId, newRole) => {
                  // TODO: 實作 updateMemberRole Edge Function endpoint
                  toast.error("更新成員角色功能尚未實作");
                }}
                onRemoveMember={(targetUserId) => {
                  // TODO: 實作 removeMember Edge Function endpoint
                  toast.error("移除成員功能尚未實作");
                }}
              />
            ) : (
              <View className="p-4">
                <Text className="text-gray-500 text-center">目前沒有成員</Text>
              </View>
            )}
          </List.Section>
        </View>
      )}

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

      {/* About Section */}
      <View className="bg-white mt-4">
        <List.Section>
          <List.Subheader>關於</List.Subheader>
          <List.Item
            title="應用版本"
            description="v1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="使用說明"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="隱私政策"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>
      </View>

      {/* Team Actions */}
      {currentTeamId && (
        <View className="bg-white mt-4">
          <List.Section>
            <List.Subheader>團隊操作</List.Subheader>
            {!isOwner && (
              <>
                <List.Item
                  title="離開團隊"
                  titleStyle={{ color: "#EF4444" }}
                  left={(props) => (
                    <List.Icon {...props} icon="exit-to-app" color="#EF4444" />
                  )}
                  right={(props) => (
                    <List.Icon {...props} icon="chevron-right" />
                  )}
                  onPress={handleLeaveTeam}
                />
              </>
            )}
            {isOwner && (
              <>
                <List.Subheader style={{ marginTop: 16 }}>
                  危險操作
                </List.Subheader>
                <List.Item
                  title="刪除團隊"
                  description="永久刪除此團隊和所有資料（無法復原）"
                  titleStyle={{ color: "#EF4444" }}
                  descriptionStyle={{ color: "#F87171" }}
                  left={(props) => (
                    <List.Icon {...props} icon="delete" color="#EF4444" />
                  )}
                  onPress={handleDeleteTeamPress}
                  disabled={deleteTeamMutation.isPending}
                />
              </>
            )}
          </List.Section>
        </View>
      )}

      {/* Logout Button */}
      <View className="px-4 py-6">
        <Button
          mode="outlined"
          onPress={handleLogout}
          textColor="#EF4444"
          style={{ borderColor: "#EF4444" }}
        >
          登出
        </Button>
      </View>

      <View className="h-8" />

      {/* Dialogs */}
      {teams && (
        <TeamSelector
          visible={teamSelectorVisible}
          teams={teams.map((t) => ({
            id: t.team_id,
            name: t.team_name,
            lineOfficialAccountId: t.line_channel_name,
            createdAt: new Date().toISOString(),
            inviteCode: "",
            myRole: t.role as any,
            memberCount: t.member_count,
          }))}
          currentTeamId={currentTeamId}
          onDismiss={() => setTeamSelectorVisible(false)}
          onSelectTeam={handleSwitchTeam}
        />
      )}

      {currentTeam && inviteCodeData && (
        <InviteCodeDialog
          visible={inviteDialogVisible}
          inviteCode={inviteCodeData}
          teamName={currentTeam.team_name}
          onDismiss={() => {
            setInviteDialogVisible(false);
            setShowInviteCode(false);
          }}
          onRegenerate={isOwner ? handleRegenerateInviteCode : undefined}
        />
      )}

      {/* 刪除確認 Modal */}
      <Portal>
        <Modal
          visible={showDeleteModal}
          onDismiss={() => {
            setShowDeleteModal(false);
            setDeleteConfirmText("");
          }}
          contentContainerStyle={{
            backgroundColor: "white",
            padding: 20,
            margin: 20,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            ⚠️ 確認刪除團隊
          </Text>
          <Text style={{ color: "#666", marginBottom: 20 }}>
            此操作無法復原！請輸入團隊名稱「{currentTeam?.team_name}」以確認刪除
          </Text>

          <TextInput
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder="輸入團隊名稱"
            autoFocus
            style={{
              borderWidth: 1,
              borderColor: "#D1D5DB",
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              fontSize: 16,
            }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }}
              style={{ flex: 1 }}
            >
              取消
            </Button>
            <Button
              mode="contained"
              buttonColor="#EF4444"
              onPress={handleConfirmDelete}
              disabled={deleteConfirmText !== currentTeam?.team_name}
              loading={deleteTeamMutation.isPending}
              style={{ flex: 1 }}
            >
              確認刪除
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}
