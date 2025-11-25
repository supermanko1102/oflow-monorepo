import { Text, TouchableOpacity, View } from "react-native";
import { Palette } from "@/constants/palette";

type Option = {
  label: string;
  value: string;
  badge?: number;
};

type SegmentedControlProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark" | "brand" | "danger";
};

const themeTokens = {
  light: {
    accent: "#0F172A",
    containerBg: "#F8FAFC",
    containerBorder: "#E2E8F0",
    activeBg: "#FFFFFF",
    activeBorder: "#E2E8F0",
    inactiveText: "#64748B",
    badgeBg: "#E2E8F0",
    badgeText: "#334155",
    badgeActiveBg: "#0F172A",
    badgeActiveText: "#FFFFFF",
  },
  brand: {
    accent: Palette.brand.primary,
    containerBg: "#F1F5F9",
    containerBorder: "rgba(0,128,128,0.18)",
    activeBg: "rgba(0,128,128,0.12)",
    activeBorder: "rgba(0,128,128,0.4)",
    inactiveText: Palette.brand.slate,
    badgeBg: "rgba(0,128,128,0.08)",
    badgeText: Palette.brand.primary,
    badgeActiveBg: Palette.brand.primary,
    badgeActiveText: "#FFFFFF",
  },
  danger: {
    accent: Palette.status.danger,
    containerBg: "#FFF5F5",
    containerBorder: "rgba(239,68,68,0.25)",
    activeBg: "rgba(239,68,68,0.12)",
    activeBorder: "rgba(239,68,68,0.45)",
    inactiveText: "#B91C1C",
    badgeBg: "rgba(239,68,68,0.1)",
    badgeText: "#B91C1C",
    badgeActiveBg: Palette.status.danger,
    badgeActiveText: "#FFFFFF",
  },
  dark: {
    accent: "#FFFFFF",
    containerBg: "rgba(15,23,42,0.85)",
    containerBorder: "rgba(255,255,255,0.12)",
    activeBg: "rgba(255,255,255,0.12)",
    activeBorder: "rgba(255,255,255,0.3)",
    inactiveText: "rgba(255,255,255,0.72)",
    badgeBg: "rgba(255,255,255,0.1)",
    badgeText: "#FFFFFF",
    badgeActiveBg: "#FFFFFF",
    badgeActiveText: "#0F172A",
  },
} as const;

export function SegmentedControl({
  options,
  value,
  onChange,
  theme = "light",
}: SegmentedControlProps) {
  const tokens = themeTokens[theme];

  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        backgroundColor: tokens.containerBg,
        borderColor: tokens.containerBorder,
        borderWidth: 1,
        padding: 4,
        gap: 6,
      }}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-row items-center rounded-full px-4 py-2"
            style={{
              backgroundColor: isActive ? tokens.activeBg : undefined,
              borderColor: isActive ? tokens.activeBorder : "transparent",
              borderWidth: 1,
              gap: 6,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: isActive ? tokens.accent : tokens.inactiveText }}
            >
              {option.label}
            </Text>
            {option.badge !== undefined ? (
              <View
                className="rounded-full min-w-[18px] h-5 items-center justify-center px-1.5"
                style={{
                  backgroundColor: isActive
                    ? tokens.badgeActiveBg
                    : tokens.badgeBg,
                  borderColor: isActive
                    ? tokens.badgeActiveBg
                    : tokens.containerBorder,
                  borderWidth: 1,
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: isActive
                      ? tokens.badgeActiveText
                      : tokens.badgeText,
                  }}
                >
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
