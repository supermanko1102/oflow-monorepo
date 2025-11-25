import { Text, View } from "react-native";
import { SettingItem, SettingRow } from "./SettingRow";

type Props = {
  title: string;
  description?: string;
  items: SettingItem[];
  isDisabled?: boolean;
  disabledLabel?: string;
};

export function SettingSection({
  title,
  description,
  items,
  isDisabled,
  disabledLabel,
}: Props) {
  return (
    <View className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden relative">
      <View className="px-5 pt-5 pb-3 border-b border-slate-50">
        <Text
          className="text-[11px] font-semibold uppercase text-slate-400"
          style={{ letterSpacing: 2 }}
        >
          {title}
        </Text>
        {description && (
          <Text className="text-sm text-slate-500 mt-1">{description}</Text>
        )}
      </View>

      {items.map((item, index) => (
        <SettingRow
          key={item.label}
          {...item}
          showDivider={index < items.length - 1}
        />
      ))}

      {isDisabled ? (
        <View className="absolute inset-0 bg-black/40 items-center justify-center px-6">
          <Text className="text-white font-semibold text-center">
            {disabledLabel || "尚未開放"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
