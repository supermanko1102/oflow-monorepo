import { LogoIcon } from "@/components/icons";
import { Button } from "@/components/native/Button";
import { prefetchTeams } from "@/hooks/queries/useTeams";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import * as lineLoginService from "@/services/lineLoginService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTeamStore } from "@/stores/useTeamStore";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const loginWithLine = useAuthStore((state) => state.loginWithLine);
  const setAuthCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const setCurrentTeamId = useTeamStore((state) => state.setCurrentTeamId);

  /**
   * 處理 Auth callback（從 deep link 觸發）
   * 新架構：接收 Supabase session tokens 並設定
   */
  const handleCallback = useCallback(
    async (url: string) => {
      try {
        console.log("[Login] 收到 deep link callback:", url);

        // 1. 解析 session tokens
        const session = await lineLoginService.handleAuthCallback(url);

        // 2. 設定 Supabase session
        console.log("[Login] 設定 Supabase session...");
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

        if (sessionError || !sessionData.user) {
          throw new Error(sessionError?.message || "Session 設定失敗");
        }

        console.log("[Login] Supabase session 設定成功");

        // 3. 從 user metadata 取得 LINE 資料
        const lineUserId = sessionData.user.user_metadata?.line_user_id || "";
        const displayName =
          sessionData.user.user_metadata?.display_name || "使用者";
        const pictureUrl = sessionData.user.user_metadata?.picture_url || null;

        // 4. 更新本地 store
        console.log("[Login] 更新本地狀態...");
        loginWithLine(
          lineUserId,
          sessionData.user.id,
          displayName,
          pictureUrl,
          session.access_token
        );

        // 5. Prefetch teams data (使用 React Query)
        console.log("[Login] Prefetch 團隊資料...");
        await prefetchTeams(queryClient);

        // 6. 從登入回應取得團隊資訊
        const teams = session.teams || [];

        // 7. 根據團隊數量決定導航
        if (teams.length === 0) {
          // 無團隊：前往團隊設置頁
          console.log("[Login] 無團隊，導向團隊設置頁");
          router.replace("/(auth)/team-setup");
        } else if (teams.length === 1) {
          // 單一團隊：直接進入
          const team = teams[0];
          console.log("[Login] 單一團隊，直接進入:", team.team_name);
          setAuthCurrentTeamId(team.team_id);
          setCurrentTeamId(team.team_id);
          router.replace("/(main)/(tabs)");
        } else {
          // 多個團隊：前往團隊選擇頁
          console.log("[Login] 多個團隊，導向選擇頁");
          router.replace("/(auth)/team-select");
        }
      } catch (error: any) {
        console.error("[Login] Callback 處理失敗:", error);

        // 友善的錯誤訊息
        let errorMessage = "登入失敗，請稍後再試";
        let showDetails = false;

        if (error.message?.includes("網路")) {
          errorMessage = "網路連線有問題，請檢查網路設定";
        } else if (error.message?.includes("Session")) {
          errorMessage = "登入驗證失敗，請重新嘗試";
        } else if (error.message?.includes("Configuration")) {
          errorMessage = "系統設定錯誤，請聯絡管理員";
          showDetails = __DEV__; // 開發模式下顯示詳細錯誤
        }

        const alertMessage = showDetails
          ? `${errorMessage}\n\n錯誤詳情: ${error.message}`
          : errorMessage;

        Alert.alert("登入失敗", alertMessage, [{ text: "確定" }]);
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithLine, setAuthCurrentTeamId, setCurrentTeamId, router]
  );

  /**
   * 監聽 deep link URL 事件
   */
  useEffect(() => {
    // 監聽 URL 事件（app 在背景時）
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[Login] Deep link 事件:", event.url);
      // 新架構：監聽 oflow://auth?access_token=...
      if (event.url.includes("oflow://auth")) {
        handleCallback(event.url);
      }
    });

    // 檢查初始 URL（app 從關閉狀態啟動）
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("oflow://auth")) {
        console.log("[Login] 初始 URL:", url);
        handleCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleCallback]);

  /**
   * 處理 LINE Login 流程（只啟動授權）
   */
  const handleLineLogin = async () => {
    try {
      setIsLoading(true);

      // 啟動 LINE OAuth 流程（開啟瀏覽器）
      console.log("[Login] 開始 LINE 登入流程...");
      await lineLoginService.initiateLineLogin();

      // 注意：此時不要 setIsLoading(false)
      // 保持 loading 狀態直到收到 callback
      console.log("[Login] 等待用戶授權...");
    } catch (error: any) {
      console.error("[Login] 登入啟動失敗:", error);
      setIsLoading(false);

      Alert.alert("登入失敗", "無法啟動 LINE 登入，請稍後再試", [
        { text: "確定" },
      ]);
    }
  };

  /**
   * Mock 登入（已停用 - 新架構需要真實 access token）
   */
  const handleMockLogin = async () => {
    Alert.alert(
      "Mock 登入已停用",
      "新架構需要真實的 LINE 登入。請使用「使用 LINE 登入」按鈕。",
      [{ text: "確定" }]
    );
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
