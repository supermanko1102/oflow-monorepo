import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useTeamMembers } from "@/hooks/queries/useTeams";
import { logout } from "@/services/auth";
import { useLeaveTeam } from "@/hooks/queries/useTeams";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useState } from "react";

type ActionVariant = "default" | "primary";
type StatusTone = "success" | "muted";

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  actionLabel?: string;
  actionVariant?: ActionVariant;
  statusTone?: StatusTone;
  onPress?: () => void;
  onActionPress?: () => void;
};

type SettingSection = {
  title: string;
  description?: string;
  items: SettingItem[];
};

type DangerAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function Settings() {
  const router = useRouter();
  const { currentTeam, currentTeamId } = useCurrentTeam();
  const { data: members } = useTeamMembers(
    currentTeamId || "",
    !!currentTeamId
  );
  const leaveTeam = useLeaveTeam();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const memberCount = members?.length ?? 0;
  const hasLine = !!currentTeam?.line_channel_id;

  const sections: SettingSection[] = [
    {
      title: "帳戶與團隊",
      description: "調整個人資料、帳號安全與團隊權限",
      items: [
        {
          icon: "person-circle-outline",
          label: "帳戶資訊",
          detail: "管理姓名、Email、密碼",
          actionLabel: "編輯",
          onPress: () => console.log("open account settings"),
        },
        {
          icon: "people-outline",
          label: "團隊與權限",
          detail: memberCount > 0 ? `${memberCount} 位成員` : "載入成員中...",
          actionLabel: "管理",
          onPress: () => router.push("/(main)/(tabs)/overview"),
        },
      ],
    },
    {
      title: "通知與提醒（待施工）",
      description: "此區尚未串接後端",
      items: [
        {
          icon: "notifications-outline",
          label: "推播提醒",
          detail: "訂單狀態、AI 例外通知",
          actionLabel: "尚未開放",
          onPress: () => console.log("open push notifications"),
        },
        {
          icon: "mail-outline",
          label: "Email 摘要",
          detail: "每週營運數據報告",
          actionLabel: "尚未開放",
          statusTone: "muted",
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
          actionLabel: "尚未開放",
          actionVariant: "default",
          statusTone: "muted",
          onPress: () => console.log("connect Google Calendar"),
          onActionPress: () => console.log("connect Google Calendar"),
        },
      ],
    },
    {
      title: "資料與支援（待施工）",
      description: "此區尚未串接後端",
      items: [
        {
          icon: "cloud-download-outline",
          label: "匯出資料",
          detail: "訂單、顧客 CSV 報表",
          actionLabel: "尚未開放",
          onPress: () => console.log("export data"),
        },
        {
          icon: "help-circle-outline",
          label: "取得協助",
          detail: "聯絡客服或查看指南",
          actionLabel: "尚未開放",
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

  const dangerActions: DangerAction[] = [
    { label: "登出帳號", onPress: handleLogout },
    { label: "退出目前團隊", onPress: handleLeaveTeam },
  ];

  return (
    <MainLayout
      title="設定"
      subtitle="帳戶、團隊、通知與整合管理"
      teamName={currentTeam?.team_name || "載入中..."}
      teamStatus="open"
      showActions={false}
      showDangerTrigger
      dangerActions={dangerActions}
      onTeamPress={() => console.log("team picker")}
    >
      <View className="gap-6 pt-2 pb-8">
        {sections.map((section) => (
          <View
            key={section.title}
            className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden"
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

        <DangerZone
          actions={dangerActions}
          versionLabel={`版本 1.0.2 (Build 20241120)${
            isLoggingOut || isLeaving ? " · 進行中" : ""
          }`}
        />
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
  onPress,
  onActionPress,
  showDivider,
}: SettingItem & { showDivider?: boolean }) {
  const isPrimaryAction = actionVariant === "primary";

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between px-5 py-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        onPress={onPress}
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
            }}
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

      {showDivider && <View className="h-px bg-slate-50 mx-5" />}
    </View>
  );
}

function DangerZone({
  actions,
  versionLabel,
}: {
  actions: DangerAction[];
  versionLabel: string;
}) {
  return (
    <View
      className="rounded-3xl border border-red-100 px-5 py-5"
      style={{ backgroundColor: "rgba(254, 242, 242, 0.85)" }}
    >
      <Text
        className="text-[11px] font-semibold uppercase text-red-500"
        style={{ letterSpacing: 2 }}
      >
        危險操作
      </Text>
      <Text className="text-sm text-slate-600 mt-2">
        大部分操作都可透過右上角的危險選單觸發，以下提供捷徑
      </Text>

      <View className="mt-4 gap-3">
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            className="flex-row items-center justify-between rounded-2xl border px-4 py-3 bg-white/80"
            style={{
              borderColor: action.destructive ? "#FECACA" : "#FBD5D5",
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: action.destructive ? "#DC2626" : "#B91C1C" }}
            >
              {action.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
          </Pressable>
        ))}
      </View>

      <Text className="text-[11px] text-slate-400 text-center mt-5">
        {versionLabel}
      </Text>
    </View>
  );
}
