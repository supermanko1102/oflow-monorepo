import { Button } from "@/components/native/Button";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function TeamCreateScreen() {
  const router = useRouter();
  const toast = useToast();
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const createTeam = useTeamStore((state) => state.createTeam);
  const setCurrentTeam = useTeamStore((state) => state.setCurrentTeam);

  const [teamName, setTeamName] = useState("");
  const [lineAccountId, setLineAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast.error("請輸入團隊名稱");
      return;
    }

    setIsSubmitting(true);

    try {
      // 建立團隊（現在是 async API）
      const newTeam = await createTeam(
        teamName.trim(),
        lineAccountId.trim() || null
      );

      // 設定為當前團隊
      setCurrentTeamId(newTeam.id);
      setCurrentTeam(newTeam.id);

      toast.success("團隊建立成功！");

      // 導航到主頁
      router.replace("/(main)/(tabs)");
    } catch (error: any) {
      console.error("[Team Create] 建立失敗:", error);
      toast.error(error.message || "建立失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-black text-gray-900 mb-2">
              建立新團隊
            </Text>
            <Text className="text-base text-gray-600">
              設定團隊資訊並綁定 LINE 官方帳號
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-6">
            {/* 團隊名稱 */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                團隊名稱 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={teamName}
                onChangeText={setTeamName}
                placeholder="例如：甜點小舖"
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
              <Text className="text-xs text-gray-500 mt-1">
                這將顯示在應用程式中，可隨時修改
              </Text>
            </View>

            {/* LINE 官方帳號 ID */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                LINE 官方帳號 ID
              </Text>
              <TextInput
                value={lineAccountId}
                onChangeText={setLineAccountId}
                placeholder="例如：@sweetshop"
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Text className="text-xs text-gray-500 mt-1">
                綁定後 OFlow 將自動讀取該帳號的訊息（可選）
              </Text>
            </View>

            {/* 說明 */}
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text className="text-sm text-blue-900 font-semibold mb-2">
                💡 提示
              </Text>
              <Text className="text-sm text-blue-800 leading-5">
                建立團隊後，你將成為團隊的擁有者。{"\n"}
                你可以邀請其他成員加入，並管理團隊設定。
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-8 space-y-3">
            <Button
              onPress={handleCreate}
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "建立中..." : "建立團隊"}
            </Button>

            <Button
              onPress={() => router.back()}
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
            >
              返回
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
