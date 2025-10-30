/**
 * 成員管理 Bottom Sheet
 * 包含成員列表、邀請功能和角色管理
 */

import { BottomSheet } from "@/components/BottomSheet";
import { InviteCodeDialog } from "@/components/team/InviteCodeDialog";
import { MemberList } from "@/components/team/MemberList";
import { useInviteCode, useTeamMembers } from "@/hooks/queries/useTeams";
import { useToast } from "@/hooks/useToast";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface MembersBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  teamId: string;
  teamName: string;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  isOwner: boolean;
}

export function MembersBottomSheet({
  visible,
  onDismiss,
  teamId,
  teamName,
  currentUserId,
  currentUserRole,
  isOwner,
}: MembersBottomSheetProps) {
  const toast = useToast();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);

  // Queries
  const { data: teamMembers, isLoading: membersLoading } = useTeamMembers(
    teamId,
    visible && !!teamId
  );
  const { data: inviteCodeData } = useInviteCode(
    teamId,
    showInviteCode && !!teamId
  );

  const handleRegenerateInviteCode = () => {
    Alert.alert("重新生成邀請碼", "舊的邀請碼將立即失效，確定要繼續嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "確定",
        onPress: () => {
          // TODO: 實作 regenerateInviteCode Edge Function endpoint
          toast.error("重新生成邀請碼功能尚未實作");
        },
      },
    ]);
  };

  const handleInvitePress = () => {
    setShowInviteCode(true);
    setInviteDialogVisible(true);
  };

  return (
    <>
      <BottomSheet visible={visible} onDismiss={onDismiss} title="成員管理">
        <ScrollView style={{ maxHeight: 500 }}>
          {/* 邀請按鈕 */}
          <TouchableOpacity
            onPress={handleInvitePress}
            className="px-4 py-3 bg-line-green rounded-lg mb-4"
          >
            <Text className="text-white text-center font-semibold">
              邀請新成員
            </Text>
          </TouchableOpacity>

          {/* 成員列表 */}
          {membersLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#00B900" />
              <Text className="text-gray-500 mt-2">載入成員中...</Text>
            </View>
          ) : teamMembers && teamMembers.length > 0 ? (
            <View className="bg-white rounded-lg border border-gray-200">
              <MemberList
                members={teamMembers.map((m) => ({
                  member_id: m.member_id,
                  user_id: m.user_id,
                  user_name: m.user_name,
                  user_picture_url: m.user_picture_url,
                  role: m.role,
                  joined_at: m.joined_at,
                  can_manage_orders: m.can_manage_orders,
                  can_manage_customers: m.can_manage_customers,
                  can_manage_settings: m.can_manage_settings,
                  can_view_analytics: m.can_view_analytics,
                  can_invite_members: m.can_invite_members,
                }))}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onUpdateRole={(targetUserId, newRole) => {
                  // TODO: 實作 updateMemberRole Edge Function endpoint
                  toast.error("更新成員角色功能尚未實作");
                }}
                onRemoveMember={(targetUserId) => {
                  // TODO: 實作 removeMember Edge Function endpoint
                  toast.error("移除成員功能尚未實作");
                }}
              />
            </View>
          ) : (
            <View className="py-8">
              <Text className="text-gray-500 text-center">目前沒有成員</Text>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* 邀請碼對話框 */}
      {inviteCodeData && (
        <InviteCodeDialog
          visible={inviteDialogVisible}
          inviteCode={inviteCodeData}
          teamName={teamName}
          onDismiss={() => {
            setInviteDialogVisible(false);
            setShowInviteCode(false);
          }}
          onRegenerate={isOwner ? handleRegenerateInviteCode : undefined}
        />
      )}
    </>
  );
}
