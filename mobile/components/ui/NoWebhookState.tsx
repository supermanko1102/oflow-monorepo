import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export function NoWebhookState() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
        <Ionicons name="link" size={48} color="#9CA3AF" />
      </View>
      <Text className="mb-2 text-xl font-bold text-gray-900">
        尚未連接 LINE 官方帳號
      </Text>
      <Text className="mb-8 text-center text-base text-gray-500">
        連接後，AI 將自動讀取訊息並為您整理訂單，讓您輕鬆管理生意
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/(main)/lineConnect" as any)}
        className="rounded-full bg-[#06C755] px-8 py-3"
      >
        <Text className="text-base font-bold text-white">立即連接</Text>
      </TouchableOpacity>
    </View>
  );
}
