import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  useInviteCode,
  useLeaveTeam,
  useDeleteTeam,
} from "@/hooks/queries/useTeams";
import { useDeleteAccount } from "@/hooks/queries/useAccount";
import { logout } from "@/services/auth";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View, ActivityIndicator } from "react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";

type ActionVariant = "default" | "primary";
type StatusTone = "success" | "muted";

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  actionLabel?: string;
  actionVariant?: ActionVariant;
  statusTone?: StatusTone;
  disabled?: boolean;
  disabledLabel?: string;
  onPress?: () => void;
  onActionPress?: () => void;
};

type SettingSection = {
  title: string;
  description?: string;
  isDisabled?: boolean;
  disabledLabel?: string;
  items: SettingItem[];
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

  const sections: SettingSection[] = [
    {
      title: "訂閱方案（待施工）",
      description: "升級方案、發票與付款方式設定",
      isDisabled: true,
      disabledLabel: "訂閱功能開發中",
      items: [
        {
          icon: "card-outline",
          label: "方案與帳單",
          detail: "查看目前方案、付款方式與發票資訊",
          disabled: true,
          onPress: () => console.log("open subscription"),
        },
      ],
    },
    {
      title: "通知與提醒（待施工）",
      description: "此區尚未串接後端",
      isDisabled: true,
      disabledLabel: "通知設定開發中",
      items: [
        {
          icon: "notifications-outline",
          label: "推播提醒",
          detail: "訂單狀態、AI 例外通知",
          disabled: true,
          onPress: () => console.log("open push notifications"),
        },
        {
          icon: "mail-outline",
          label: "Email 摘要",
          detail: "每週營運數據報告",
          statusTone: "muted",
          disabled: true,
          onPress: () => console.log("open email digest"),
        },
      ],
    },
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
        {
          icon: "calendar-outline",
          label: "Google 日曆（待施工）",
          detail: "未連結 · 即將開放",
          actionVariant: "default",
          statusTone: "muted",
          disabled: true,
          onPress: () => console.log("connect Google Calendar"),
          onActionPress: () => console.log("connect Google Calendar"),
        },
      ],
    },
    {
      title: "資料與支援（待施工）",
      description: "此區尚未串接後端",
      isDisabled: true,
      disabledLabel: "資料匯出與支援開發中",
      items: [
        {
          icon: "cloud-download-outline",
          label: "匯出資料",
          detail: "訂單、顧客 CSV 報表",
          disabled: true,
          onPress: () => console.log("export data"),
        },
        {
          icon: "help-circle-outline",
          label: "取得協助",
          detail: "聯絡客服或查看指南",
          disabled: true,
          onPress: () => console.log("open support"),
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
        <View className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-sm font-semibold text-slate-900">
                邀請成員
              </Text>
              <Text className="text-[12px] text-slate-500 mt-0.5">
                分享邀請碼讓夥伴加入此團隊
              </Text>
            </View>
            <Pressable
              onPress={() => refetchInvite()}
              className="px-3 py-1.5 rounded-full border border-slate-200"
              disabled={isInviteLoading}
            >
              <Text className="text-[12px] font-semibold text-slate-700">
                重新產生
              </Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            <View className="flex-1">
              <Text className="text-[11px] text-slate-500 mb-1">邀請碼</Text>
              {isInviteLoading || isInviteRefetching ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator
                    size="small"
                    color={Palette.brand.primary}
                  />
                  <Text className="text-sm text-slate-500">生成中...</Text>
                </View>
              ) : (
                <Text className="text-xl font-bold tracking-widest text-slate-900">
                  {inviteCode || "尚未產生"}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleCopyInvite}
              className="ml-3 px-3 py-2 rounded-full"
              style={{
                backgroundColor: inviteCode ? Palette.brand.primary : "#E2E8F0",
              }}
              disabled={!inviteCode}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: inviteCode ? "#FFFFFF" : "#94A3B8" }}
              >
                複製
              </Text>
            </Pressable>
          </View>
        </View>

        {sections.map((section) => (
          <View
            key={section.title}
            className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden relative"
          >
            <View className="px-5 pt-5 pb-3 border-b border-slate-50">
              <Text
                className="text-[11px] font-semibold uppercase text-slate-400"
                style={{ letterSpacing: 2 }}
              >
                {section.title}
              </Text>
              {section.description && (
                <Text className="text-sm text-slate-500 mt-1">
                  {section.description}
                </Text>
              )}
            </View>

            {section.items.map((item, index) => (
              <SettingRow
                key={item.label}
                {...item}
                showDivider={index < section.items.length - 1}
              />
            ))}
          </View>
        ))}

        <View className="gap-3 rounded-3xl border border-slate-100 bg-white shadow-sm p-4">
          <Text className="text-sm font-bold text-slate-900">危險操作</Text>
          <Text className="text-sm text-slate-600">
            團隊 / 帳號相關高風險操作，請謹慎使用
          </Text>
          <View className="mt-3 gap-2">
            <SettingRow
              icon="exit-outline"
              label="退出目前團隊"
              detail="離開當前團隊並清除相關資料快取"
              actionLabel="退出"
              actionVariant="primary"
              onPress={handleLeaveTeam}
              disabled={isLeaving || leaveTeam.isPending}
            />
            <SettingRow
              icon="trash-outline"
              label="刪除團隊"
              detail="不可復原，將永久刪除團隊資料"
              actionLabel="刪除"
              actionVariant="primary"
              onPress={handleDeleteTeam}
              disabled={isDeletingTeam || deleteTeam.isPending}
            />
            <SettingRow
              icon="log-out-outline"
              label="登出帳號"
              detail="離開目前登入狀態"
              actionLabel="登出"
              actionVariant="primary"
              onPress={handleLogout}
              disabled={isLoggingOut}
            />
            <SettingRow
              icon="person-remove-outline"
              label="刪除帳號"
              detail="不可復原，將永久刪除個人帳號與資料"
              actionLabel="刪除"
              actionVariant="primary"
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount || deleteAccount.isPending}
            />
            <Text className="text-[11px] text-slate-400 text-center mt-2">
              版本 1.0.2 (Build 20241120)
              {isLoggingOut || isLeaving ? " · 進行中" : ""}
            </Text>
          </View>
        </View>
      </View>
    </MainLayout>
  );
}

function SettingRow({
  icon,
  label,
  detail,
  actionLabel,
  actionVariant = "default",
  statusTone,
  disabled,
  disabledLabel,
  onPress,
  onActionPress,
  showDivider,
}: SettingItem & { showDivider?: boolean }) {
  const isPrimaryAction = actionVariant === "primary";
  const isDisabled = !!disabled;
  const disabledText = disabledLabel || "暫未開放";
  const showDisabledOverlay = isDisabled && !!disabledLabel;

  return (
    <View className="relative">
      <Pressable
        className="flex-row items-center justify-between px-5 py-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        onPress={onPress}
        disabled={isDisabled}
      >
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{ backgroundColor: "rgba(0, 128, 128, 0.08)" }}
          >
            <Ionicons name={icon} size={22} color={Palette.brand.primary} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-slate-900">
                {label}
              </Text>
              {statusTone && (
                <View
                  className="px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor:
                      statusTone === "success"
                        ? "rgba(0, 128, 128, 0.4)"
                        : "#E2E8F0",
                    backgroundColor:
                      statusTone === "success"
                        ? "rgba(0, 128, 128, 0.08)"
                        : "#F8FAFC",
                  }}
                >
                  <Text
                    className="text-[10px] font-semibold"
                    style={{
                      color:
                        statusTone === "success"
                          ? Palette.brand.primary
                          : "#64748B",
                    }}
                  >
                    {statusTone === "success" ? "已連結" : "未連結"}
                  </Text>
                </View>
              )}
            </View>
            {detail ? (
              <Text
                className="text-[12px] text-slate-500 mt-0.5"
                numberOfLines={1}
              >
                {detail}
              </Text>
            ) : null}
          </View>
        </View>

        {actionLabel ? (
          <Pressable
            onPress={onActionPress ?? onPress}
            className="px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: isPrimaryAction
                ? Palette.brand.primary
                : "#FFFFFF",
              borderColor: isPrimaryAction ? Palette.brand.primary : "#E2E8F0",
              opacity: isDisabled ? 0.4 : 1,
            }}
            disabled={isDisabled}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: isPrimaryAction ? "#FFFFFF" : "#475569" }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        )}
      </Pressable>

      {showDisabledOverlay ? (
        <Pressable
          className="absolute inset-0 bg-black/40 items-center justify-center"
          onPress={() => Alert.alert("功能開發中", disabledText)}
        >
          <Text className="text-white font-semibold">施工中</Text>
        </Pressable>
      ) : null}

      {showDivider && <View className="h-px bg-slate-50 mx-5" />}
    </View>
  );
}
