import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  teamName?: string | null;
  businessLabel: string;
  onSelectBusiness: () => void;
};

export function TeamInfoCard({
  teamName,
  businessLabel,
  onSelectBusiness,
}: Props) {
  return (
    <View className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5 gap-3">
      <Text className="text-sm font-semibold text-slate-900">團隊資訊</Text>
      <Text className="text-xs text-slate-500">
        目前僅開放烘焙・甜點，其餘行業敬請期待
      </Text>
      <View className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[11px] text-slate-500 mb-1">團隊名稱</Text>
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {teamName || "未命名團隊"}
          </Text>
        </View>
      </View>

      <View className="space-y-2">
        <Pressable
          onPress={onSelectBusiness}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-[11px] text-slate-500 mb-1">行業類別</Text>
            <Text className="text-base font-semibold text-slate-900">
              {businessLabel}
            </Text>
            <Text className="text-[12px] text-slate-500 mt-0.5">
              目前僅開放烘焙・甜點，其餘行業敬請期待
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}
