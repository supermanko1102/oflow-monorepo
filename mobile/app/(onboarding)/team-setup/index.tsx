import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

/**
 * Team Setup - 選擇模式頁面（Onboarding）
 * 讓使用者選擇要建立新團隊或加入現有團隊
 */
export default function TeamSetupIndex() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Header */}
        <View className="mb-12 items-center">
          <Text className="text-3xl font-black text-gray-900 mb-2">
            歡迎來到 OFlow
          </Text>
          <Text className="text-base text-gray-600 text-center">
            開始使用前，請建立或加入團隊
          </Text>
        </View>

        {/* 選項 */}
        <View className="w-full space-y-4">
          {/* 建立新團隊 */}
          <Pressable
            onPress={() => router.push("/(onboarding)/team-setup/create")}
            className="w-full bg-blue-500 rounded-xl p-6 mb-4"
          >
            <Text className="text-white font-bold text-xl mb-2">
              建立新團隊
            </Text>
            <Text className="text-blue-100 text-sm">
              建立屬於你的團隊，邀請成員一起管理訂單
            </Text>
          </Pressable>

          {/* 加入現有團隊 */}
          <Pressable
            onPress={() => router.push("/(onboarding)/team-setup/join")}
            className="w-full bg-gray-100 rounded-xl p-6 border-2 border-gray-300"
          >
            <Text className="text-gray-900 font-bold text-xl mb-2">
              加入現有團隊
            </Text>
            <Text className="text-gray-600 text-sm">
              使用邀請碼加入其他人的團隊
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

