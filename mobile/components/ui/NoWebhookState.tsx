import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  blocking?: boolean;
};

export function NoWebhookState({ blocking = true }: Props) {
  const router = useRouter();

  return (
    <View
      className="absolute inset-0 z-50"
      pointerEvents={blocking ? "auto" : "box-none"}
      style={{ elevation: 50 }}
    >
      <View className="absolute inset-0 bg-black/45" pointerEvents="none" />

      <View className="flex-1 items-center justify-center p-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white/20">
          <Ionicons name="link" size={48} color="#E2E8F0" />
        </View>
        <Text className="mb-2 text-xl font-bold text-white">
          尚未連接 LINE 官方帳號
        </Text>
        <Text className="mb-8 text-center text-base text-slate-100">
          連接後，AI 將自動讀取訊息並為您整理訂單，讓您輕鬆管理生意
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(main)/lineConnect" as any)}
          className="rounded-full bg-[#06C755] px-8 py-3 shadow-lg shadow-black/20"
        >
          <Text className="text-base font-bold text-white">立即連接</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
