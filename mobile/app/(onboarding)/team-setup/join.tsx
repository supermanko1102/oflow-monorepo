import { useJoinTeam, useTeams } from "@/hooks/queries/useTeams";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

/**
 * Team Setup - 加入團隊頁面（Onboarding）
 * 讓使用者輸入邀請碼加入現有團隊
 */
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
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-12">
        <View className="mb-8">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-blue-500 text-base">← 返回</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            加入團隊
          </Text>
          <Text className="text-sm text-gray-600">
            輸入團隊管理員提供的邀請碼
          </Text>
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            邀請碼
          </Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="輸入 邀請碼"
            className="w-full h-14 bg-gray-50 rounded-lg px-4 text-base border border-gray-200 tracking-widest"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            autoFocus
          />
        </View>

        <Pressable
          onPress={handleJoinTeam}
          disabled={joinTeam.isPending || !inviteCode.trim()}
          className="w-full h-14 bg-blue-500 rounded-lg items-center justify-center"
          style={{
            opacity: joinTeam.isPending || !inviteCode.trim() ? 0.6 : 1,
          }}
        >
          {joinTeam.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-semibold text-base">
                加入中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">加入團隊</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

