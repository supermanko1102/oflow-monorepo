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
      className="w-28 mr-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm active:opacity-70"
      style={{
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: "#F8FAFC" }}
      >
        <Ionicons name={icon} size={20} color={Palette.brand.slate} />
      </View>
      <Text className="text-sm font-bold text-slate-900 mb-1" numberOfLines={1}>
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
