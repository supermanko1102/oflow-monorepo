import { MainLayout } from "@/components/layout/MainLayout";
import { DangerActionsCard } from "@/components/settings/DangerActionsCard";
import { InviteCard } from "@/components/settings/InviteCard";
import { SettingItem } from "@/components/settings/SettingRow";
import { SettingSection } from "@/components/settings/SettingSection";
import { TeamInfoCard } from "@/components/settings/TeamInfoCard";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  useInviteCode,
  useLeaveTeam,
  useDeleteTeam,
} from "@/hooks/queries/useTeams";
import { useDeleteAccount } from "@/hooks/queries/useAccount";
import { logout } from "@/services/auth";
import { useRouter } from "expo-router";
import { Alert, ActionSheetIOS, Platform, View } from "react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { BUSINESS_TYPE_OPTIONS } from "@/types/team";

type SectionConfig = {
  title: string;
  description?: string;
  items: SettingItem[];
  isDisabled?: boolean;
  disabledLabel?: string;
};

export default function Settings() {
  const router = useRouter();
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const {
    data: inviteCode,
    isLoading: isInviteLoading,
    isRefetching: isInviteRefetching,
    refetch: refetchInvite,
  } = useInviteCode(currentTeamId || "", !!currentTeamId);
  const leaveTeam = useLeaveTeam();
  const deleteTeam = useDeleteTeam();
  const deleteAccount = useDeleteAccount();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const hasLine = !!currentTeam?.line_channel_id;
  const currentBusinessType = (currentTeam as any)?.business_type || "bakery";
  const currentBusinessLabel =
    BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === currentBusinessType)
      ?.label || "烘焙・甜點";
  const memberCount = currentTeam?.member_count ?? 0;
  const isOwner = currentTeam?.role === "owner";
  const isSoleOwner = isOwner && memberCount <= 1;
  const versionLabel = `版本 1.0.2 (Build 20241120)${
    isLoggingOut || isLeaving ? " · 進行中" : ""
  }`;

  const sections: SectionConfig[] = [
    {
      title: "營運設定",
      description: "配送方式會同步影響 AI 建單與商品可售方式",
      items: [
        {
          icon: "bicycle-outline",
          label: "配送設定",
          detail: "店取、面交、超商、宅配",
          actionLabel: "設定",
          actionVariant: "primary",
          onPress: () => router.push("/(main)/delivery"),
        },
      ],
    },
    {
      title: "整合服務",
      description: "掌握 LINE、日曆與其他外部工具的串接狀態",
      items: [
        {
          icon: "chatbubble-ellipses-outline",
          label: "LINE 官方帳號",
          detail: hasLine ? "已連結 · 自動同步中" : "未連結 · 點擊設定",
          actionLabel: hasLine ? "管理" : "連結",
          actionVariant: hasLine ? "default" : "primary",
          statusTone: hasLine ? "success" : "muted",
          onPress: () => router.push("/(main)/lineConnect"),
        },
      ],
    },
  ];

  const handleLogout = async () => {
    Alert.alert("確認登出", "確定要登出嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
            router.replace("/landing");
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("登出失敗", "請稍後再試");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) {
      Alert.alert("尚未產生", "請先產生邀請碼後再分享");
      return;
    }
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert("已複製", "邀請碼已複製，可貼給成員加入");
  };

  const handleLeaveTeam = () => {
    if (!currentTeamId) return;
    if (isSoleOwner) {
      Alert.alert(
        "無法退出團隊",
        "目前只有你一位擁有者，請先新增成員並轉移擁有者，或保留團隊。"
      );
      return;
    }
    Alert.alert("確認離隊", "離開後需重新邀請才可回到此團隊，確定要離開嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "離開",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLeaving(true);
            await leaveTeam.mutateAsync(currentTeamId);
            await logout();
            router.replace("/landing");
          } catch (error) {
            console.error("Leave team failed:", error);
            Alert.alert("離開失敗", "請稍後再試");
          } finally {
            setIsLeaving(false);
          }
        },
      },
    ]);
  };

  const handleDeleteTeam = () => {
    if (!currentTeamId) return;
    if (isSoleOwner) {
      Alert.alert(
        "無法刪除團隊",
        "目前只有你一位擁有者，請先新增成員並轉移擁有者，或保留團隊。"
      );
      return;
    }
    Alert.alert(
      "刪除團隊",
      "此動作無法復原，將永久刪除團隊與相關資料，確定要刪除嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "永久刪除",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingTeam(true);
              await deleteTeam.mutateAsync(currentTeamId);
              await logout();
              router.replace("/landing");
            } catch (error) {
              console.error("Delete team failed:", error);
              Alert.alert("刪除失敗", "請稍後再試");
            } finally {
              setIsDeletingTeam(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "刪除帳號",
      "此動作無法復原，將永久刪除個人帳號與資料，確定要刪除嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "永久刪除",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              await deleteAccount.mutateAsync();
              await logout();
              router.replace("/landing");
            } catch (error) {
              console.error("Delete account failed:", error);
              Alert.alert("刪除失敗", "請稍後再試");
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectBusiness = () => {
    const options = BUSINESS_TYPE_OPTIONS.map((opt) => opt.label).concat(
      "取消"
    );
    const locked = BUSINESS_TYPE_OPTIONS.map((opt) => opt.value !== "bakery");
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "行業類別",
          message: "目前僅開放烘焙・甜點，其餘行業敬請期待",
        },
        (buttonIndex) => {
          if (buttonIndex === cancelButtonIndex) return;
          if (locked[buttonIndex]) {
            Alert.alert("敬請期待", "目前僅開放烘焙・甜點");
          }
        }
      );
    } else {
      Alert.alert("行業類別", "目前僅開放烘焙・甜點，其餘行業敬請期待", [
        { text: "關閉", style: "cancel" },
      ]);
    }
  };

  return (
    <MainLayout
      title="設定"
      subtitle="帳戶、團隊、通知與整合管理"
      teamName={currentTeam?.team_name || "載入中..."}
      teamStatus="open"
      showActions={false}
      onTeamPress={() => console.log("team picker")}
    >
      <View className="gap-6 pt-2 pb-8">
        <TeamInfoCard
          teamName={currentTeam?.team_name}
          businessLabel={currentBusinessLabel}
          onSelectBusiness={handleSelectBusiness}
        />

        <InviteCard
          inviteCode={inviteCode}
          isLoading={isInviteLoading}
          isRefetching={isInviteRefetching}
          onCopyInvite={handleCopyInvite}
          onRefetchInvite={() => refetchInvite()}
        />

        {sections.map((section) => (
          <SettingSection
            key={section.title}
            title={section.title}
            description={section.description}
            items={section.items}
            isDisabled={section.isDisabled}
            disabledLabel={section.disabledLabel}
          />
        ))}

        <DangerActionsCard
          onLeaveTeam={handleLeaveTeam}
          onDeleteTeam={handleDeleteTeam}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          isLeaving={isLeaving}
          isDeletingTeam={isDeletingTeam}
          isLoggingOut={isLoggingOut}
          isDeletingAccount={isDeletingAccount}
          leaveTeamPending={leaveTeam.isPending}
          deleteTeamPending={deleteTeam.isPending}
          deleteAccountPending={deleteAccount.isPending}
          versionLabel={versionLabel}
        />
      </View>
    </MainLayout>
  );
}
