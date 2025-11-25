import { Palette } from "@/constants/palette";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, Text, View } from "react-native";

export type ActionVariant = "default" | "primary";
export type StatusTone = "success" | "muted";

export type SettingItem = {
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

type Props = SettingItem & { showDivider?: boolean };

export function SettingRow({
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
}: Props) {
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
          onPress={() => Alert.alert("暫不可操作", disabledText)}
        >
          <Text className="text-white font-semibold">{disabledText}</Text>
        </Pressable>
      ) : null}

      {showDivider && <View className="h-px bg-slate-50 mx-5" />}
    </View>
  );
}
