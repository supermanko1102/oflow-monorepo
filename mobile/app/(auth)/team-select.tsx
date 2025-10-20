import { useAuthStore } from "@/stores/useAuthStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { UserTeam } from "@/types/team";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function TeamSelectScreen() {
  const router = useRouter();
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const teams = useTeamStore((state) => state.teams);
  const setCurrentTeam = useTeamStore((state) => state.setCurrentTeam);

  const handleSelectTeam = (team: UserTeam) => {
    setCurrentTeamId(team.id);
    setCurrentTeam(team.id);
    router.replace("/(main)/(tabs)");
  };

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
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              onPress={() => handleSelectTeam(team)}
              className="bg-white border-2 border-gray-200 rounded-xl p-4 active:bg-gray-50"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xl font-bold text-gray-900">
                  {team.name}
                </Text>
                <View
                  className={`px-3 py-1 rounded-full ${getRoleBadgeColor(
                    team.myRole
                  )}`}
                >
                  <Text className="text-xs font-semibold">
                    {getRoleText(team.myRole)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <Text className="text-sm text-gray-500">
                  {team.memberCount} 位成員
                </Text>
                {team.lineOfficialAccountId && (
                  <>
                    <Text className="text-gray-300 mx-2">•</Text>
                    <Text className="text-sm text-gray-500">
                      {team.lineOfficialAccountId}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
