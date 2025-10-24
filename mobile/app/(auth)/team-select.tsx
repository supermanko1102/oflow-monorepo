import { LoadingState } from "@/components/LoadingState";
import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TeamSelectScreen() {
  const router = useRouter();
  
  // Auth & Team Store (client state)
  const setAuthCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const setCurrentTeamId = useTeamStore((state) => state.setCurrentTeamId);

  // React Query (server state)
  const { data: teams, isLoading, error, refetch } = useTeams();

  const handleSelectTeam = (teamId: string) => {
    // 設定到兩個 stores（為了向後相容）
    setAuthCurrentTeamId(teamId);
    setCurrentTeamId(teamId);
    router.replace("/(main)/(tabs)");
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#00B900" />
        <Text className="mt-4 text-gray-600">載入團隊中...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-xl font-bold text-gray-900 mb-2">載入失敗</Text>
        <Text className="text-gray-600 text-center mb-6">
          {error instanceof Error ? error.message : "無法載入團隊列表"}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="bg-green-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">重試</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "owner":
        return "擁有者";
      case "admin":
        return "管理員";
      case "member":
        return "成員";
      default:
        return "";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-700";
      case "admin":
        return "bg-blue-100 text-blue-700";
      case "member":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-12">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-black text-gray-900 mb-2">
            選擇團隊
          </Text>
          <Text className="text-base text-gray-600">
            你是以下團隊的成員，請選擇要使用的團隊
          </Text>
        </View>

        {/* 團隊列表 */}
        <View className="space-y-3">
          {teams && teams.length > 0 ? (
            teams.map((team) => (
              <TouchableOpacity
                key={team.team_id}
                onPress={() => handleSelectTeam(team.team_id)}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 active:bg-gray-50"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-gray-900">
                    {team.team_name}
                  </Text>
                  <View
                    className={`px-3 py-1 rounded-full ${getRoleBadgeColor(
                      team.role
                    )}`}
                  >
                    <Text className="text-xs font-semibold">
                      {getRoleText(team.role)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Text className="text-sm text-gray-500">
                    {team.member_count} 位成員
                  </Text>
                  {team.line_channel_name && (
                    <>
                      <Text className="text-gray-300 mx-2">•</Text>
                      <Text className="text-sm text-gray-500">
                        {team.line_channel_name}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="py-12 items-center">
              <Text className="text-gray-500 text-center">
                你還沒有加入任何團隊
              </Text>
            </View>
          )}
        </View>

        {/* 建立新團隊選項 */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/team-setup")}
          className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-xl items-center"
        >
          <Text className="text-gray-500 font-medium">
            + 建立或加入其他團隊
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
