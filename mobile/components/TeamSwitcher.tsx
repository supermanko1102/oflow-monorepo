import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useJoinTeam, useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/auth";

type Props = {
  onClose: () => void;
  showList?: boolean;
};

// 團隊切換與邀請碼加入組件，供 Android/Web 使用 (iOS 用 ActionSheet 搭配此組件的加入表單)
export function TeamSwitcher({ onClose, showList = true }: Props) {
  const { data: teams = [] } = useTeams();
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const joinTeam = useJoinTeam();

  const [inviteCode, setInviteCode] = React.useState("");
  const [joinError, setJoinError] = React.useState<string | null>(null);

  const handleTeamSelect = (selectedTeamId: string) => {
    if (!selectedTeamId || selectedTeamId === currentTeamId) {
      onClose();
      return;
    }
    setCurrentTeamId(selectedTeamId);
    onClose();
  };

  const handleJoinTeam = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setJoinError("請輸入邀請碼");
      return;
    }
    setJoinError(null);
    try {
      const team = await joinTeam.mutateAsync(code);
      const newTeamId = (team as any)?.team_id || (team as any)?.id;
      if (newTeamId) {
        setCurrentTeamId(newTeamId);
      }
      setInviteCode("");
      onClose();
    } catch (error: any) {
      setJoinError(error?.message || "加入失敗，請確認邀請碼或稍後再試");
    }
  };

  return (
    <View className="space-y-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">切換團隊</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={20} color="#0f172a" />
        </Pressable>
      </View>

      {showList ? (
        teams.length === 0 ? (
          <Text className="text-sm text-slate-600">
            目前沒有任何團隊，請先建立或使用邀請碼加入。
          </Text>
        ) : (
          teams.map((team) => {
            const isActive = team.team_id === currentTeamId;
            return (
              <Pressable
                key={team.team_id}
                onPress={() => handleTeamSelect(team.team_id)}
                className={`flex-row items-center justify-between rounded-xl px-3 py-3 ${
                  isActive ? "bg-slate-50" : "bg-white"
                }`}
                style={{ marginBottom: 8 }}
              >
                <View>
                  <Text className="text-sm font-semibold text-slate-900">
                    {team.team_name}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    成員 {team.member_count} 人
                  </Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={20} color="#14b8a6" />
                ) : null}
              </Pressable>
            );
          })
        )
      ) : null}

      {showList ? <View className="h-px bg-slate-200" /> : null}

      <View className="flex-col gap-2">
        <Text className="text-sm font-semibold text-slate-900">
          加入其他團隊
        </Text>
        <TextInput
          value={inviteCode}
          onChangeText={(text) => {
            setInviteCode(text);
            setJoinError(null);
          }}
          placeholder="輸入邀請碼"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          autoCorrect={false}
          className="w-full rounded-xl bg-white px-3 py-3 text-sm border border-slate-200"
        />
        {joinError ? (
          <Text className="text-xs text-slate-600">{joinError}</Text>
        ) : null}
        <Pressable
          disabled={joinTeam.isPending}
          onPress={handleJoinTeam}
          className="h-12 rounded-xl items-center justify-center bg-brand-teal"
          style={{ opacity: joinTeam.isPending ? 0.6 : 1 }}
        >
          {joinTeam.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#fff" size="small" />
              <Text className="text-white font-semibold text-sm">
                加入中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-sm">
              使用邀請碼加入
            </Text>
          )}
        </Pressable>
        <Text className="text-[11px] text-slate-500">
          若沒有邀請碼，請向該團隊管理員索取。
        </Text>
      </View>
    </View>
  );
}
