import { useCreateTeam, useTeams } from "@/hooks/queries/useTeams";
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

export default function CreateTeam() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");

  const createTeam = useCreateTeam();
  const { refetch: refetchTeams } = useTeams();
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("請輸入團隊名稱", "團隊名稱不能為空", [{ text: "確定" }]);
      return;
    }

    try {
      const newTeam = await createTeam.mutateAsync({
        team_name: teamName.trim(),
      });

      useAuthStore.setState({
        currentTeamId: newTeam.id,
        status: AuthStatus.NoWebhook, // 建立團隊後需要設定 webhook
      });

      await refetchTeams();

      Alert.alert(
        "建立成功",
        `團隊「${teamName}」已建立，接下來請設定 LINE 官方帳號`,
        [{ text: "確定" }]
      );

      router.replace("/(main)/line-setup");
    } catch (error) {
      console.error("建立團隊失敗:", error);
      Alert.alert("建立失敗", "無法建立團隊，請稍後再試", [{ text: "確定" }]);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-12">
        {/* Header */}
        <View className="mb-8">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-blue-500 text-base">← 返回</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            建立新團隊
          </Text>
          <Text className="text-sm text-gray-600">
            為你的團隊取個好名字吧！
          </Text>
        </View>

        {/* 輸入表單 */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            團隊名稱
          </Text>
          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            placeholder="例如：美味餐廳、甜點工作室"
            className="w-full h-14 bg-gray-50 rounded-lg px-4 text-base border border-gray-200"
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
        </View>

        {/* 建立按鈕 */}
        <Pressable
          onPress={handleCreateTeam}
          disabled={createTeam.isPending || !teamName.trim()}
          className="w-full h-14 bg-blue-500 rounded-lg items-center justify-center"
          style={{
            opacity: createTeam.isPending || !teamName.trim() ? 0.6 : 1,
          }}
        >
          {createTeam.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-semibold text-base">
                建立中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">建立團隊</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
