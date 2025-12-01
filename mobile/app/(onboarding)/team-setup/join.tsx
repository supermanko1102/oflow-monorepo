import { Ionicons } from "@expo/vector-icons";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";
import { useJoinTeam, useTeams } from "@/hooks/queries/useTeams";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function JoinTeam() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const joinTeam = useJoinTeam();
  const { refetch: refetchTeams } = useTeams();

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("請輸入邀請碼", "邀請碼不能為空", [{ text: "確定" }]);
      return;
    }

    try {
      const team = await joinTeam.mutateAsync(inviteCode.trim());
      useAuthStore.setState({
        currentTeamId: team.team_id,
        status: AuthStatus.Active,
      });

      await refetchTeams();

      Alert.alert("加入成功", `已加入團隊「${team.team_name}」`, [
        { text: "確定" },
      ]);

      router.replace("/(main)/(tabs)/inbox");
    } catch (error) {
      console.error("加入團隊失敗:", error);
      Alert.alert("加入失敗", "邀請碼無效或已過期，請檢查後重試", [
        { text: "確定" },
      ]);
    }
  };

  return (
    <OnboardingLayout>
      <View className="gap-6">
        <Pressable
          onPress={() => router.back()}
          className="self-start flex-row items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2"
        >
          <Ionicons name="chevron-back" size={16} color="#0F172A" />
          <Text className="text-xs font-semibold text-gray-900">返回</Text>
        </Pressable>

        <View className="space-y-2">
          <Text className="text-3xl font-black text-gray-900">加入團隊</Text>
          <Text className="text-sm text-gray-600">
            使用團隊分享的邀請碼，加入他們的工作區一起協作。
          </Text>
        </View>

        <View className="rounded-3xl border border-gray-100 bg-white/95 p-4 space-y-3">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="key-outline"
              size={18}
              color={Palette.brand.primary}
            />
            <Text className="text-sm font-semibold text-gray-900">
              在哪裡拿到邀請碼？
            </Text>
          </View>
          <View className="space-y-2">
            {[
              "由團隊管理員於設定→邀請成員中產生",
              "多數邀請碼為 6-10 碼英文/數字",
              "若不確定可先聯繫分享邀請的人",
            ].map((text) => (
              <View key={text} className="flex-row items-start gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                <Text className="text-xs text-gray-600 flex-1">{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="space-y-3">
          <Text className="text-sm font-semibold text-gray-700">
            輸入邀請碼
          </Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="例如：OFLOW1234"
            className="w-full h-16 bg-white rounded-3xl px-4 text-center text-base border border-gray-200 tracking-widest"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={30}
            autoFocus
          />
          <Text className="text-xs text-gray-500">
            如果邀請碼超過期限，請請求新的邀請碼。
          </Text>
        </View>

        <Pressable
          onPress={handleJoinTeam}
          disabled={joinTeam.isPending || !inviteCode.trim()}
          className="w-full h-14 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: Palette.brand.primary,
            opacity: joinTeam.isPending || !inviteCode.trim() ? 0.6 : 1,
          }}
        >
          {joinTeam.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-semibold text-base">
                加入中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">加入團隊</Text>
          )}
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
