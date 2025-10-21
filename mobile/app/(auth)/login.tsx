import { LogoIcon } from "@/components/icons";
import { Button } from "@/components/native/Button";
import { MOCK_CURRENT_USER_ID } from "@/data/mockTeams";
import * as lineLoginService from "@/services/lineLoginService";
import * as userSyncService from "@/services/userSyncService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTeamStore } from "@/stores/useTeamStore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const loginWithLine = useAuthStore((state) => state.loginWithLine);
  const login = useAuthStore((state) => state.login);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const fetchUserTeams = useTeamStore((state) => state.fetchUserTeams);
  const setCurrentTeam = useTeamStore((state) => state.setCurrentTeam);

  /**
   * 處理 LINE Login 流程
   */
  const handleLineLogin = async () => {
    try {
      setIsLoading(true);

      // 1. 啟動 LINE OAuth 流程並取得 access token
      console.log("[Login] 開始 LINE 登入流程...");
      const authResult = await lineLoginService.initiateLineLogin();

      // 2. 取得 LINE 使用者資料
      console.log("[Login] 取得使用者資料...");
      const lineProfile = await lineLoginService.getLineUserProfile(
        authResult.accessToken
      );

      // 3. 同步至 Supabase
      console.log("[Login] 同步至 Supabase...");
      const supabaseUser = await userSyncService.syncUserWithSupabase(
        lineProfile
      );

      // 4. 更新本地 store
      console.log("[Login] 更新本地狀態...");
      loginWithLine(
        lineProfile.userId,
        supabaseUser.id,
        lineProfile.displayName,
        lineProfile.pictureUrl || null,
        authResult.accessToken
      );

      // 5. 載入團隊資料
      console.log("[Login] 載入團隊資料...");
      await fetchUserTeams(supabaseUser.id);

      // 6. 根據團隊數量決定導航
      const userTeams = useTeamStore.getState().teams;

      if (userTeams.length === 0) {
        // 無團隊：前往團隊設置頁
        console.log("[Login] 無團隊，導向團隊設置頁");
        router.replace("/(auth)/team-setup");
      } else if (userTeams.length === 1) {
        // 單一團隊：直接進入
        const team = userTeams[0];
        console.log("[Login] 單一團隊，直接進入:", team.name);
        setCurrentTeamId(team.id);
        setCurrentTeam(team.id);
        router.replace("/(main)/(tabs)");
      } else {
        // 多個團隊：前往團隊選擇頁
        console.log("[Login] 多個團隊，導向選擇頁");
        router.replace("/(auth)/team-select");
      }
    } catch (error: any) {
      console.error("[Login] 登入失敗:", error);

      // 友善的錯誤訊息
      let errorMessage = "登入失敗，請稍後再試";

      if (error.message === "使用者取消登入") {
        errorMessage = "已取消登入";
      } else if (error.message?.includes("網路")) {
        errorMessage = "網路連線有問題，請檢查網路設定";
      }

      Alert.alert("登入失敗", errorMessage, [{ text: "確定" }]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mock 登入（開發用）
   */
  const handleMockLogin = async () => {
    try {
      setIsLoading(true);

      const mockUserId = MOCK_CURRENT_USER_ID;
      const mockUserName = "王小明";
      const mockUserPictureUrl = null;

      login(mockUserId, mockUserName, mockUserPictureUrl);
      await fetchUserTeams(mockUserId);

      setTimeout(() => {
        const userTeams = useTeamStore.getState().teams;

        if (userTeams.length === 0) {
          router.replace("/(auth)/team-setup");
        } else if (userTeams.length === 1) {
          const team = userTeams[0];
          setCurrentTeamId(team.id);
          setCurrentTeam(team.id);
          router.replace("/(main)/(tabs)");
        } else {
          router.replace("/(auth)/team-select");
        }
      }, 100);
    } catch (error) {
      console.error("[Login] Mock 登入失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Logo / Icon */}
        <View className="mb-8 items-center">
          <View className="mb-4">
            <LogoIcon size={100} color="#00B900" />
          </View>
          <Text className="text-4xl font-black text-gray-900 text-center mb-2">
            OFlow
          </Text>
          <Text className="text-base font-bold text-gray-600 text-center">
            智慧訂單中心
          </Text>
        </View>

        {/* Product Description */}
        <View className="mb-8 w-full">
          <View className="bg-gray-50 rounded-xl p-6 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3 text-center">
              讓 AI 幫你自動處理訂單
            </Text>
            <View className="space-y-3">
              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  自動讀取 LINE 對話
                </Text>
                <Text className="text-xs text-gray-600">
                  AI 自動識別訂單資訊並建立訂單
                </Text>
              </View>

              <View className="mb-3">
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  智慧提醒功能
                </Text>
                <Text className="text-xs text-gray-600">
                  提前提醒，讓你不漏單
                </Text>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  全自動/半自動模式
                </Text>
                <Text className="text-xs text-gray-600">
                  彈性選擇適合你的接單方式
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View className="w-full mb-6">
          <Button
            onPress={handleLineLogin}
            variant="primary"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="text-white font-semibold">登入中...</Text>
              </View>
            ) : (
              "使用 LINE 登入"
            )}
          </Button>
        </View>

        {/* Mock 登入（開發用） */}
        {__DEV__ && (
          <View className="w-full mb-6">
            <Button
              onPress={handleMockLogin}
              variant="secondary"
              fullWidth
              disabled={isLoading}
            >
              開發模式登入 (Mock)
            </Button>
          </View>
        )}

        {/* Footer */}
        <View className="mt-4">
          <Text className="text-xs text-gray-500 text-center">
            你只要聊天，OFlow 就能幫你完成整個接單流程
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
