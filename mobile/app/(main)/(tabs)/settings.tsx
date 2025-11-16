import { MainLayout } from "@/components/layout/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type SettingSection = {
  title: string;
  description?: string;
  items: SettingItem[];
};

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  actionLabel?: string;
};

export default function Settings() {
  const sections: SettingSection[] = [
    {
      title: "帳戶與團隊",
      items: [
        {
          icon: "person-circle-outline",
          label: "帳戶資訊",
          detail: "管理姓名、Email、密碼",
          actionLabel: "編輯",
        },
        {
          icon: "people-outline",
          label: "團隊與權限",
          detail: "5 位成員 · 2 位有管理權限",
          actionLabel: "管理",
        },
      ],
    },
    {
      title: "通知與提醒",
      items: [
        {
          icon: "notifications-outline",
          label: "推播提醒",
          detail: "訂單狀態、AI 例外、每日摘要",
          actionLabel: "設定",
        },
        {
          icon: "mail-outline",
          label: "Email 摘要",
          detail: "每週營運摘要",
          actionLabel: "訂閱",
        },
      ],
    },
    {
      title: "整合服務",
      items: [
        {
          icon: "logo-capacitor",
          label: "LINE 官方帳號",
          detail: "已連結 · 自動同步對話",
          actionLabel: "查看",
        },
        {
          icon: "calendar-outline",
          label: "Google 日曆",
          detail: "未連結 · 匯出排程",
          actionLabel: "連結",
        },
      ],
    },
  {
    title: "資料與支援",
    items: [
      {
        icon: "cloud-download-outline",
        label: "匯出資料",
        detail: "訂單、顧客、對話紀錄",
        actionLabel: "匯出",
      },
      {
        icon: "help-circle-outline",
        label: "取得協助",
        detail: "聯絡客服或查看指南",
        actionLabel: "開啟",
      },
    ],
  },
  ];

  const dangerActions = [
    { label: "登出帳號", onPress: () => console.log("logout") },
    { label: "退出目前團隊", onPress: () => console.log("leave team") },
    {
      label: "刪除帳號與資料",
      destructive: true,
      onPress: () => console.log("delete account"),
    },
  ];

  return (
    <MainLayout
      title="設定"
      subtitle="管理帳戶、團隊與整合服務"
      teamName="甜點工作室 A"
      showActions={false}
      showDangerTrigger
      dangerActions={dangerActions}
      onTeamPress={() => console.log("team picker")}
      onSearchPress={() => console.log("search settings")}
      onNotificationsPress={() => console.log("notifications")}
      onCreatePress={() => console.log("快速操作")}
    >
      <View className="space-y-5">
        {sections.map((section) => (
          <View
            key={section.title}
            className="rounded-2xl border border-gray-100 bg-white p-4"
          >
            <Text className="text-sm font-semibold text-gray-900">
              {section.title}
            </Text>
            {section.description ? (
              <Text className="text-[11px] text-gray-500 mt-1">
                {section.description}
              </Text>
            ) : null}

            <View className="mt-3 space-y-2">
              {section.items.map((item) => (
                <SettingRow key={item.label} {...item} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </MainLayout>
  );
}

function SettingRow({
  icon,
  label,
  detail,
  actionLabel,
}: SettingItem) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-gray-100 p-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
          <Ionicons name={icon} size={18} color="#111827" />
        </View>
        <View>
          <Text className="text-sm font-semibold text-gray-900">{label}</Text>
          {detail ? (
            <Text className="text-[11px] text-gray-500 mt-0.5">{detail}</Text>
          ) : null}
        </View>
      </View>
      {actionLabel ? (
        <Pressable className="px-3 py-1 rounded-full border border-gray-200">
          <Text className="text-[11px] font-medium text-gray-900">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
