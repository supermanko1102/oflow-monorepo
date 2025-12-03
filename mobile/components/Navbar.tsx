import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Palette } from "@/constants/palette";

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
  showActions?: boolean;
  showDangerTrigger?: boolean;
  onTeamPress?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onCreatePress?: () => void;
  onDangerPress?: () => void;
  tabs?: NavbarTab[];
  trailingContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
};

/**
 * 輕量客製化的 Navbar，可在不同頁面共用。
 * - 左側顯示 Team 狀態 (綠點/灰點) 與名稱
 * - 中間可顯示標題或自定義內容 (centerContent)
 * - 右側提供搜尋、提醒、主要 CTA 或自定義內容 (rightContent)
 * - 下方可選擇渲染 Contextual tabs (Scrollable)
 */
export function Navbar({
  teamName = "OFlow Demo",
  teamStatus = "open",
  title,
  subtitle,
  onTeamPress,
  tabs,
  trailingContent,
  centerContent,
}: NavbarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const containerBorderClass = isDark ? "border-slate-800" : "border-slate-100";
  const containerBackgroundClass = isDark ? "bg-slate-900" : "bg-white";
  const surfaceClass = isDark ? "bg-slate-800" : "bg-slate-100";
  const textClass = isDark ? "text-slate-100" : "text-slate-900";
  const subtitleClass = isDark ? "text-slate-400" : "text-slate-500";
  const iconColor = isDark ? "#E2E8F0" : "#475569";
  const tabInactiveTextClass = isDark ? "text-slate-400" : "text-slate-500";
  const tabInactiveBorderClass = isDark
    ? "border-slate-800"
    : "border-slate-200";

  const statusIndicatorClass =
    teamStatus === "open"
      ? "bg-brand-teal"
      : isDark
        ? "bg-slate-500"
        : "bg-slate-400";

  const renderTabs = () => {
    if (!tabs || tabs.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        className="mt-3"
      >
        {tabs.map((tab) => {
          const isActive = !!tab.active;
          return (
            <Pressable
              key={tab.key}
              onPress={tab.onPress}
              className={`px-3 py-1.5 rounded-full ${
                isActive
                  ? "bg-brand-teal border border-brand-teal"
                  : `border ${tabInactiveBorderClass} ${surfaceClass}`
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? "text-white" : tabInactiveTextClass
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View
      className={`px-5 pt-5 pb-3 border-b ${containerBackgroundClass} ${containerBorderClass}`}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Team / Logo */}
        <Pressable
          onPress={onTeamPress}
          disabled={!onTeamPress}
          className={`flex-row items-center gap-3 rounded-full px-3 py-2 ${surfaceClass} ${
            onTeamPress ? "" : "opacity-70"
          }`}
        >
          <View className={`w-2 h-2 rounded-full ${statusIndicatorClass}`} />
          <Text className={`text-sm font-semibold ${textClass}`}>
            {teamName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={iconColor} />
        </Pressable>
      </View>

      {/* Center: Title or Custom Content */}
      <View className="mt-4">
        <Text className={`text-xl font-bold ${textClass}`}>{title}</Text>
        {subtitle ? (
          <Text className={`text-xs mt-1 ${subtitleClass}`}>{subtitle}</Text>
        ) : null}
        {centerContent ? <View className="mt-3">{centerContent}</View> : null}
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
  variant?: "default" | "danger";
  isDark: boolean;
};

export function IconButton({
  icon,
  onPress,
  ariaLabel,
  variant = "default",
  isDark,
}: IconButtonProps) {
  const isDanger = variant === "danger";
  const backgroundColor = isDanger
    ? isDark
      ? "rgba(239, 68, 68, 0.15)"
      : "#FEE2E2"
    : isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "#F8FAFC";
  const borderColor = isDanger
    ? isDark
      ? "rgba(239, 68, 68, 0.35)"
      : "#FCA5A5"
    : isDark
      ? "#1F2937"
      : "#E2E8F0";
  const iconColor =
    variant === "danger"
      ? Palette.status.danger
      : isDark
        ? "#F8FAFC"
        : "#0F172A";
  return (
    <Pressable
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      className="w-10 h-10 rounded-full items-center justify-center border"
      style={{ backgroundColor, borderColor }}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
    </Pressable>
  );
}
