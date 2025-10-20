import { LogoIcon } from "@/components/icons";
import { Button } from "@/components/native/Button";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function TeamSetupScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Logo */}
        <View className="mb-8 items-center">
          <View className="mb-4">
            <LogoIcon size={80} color="#00B900" />
          </View>
          <Text className="text-3xl font-black text-gray-900 text-center mb-2">
            歡迎使用 OFlow
          </Text>
          <Text className="text-base text-gray-600 text-center">
            開始之前，請先建立或加入團隊
          </Text>
        </View>

        {/* 說明 */}
        <View className="bg-gray-50 rounded-xl p-6 mb-8 w-full">
          <Text className="text-sm text-gray-700 text-center leading-6">
            OFlow 以團隊為單位管理訂單。{"\n"}
            你可以建立新團隊，或使用邀請碼加入現有團隊。
          </Text>
        </View>

        {/* 按鈕 */}
        <View className="w-full space-y-3">
          <Button
            onPress={() => router.push("/(auth)/team-create")}
            variant="primary"
            fullWidth
          >
            建立新團隊
          </Button>

          <Button
            onPress={() => router.push("/(auth)/team-join")}
            variant="secondary"
            fullWidth
          >
            加入現有團隊
          </Button>
        </View>

        {/* Footer */}
        <View className="mt-8">
          <Text className="text-xs text-gray-400 text-center">
            建立團隊後，你將成為該團隊的擁有者
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
