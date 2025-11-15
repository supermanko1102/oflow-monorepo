import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export type NavbarTab = {
  key: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type NavbarProps = {
  teamName?: string;
  teamStatus?: "open" | "closed";
  title: string;
  subtitle?: string;
  onTeamPress?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onCreatePress?: () => void;
  tabs?: NavbarTab[];
  trailingContent?: ReactNode;
};

/**
 * 輕量客製化的 Navbar，可在不同頁面共用。
 * - 左側顯示 Team 狀態 (綠點/灰點) 與名稱
 * - 右側提供搜尋、提醒、主要 CTA
 * - 下方可選擇渲染 Contextual tabs (Scrollable)
 */
export function Navbar({
  teamName = "OFlow Demo",
  teamStatus = "open",
  title,
  subtitle,
  onTeamPress,
  onSearchPress,
  onNotificationsPress,
  onCreatePress,
  tabs,
  trailingContent,
}: NavbarProps) {
  const statusColor = teamStatus === "open" ? "bg-green-500" : "bg-gray-400";

  const renderTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        className="mt-3"
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={tab.onPress}
            className={`px-3 py-1.5 rounded-full border ${
              tab.active
                ? "bg-gray-900 border-gray-900"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                tab.active ? "text-white" : "text-gray-600"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  return (
    <View className="bg-white px-5 pt-5 pb-3 border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onTeamPress}
          className="flex-row items-center gap-3 rounded-full px-3 py-2 bg-gray-50"
        >
          <View className={`w-2 h-2 rounded-full ${statusColor}`} />
          <Text className="text-sm font-semibold text-gray-900">{teamName}</Text>
          <Ionicons name="chevron-down" size={16} color="#4B5563" />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <IconButton
            icon="search"
            ariaLabel="搜尋"
            onPress={onSearchPress}
          />
          <IconButton
            icon="notifications-outline"
            ariaLabel="提醒"
            onPress={onNotificationsPress}
          />
          <Pressable
            onPress={onCreatePress}
            className="flex-row items-center gap-1 rounded-full bg-gray-900 px-3 py-2"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-xs font-semibold">新增</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-4">
        <Text className="text-xl font-bold text-gray-900">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
        ) : null}
      </View>

      {trailingContent}
      {renderTabs()}
    </View>
  );
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  ariaLabel: string;
};

function IconButton({ icon, onPress, ariaLabel }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
    >
      <Ionicons name={icon} size={18} color="#111827" />
    </Pressable>
  );
}
