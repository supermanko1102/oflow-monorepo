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
  showActions = true,
  showDangerTrigger = false,
  onTeamPress,
  onSearchPress,
  onNotificationsPress,
  onCreatePress,
  onDangerPress,
  tabs,
  trailingContent,
}: NavbarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark
      ? Palette.neutralsDark.background
      : Palette.neutrals.white,
    border: isDark ? Palette.neutralsDark.border : "#F3F4F6",
    surface: isDark ? Palette.neutralsDark.surface : Palette.neutrals.surface,
    text: isDark ? Palette.neutralsDark.heading : Palette.neutrals.heading,
    subtitle: isDark ? Palette.neutralsDark.icon : Palette.neutrals.icon,
    muted: isDark ? Palette.neutralsDark.icon : Palette.neutrals.slate600,
    icon: isDark ? Palette.neutralsDark.icon : Palette.neutrals.icon,
    tabInactiveText: isDark
      ? Palette.neutralsDark.icon
      : Palette.neutrals.slate600,
    tabInactiveBorder: isDark ? Palette.neutralsDark.border : "#E5E7EB",
  };

  const statusIndicatorColor =
    teamStatus === "open"
      ? Palette.brand.primary
      : isDark
      ? Palette.neutralsDark.icon
      : Palette.neutrals.iconMuted;

  const tabActiveBackground = isDark
    ? Palette.brand.primary
    : Palette.neutrals.heading;
  const tabInactiveBackground = colors.surface;

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
              className="px-3 py-1.5 rounded-full border"
              style={{
                backgroundColor: isActive
                  ? tabActiveBackground
                  : tabInactiveBackground,
                borderColor: isActive
                  ? tabActiveBackground
                  : colors.tabInactiveBorder,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{
                  color: isActive
                    ? Palette.neutrals.white
                    : colors.tabInactiveText,
                }}
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
      className="px-5 pt-5 pb-3 border-b"
      style={{ backgroundColor: colors.background, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onTeamPress}
          className="flex-row items-center gap-3 rounded-full px-3 py-2"
          style={{ backgroundColor: colors.surface }}
        >
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusIndicatorColor }}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.text }}
          >
            {teamName}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.icon}
          />
        </Pressable>

        {(showActions || showDangerTrigger) ? (
          <View className="flex-row items-center gap-3">
            {showActions ? (
              <>
                <IconButton
                  icon="search"
                  ariaLabel="搜尋"
                  onPress={onSearchPress}
                  isDark={isDark}
                />
                <IconButton
                  icon="notifications-outline"
                  ariaLabel="提醒"
                  onPress={onNotificationsPress}
                  isDark={isDark}
                />
                <Pressable
                  onPress={onCreatePress}
                  className="flex-row items-center gap-1 rounded-full px-3 py-2"
                  style={{
                    backgroundColor: isDark
                      ? Palette.brand.primary
                      : Palette.neutrals.heading,
                  }}
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={Palette.neutrals.white}
                  />
                  <Text className="text-white text-xs font-semibold">
                    新增
                  </Text>
                </Pressable>
              </>
            ) : null}
            {showDangerTrigger ? (
              <IconButton
                icon="log-out-outline"
                ariaLabel="危險操作"
                onPress={onDangerPress}
                variant="danger"
                isDark={isDark}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <Text
          className="text-xl font-bold"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-xs mt-1"
            style={{ color: colors.subtitle }}
          >
            {subtitle}
          </Text>
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
  variant?: "default" | "danger";
  isDark: boolean;
};

function IconButton({
  icon,
  onPress,
  ariaLabel,
  variant = "default",
  isDark,
}: IconButtonProps) {
  const isDanger = variant === "danger";
  const backgroundColor = isDanger
    ? isDark
      ? "rgba(239, 68, 68, 0.12)"
      : "#FEF2F2"
    : isDark
    ? Palette.neutralsDark.border
    : "#F3F4F6";
  const borderColor = isDanger
    ? isDark
      ? "rgba(239, 68, 68, 0.3)"
      : "#FECACA"
    : backgroundColor;
  const iconColor =
    variant === "danger"
      ? Palette.status.danger
      : isDark
      ? Palette.neutralsDark.heading
      : Palette.neutrals.heading;
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
