import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";
import { useJoinTeam, useTeams } from "@/hooks/queries/useTeams";
import { AuthStatus, useAuthStore } from "@/stores/auth";

const SUPPORT_LINE_URL = "https://line.me/R/ti/p/@948uomqp";

export default function TeamSetupIndex() {
  const router = useRouter();
  const { inviteCode: inviteCodeParam } = useLocalSearchParams<{
    inviteCode?: string;
  }>();
  const [inviteCode, setInviteCode] = useState(
    typeof inviteCodeParam === "string" ? inviteCodeParam.trim() : ""
  );
  const joinTeam = useJoinTeam();
  const { refetch: refetchTeams } = useTeams();

  const handleContactSupport = async () => {
    try {
      const supported = await Linking.canOpenURL(SUPPORT_LINE_URL);
      if (!supported) {
        Alert.alert("無法開啟 LINE", "請確認是否已安裝 LINE App", [
          { text: "確定" },
        ]);
        return;
      }
      await Linking.openURL(SUPPORT_LINE_URL);
    } catch (error) {
      console.error("open support link failed", error);
      Alert.alert("開啟失敗", "請稍後再試，或改用官方 LINE 搜尋客服。", [
        { text: "確定" },
      ]);
    }
  };

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
      Alert.alert("加入失敗", "邀請碼無效或已過期，請聯繫客服重新取得。", [
        { text: "確定" },
      ]);
    }
  };

  return (
    <OnboardingLayout>
      <View className="gap-6">
        <View className="space-y-2">
          <Text className="text-3xl font-black text-gray-900">
            聯繫客服取得邀請碼
          </Text>
          <Text className="text-sm text-gray-600 leading-5">
            新用戶請先向客服索取專屬邀請碼再加入。
          </Text>
        </View>

        <View className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 space-y-3">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="chatbox-ellipses-outline"
              size={18}
              color={Palette.brand.primary}
            />
            <Text className="text-sm font-semibold text-gray-900">
              客服協助加入
            </Text>
          </View>
          <Text className="text-xs text-emerald-900 leading-5">
            點擊按鈕用 LINE 聯繫客服，索取你的專屬邀請碼，再回來輸入即可。
          </Text>
          <Pressable
            onPress={handleContactSupport}
            className="flex-row items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3"
          >
            <Text className="text-white font-semibold text-sm">
              打開 LINE 聯繫客服
            </Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </Pressable>
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
          <Text className="text-xs text-gray-500 leading-4">
            邀請碼由客服提供，如過期或無效請重新索取。
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
            <Text className="text-white font-semibold text-base">
              使用邀請碼加入
            </Text>
          )}
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
