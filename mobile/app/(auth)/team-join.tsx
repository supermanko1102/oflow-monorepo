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

export default function TeamJoinScreen() {
  const router = useRouter();
  const toast = useToast();
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const joinTeam = useTeamStore((state) => state.joinTeam);
  const setCurrentTeam = useTeamStore((state) => state.setCurrentTeam);

  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error("請輸入邀請碼");
      return;
    }

    setIsSubmitting(true);

    try {
      // 加入團隊（現在是 async API）
      const team = await joinTeam(inviteCode.trim());

      // 設定為當前團隊
      setCurrentTeamId(team.id);
      setCurrentTeam(team.id);

      toast.success(`已成功加入「${team.name}」！`);

      // 導航到主頁
      router.replace("/(main)/(tabs)");
    } catch (error: any) {
      console.error("[Team Join] 加入失敗:", error);
      const message = error.message || "加入失敗，請稍後再試";
      toast.error(
        message.includes("Invalid") ? "邀請碼無效，請檢查後重試" : message
      );
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
              加入團隊
            </Text>
            <Text className="text-base text-gray-600">
              輸入團隊管理員提供的邀請碼
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-6">
            {/* 邀請碼輸入 */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                邀請碼 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="輸入邀請碼"
                autoCapitalize="characters"
                className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-4 text-2xl text-center text-gray-900 tracking-widest font-bold"
                placeholderTextColor="#9CA3AF"
              />
              <Text className="text-xs text-gray-500 mt-1 text-center">
                邀請碼由團隊管理員提供
              </Text>
            </View>

            {/* 說明 */}
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Text className="text-sm text-blue-900 font-semibold mb-2">
                💡 如何取得邀請碼？
              </Text>
              <Text className="text-sm text-blue-800 leading-5">
                請向團隊管理員或擁有者索取邀請碼。{"\n"}
                他們可以在「設定」→「成員管理」中找到邀請碼。
              </Text>
            </View>

            {/* 範例 */}
            <View className="bg-gray-50 rounded-lg p-4">
              <Text className="text-xs text-gray-500 mb-2">邀請碼範例</Text>
              <View className="flex-row items-center justify-center">
                <View className="bg-white border border-gray-300 rounded px-3 py-2">
                  <Text className="text-lg font-bold text-gray-400 tracking-widest">
                    123456
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-8 space-y-3">
            <Button
              onPress={handleJoin}
              variant="primary"
              fullWidth
              disabled={isSubmitting || !inviteCode.trim()}
            >
              {isSubmitting ? "加入中..." : "加入團隊"}
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
