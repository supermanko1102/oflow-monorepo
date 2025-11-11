/**
 * 更多選單 Bottom Sheet
 * 包含關於、團隊操作（離開/刪除）和登出功能
 */

import { BottomSheet } from "@/components/BottomSheet";
import { Modal } from "@/components/Modal";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useDeleteTeam, useLeaveTeam } from "@/hooks/queries/useTeams";
import { useToast } from "@/hooks/useToast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/stores/useAuthStore";
import { type DeleteTeamConfirmFormData } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface MoreMenuBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  currentTeamId: string | null;
  currentTeamName: string;
  isOwner: boolean;
}

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  isDanger?: boolean;
}

function MenuItem({
  icon,
  label,
  description,
  onPress,
  isDanger = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 border-b border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          isDanger ? "bg-red-50" : "bg-gray-100"
        }`}
      >
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={isDanger ? "#EF4444" : "#6B7280"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            isDanger ? "text-red-500" : "text-gray-900"
          }`}
        >
          {label}
        </Text>
        {description && (
          <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export function MoreMenuBottomSheet({
  visible,
  onDismiss,
  currentTeamId,
  currentTeamName,
  isOwner,
}: MoreMenuBottomSheetProps) {
  const router = useRouter();
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Mutations
  const leaveTeamMutation = useLeaveTeam();
  const deleteTeamMutation = useDeleteTeam();

  // 刪除確認表單
  const {
    control: deleteControl,
    handleSubmit: handleDeleteSubmit,
    reset: resetDeleteForm,
    formState: { errors: deleteErrors },
  } = useForm<DeleteTeamConfirmFormData>({
    defaultValues: {
      teamName: "",
    },
  });

  const handleLogout = async () => {
    onDismiss();

    Alert.alert("登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          // 1. 先呼叫 Zustand logout（會自動持久化）
          logout();

          // 2. 清除 Supabase session
          await supabase.auth.signOut();

          // 3. 清除 React Query cache
          queryClient.clear();

          // 4. Root Layout 會自動偵測 isLoggedIn = false 並導向 login
        },
      },
    ]);
  };

  const handleLeaveTeam = async () => {
    if (!currentTeamId) return;

    onDismiss();

    Alert.alert(
      "離開團隊",
      `確定要離開「${currentTeamName}」嗎？\n\n離開後將無法存取該團隊的訂單資料。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "離開",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveTeamMutation.mutateAsync(currentTeamId);
              toast.success("已離開團隊");

              // 等待 teams 重新載入後再導航
              setTimeout(() => {
                const updatedTeams = queryClient.getQueryData(
                  queryKeys.teams.list()
                );
                if (
                  updatedTeams &&
                  Array.isArray(updatedTeams) &&
                  updatedTeams.length > 0
                ) {
                  setCurrentTeamId(updatedTeams[0].team_id);
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

  const handleDeleteTeamPress = () => {
    if (!currentTeamId) return;

    onDismiss();

    Alert.alert(
      "⚠️ 刪除團隊",
      "刪除後會發生什麼？\n\n• 所有訂單、客戶資料將永久刪除\n• 此操作無法復原\n• 團隊成員將失去存取權限\n\n確定要繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "繼續",
          style: "destructive",
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const onDeleteSubmit = async (data: DeleteTeamConfirmFormData) => {
    if (!currentTeamId) return;

    // 檢查輸入的團隊名稱是否正確
    if (data.teamName !== currentTeamName) {
      toast.error("團隊名稱不正確");
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync(currentTeamId);

      setShowDeleteModal(false);
      resetDeleteForm();
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

  const handleDismissDeleteModal = () => {
    setShowDeleteModal(false);
    resetDeleteForm();
  };

  // 處理刪除帳號
  const handleDeleteAccountPress = () => {
    onDismiss();

    Alert.alert(
      "⚠️ 刪除帳號",
      "此操作無法復原！刪除後將發生：\n\n• 您的個人資料將永久刪除\n• 您將失去所有團隊的存取權限\n• 如果您是某團隊的唯一擁有者，該團隊將被刪除\n\n確定要繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "繼續",
          style: "destructive",
          onPress: () => setShowDeleteAccountModal(true),
        },
      ]
    );
  };

  const handleConfirmDeleteAccount = async () => {
    // 驗證輸入
    if (deleteAccountConfirmText.trim() !== "Delete") {
      toast.error("請正確輸入 Delete");
      return;
    }

    setIsDeletingAccount(true);

    try {
      // 呼叫刪除 API
      await authService.deleteAccount();

      // 關閉 Modal
      setShowDeleteAccountModal(false);
      setDeleteAccountConfirmText("");

      // 顯示成功訊息
      toast.success("帳號已刪除");

      // 登出並清除所有資料
      logout();
      await supabase.auth.signOut();
      queryClient.clear();

      // 導向登入頁面
      router.replace("/(auth)/login");
    } catch (error: any) {
      console.error("刪除帳號失敗:", error);
      toast.error(error.message || "刪除失敗，請稍後再試");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDismissDeleteAccountModal = () => {
    setShowDeleteAccountModal(false);
    setDeleteAccountConfirmText("");
  };

  return (
    <>
      <BottomSheet visible={visible} onDismiss={onDismiss} title="更多">
        <View className="py-2">
          {/* 關於 */}
          <MenuItem
            icon="information"
            label="關於"
            description="應用版本 v1.0.0"
            onPress={() => {
              onDismiss();
              Alert.alert("關於 OFlow", "版本：v1.0.0", [{ text: "確定" }]);
            }}
          />

          {/* 團隊操作 */}
          {currentTeamId && (
            <>
              {!isOwner && (
                <MenuItem
                  icon="exit-to-app"
                  label="離開團隊"
                  description="離開後將無法存取團隊資料"
                  onPress={handleLeaveTeam}
                  isDanger
                />
              )}
              {isOwner && (
                <MenuItem
                  icon="delete"
                  label="刪除團隊"
                  description="永久刪除此團隊和所有資料"
                  onPress={handleDeleteTeamPress}
                  isDanger
                />
              )}
            </>
          )}

          {/* 登出 */}
          <MenuItem
            icon="logout"
            label="登出"
            description="登出目前帳號"
            onPress={handleLogout}
            isDanger
          />

          {/* 刪除帳號 */}
          <MenuItem
            icon="delete-forever"
            label="刪除帳號"
            description="永久刪除您的帳號和所有資料"
            onPress={handleDeleteAccountPress}
            isDanger
          />
        </View>
      </BottomSheet>

      {/* 刪除確認 Modal */}
      <Modal
        visible={showDeleteModal}
        onDismiss={handleDismissDeleteModal}
        mode="dialog"
        title="⚠️ 確認刪除團隊"
        showCloseButton={true}
      >
        <View>
          <Text className="text-gray-600 mb-5">
            此操作無法復原！請輸入團隊名稱「{currentTeamName}」以確認刪除
          </Text>

          <Controller
            control={deleteControl}
            name="teamName"
            rules={{
              validate: (value) =>
                value === currentTeamName || "團隊名稱不正確",
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="輸入團隊名稱"
                autoFocus
                className="border border-gray-300 rounded-lg px-3 py-3 mb-2 text-base"
              />
            )}
          />
          {deleteErrors.teamName && (
            <Text className="text-red-500 text-xs mb-3">
              {deleteErrors.teamName.message}
            </Text>
          )}

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity
              onPress={handleDismissDeleteModal}
              className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold">取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteSubmit(onDeleteSubmit)}
              disabled={deleteTeamMutation.isPending}
              className="flex-1 bg-red-500 rounded-lg py-3 items-center"
              activeOpacity={0.7}
              style={{ opacity: deleteTeamMutation.isPending ? 0.5 : 1 }}
            >
              {deleteTeamMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">確認刪除</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteAccountModal}
        onDismiss={handleDismissDeleteAccountModal}
        mode="dialog"
        title="⚠️ 確認刪除帳號"
        showCloseButton={!isDeletingAccount}
      >
        <View>
          <Text className="text-gray-600 mb-5 leading-5">
            此操作無法復原！您的帳號和所有資料將永久刪除。{"\n\n"}
            請輸入 <Text className="font-bold">Delete</Text> 以確認刪除
          </Text>

          <TextInput
            value={deleteAccountConfirmText}
            onChangeText={setDeleteAccountConfirmText}
            placeholder="輸入 Delete"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-lg px-3 py-3 mb-2 text-base"
          />

          <View className="flex-row gap-3 mt-3">
            <TouchableOpacity
              onPress={handleDismissDeleteAccountModal}
              disabled={isDeletingAccount}
              className="flex-1 border border-gray-300 rounded-lg py-3 items-center"
              activeOpacity={0.7}
              style={{ opacity: isDeletingAccount ? 0.5 : 1 }}
            >
              <Text className="text-gray-700 font-semibold">取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmDeleteAccount}
              disabled={
                isDeletingAccount ||
                deleteAccountConfirmText.trim() !== "Delete"
              }
              className="flex-1 bg-red-500 rounded-lg py-3 items-center"
              activeOpacity={0.7}
              style={{
                opacity:
                  isDeletingAccount ||
                  deleteAccountConfirmText.trim() !== "Delete"
                    ? 0.5
                    : 1,
              }}
            >
              {isDeletingAccount ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">確認刪除</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
