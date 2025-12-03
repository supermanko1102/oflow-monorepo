import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, View } from "react-native";
import { Palette } from "@/constants/palette";

type QuickActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

export function QuickActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: QuickActionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl border border-slate-100 bg-white p-4 mr-3 shadow-sm active:opacity-70"
    >
      <Ionicons name={icon} size={20} color={Palette.brand.slate} />
      <Text className="text-sm font-bold text-slate-900 " numberOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-xs text-slate-500" numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}
