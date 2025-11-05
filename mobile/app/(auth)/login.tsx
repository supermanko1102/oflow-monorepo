import { Button } from "@/components/native/Button";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { prefetchTeams } from "@/hooks/queries/useTeams";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import * as lineLoginService from "@/services/lineLoginService";
import { useAuthStore } from "@/stores/useAuthStore";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // App Store 審核用帳密登入
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginWithLine = useAuthStore((state) => state.loginWithLine);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);

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
        console.log("[Login] 收到 session:", session);

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

        // 6. 從 cache 讀取團隊資料（使用已 prefetch 的真實資料）
        const teams =
          queryClient.getQueryData<any[]>(queryKeys.teams.list()) || [];
        console.log("[Login] 從 cache 讀取團隊資料:", teams.length, "個團隊");

        // 7. 根據團隊數量和 LINE 設定狀態決定導航
        if (teams.length === 0) {
          // 無團隊：前往團隊設置頁
          console.log("[Login] 無團隊，導向團隊設置頁");
          router.replace("/(auth)/team-setup");
        } else {
          // 優先檢查是否有未完成 LINE 設定的團隊
          const incompleteTeam = teams.find((t) => !t.line_channel_id);

          if (incompleteTeam) {
            // 有未完成的團隊，強制完成設定
            console.log(
              "[Login] 發現未完成設定的團隊，強制完成:",
              incompleteTeam.team_name
            );
            setCurrentTeamId(incompleteTeam.team_id);
            router.replace("/(auth)/team-webhook");
          } else {
            // 單個或多個團隊且都已完成設定，選擇第一個進入
            // 用戶可以之後在 settings 切換團隊
            console.log(
              "[Login] 團隊已設定，選擇第一個團隊進入主頁:",
              teams[0].team_name
            );
            setCurrentTeamId(teams[0].team_id);
            router.replace("/(main)/(tabs)");
          }
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
    [loginWithLine, setCurrentTeamId, router]
  );

  /**
   * 監聽 deep link URL 事件
   * 支援 Universal Link 和 URL Scheme
   */
  useEffect(() => {
    // 監聽 URL 事件（app 在背景時）
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[Login] Deep link 事件:", event.url);
      // 支援兩種格式：
      // 1. Universal Link: https://oflow-website.vercel.app/auth/callback?access_token=...
      // 2. URL Scheme (向後兼容): oflow://auth?access_token=...
      if (
        event.url.includes("oflow://auth") ||
        event.url.includes("oflow-website.vercel.app/auth/callback")
      ) {
        handleCallback(event.url);
      }
    });

    // 檢查初始 URL（app 從關閉狀態啟動）
    Linking.getInitialURL().then((url) => {
      if (
        url &&
        (url.includes("oflow://auth") ||
          url.includes("oflow-website.vercel.app/auth/callback"))
      ) {
        console.log("[Login] 初始 URL:", url);
        handleCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleCallback]);

  /**
   * 處理 LINE Login 流程
   * 使用 openAuthSessionAsync 會直接返回 redirect URL
   */
  const handleLineLogin = async () => {
    try {
      setIsLoading(true);

      // 啟動 LINE OAuth 流程（開啟瀏覽器）
      console.log("[Login] 開始 LINE 登入流程...");
      const redirectUrl = await lineLoginService.initiateLineLogin();

      // 處理返回結果
      if (redirectUrl) {
        console.log("[Login] 收到 redirect URL，開始處理 callback...");
        await handleCallback(redirectUrl);
      } else {
        // 用戶取消授權
        console.log("[Login] 用戶取消登入");
        setIsLoading(false);
        Alert.alert("登入已取消", "您已取消 LINE 登入", [{ text: "確定" }]);
      }
    } catch (error: any) {
      console.error("[Login] 登入失敗:", error);
      setIsLoading(false);

      Alert.alert("登入失敗", "無法完成 LINE 登入，請稍後再試", [
        { text: "確定" },
      ]);
    }
  };

  /**
   * 處理帳密登入（僅供 App Store 審核使用）
   * 使用 Supabase email/password 登入
   */
  const handleEmailLogin = async () => {
    try {
      setIsLoading(true);
      console.log("[Login] 開始帳密登入...");

      // 驗證輸入
      if (!email || !password) {
        Alert.alert("請輸入帳號密碼", "請填寫完整的帳號和密碼", [
          { text: "確定" },
        ]);
        setIsLoading(false);
        return;
      }

      // 使用 Supabase email/password 登入
      console.log("[Login] 使用帳密登入 Supabase...");
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "登入失敗");
      }

      console.log("[Login] 帳密登入成功");

      // 從 user metadata 取得資料
      const lineUserId =
        authData.user.user_metadata?.line_user_id || "TEST_REVIEWER_LINE_ID";
      const displayName =
        authData.user.user_metadata?.display_name ||
        authData.user.email?.split("@")[0] ||
        "測試用戶";
      const pictureUrl = authData.user.user_metadata?.picture_url || null;

      // 更新本地 store
      console.log("[Login] 更新本地狀態...");
      loginWithLine(
        lineUserId,
        authData.user.id,
        displayName,
        pictureUrl,
        authData.session?.access_token || ""
      );

      // Prefetch teams data
      console.log("[Login] Prefetch 團隊資料...");
      await prefetchTeams(queryClient);

      // 從 cache 讀取團隊資料
      const teams =
        queryClient.getQueryData<any[]>(queryKeys.teams.list()) || [];
      console.log("[Login] 團隊數量:", teams.length);

      // 導航到主頁面
      if (teams.length === 0) {
        console.log("[Login] 無團隊，導向團隊設置頁");
        router.replace("/(auth)/team-setup");
      } else {
        // 檢查是否有未完成 LINE 設定的團隊
        const incompleteTeam = teams.find((t) => !t.line_channel_id);

        if (incompleteTeam) {
          console.log("[Login] 團隊未完成設定");
          setCurrentTeamId(incompleteTeam.team_id);
          router.replace("/(auth)/team-webhook");
        } else {
          // 選擇第一個團隊進入主頁
          console.log("[Login] 登入成功，進入主頁:", teams[0].team_name);
          setCurrentTeamId(teams[0].team_id);
          router.replace("/(main)/(tabs)");
        }
      }
    } catch (error: any) {
      console.error("[Login] 帳密登入失敗:", error);
      setIsLoading(false);

      // 友善的錯誤訊息
      let errorMessage = "登入失敗，請稍後再試";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "帳號或密碼錯誤，請重新輸入";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Email 尚未驗證，請先驗證 Email";
      } else if (error.message?.includes("network")) {
        errorMessage = "網路連線有問題，請檢查網路設定";
      }

      Alert.alert("登入失敗", errorMessage, [{ text: "確定" }]);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Logo / Icon */}
        <View className="mb-8 items-center">
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

        {/* ============================================ */}
        {/* 🚨 App Store 審核用帳密登入區塊 */}
        {/* 審核通過後，請註解掉以下整個區塊 */}
        {/* ============================================ */}
        <View className="w-full mb-4">
          {/* 分隔線 */}
          <View className="flex-row items-center mb-4">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-3 text-xs text-gray-500">或</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* 一般帳號登入按鈕 */}
          {!showEmailLogin ? (
            <Pressable
              onPress={() => setShowEmailLogin(true)}
              disabled={isLoading}
              className="px-6 py-4 rounded-xl w-full bg-gray-100 border border-gray-300"
              style={({ pressed }) => [
                { opacity: pressed && !isLoading ? 0.8 : 1 },
                pressed && !isLoading && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-gray-700 font-semibold">帳號登入</Text>
              </View>
            </Pressable>
          ) : (
            <>
              {/* Email 輸入框 */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </Text>
                <TextInput
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                  placeholder="example@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Password 輸入框 */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-1.5">
                  密碼
                </Text>
                <TextInput
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* 登入和返回按鈕 */}
              <View className="flex-row gap-3">
                {/* 返回按鈕 */}
                <Pressable
                  onPress={() => {
                    setShowEmailLogin(false);
                    setEmail("");
                    setPassword("");
                  }}
                  disabled={isLoading}
                  className="px-4 py-4 rounded-xl bg-gray-100 border border-gray-300"
                  style={({ pressed }) => [
                    { opacity: pressed && !isLoading ? 0.8 : 1 },
                    pressed && !isLoading && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text className="text-gray-700 font-semibold text-center">
                    返回
                  </Text>
                </Pressable>

                {/* 登入按鈕 */}
                <Pressable
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                  className="flex-1 px-6 py-4 rounded-xl bg-orange-500"
                  style={({ pressed }) => [
                    { opacity: pressed && !isLoading ? 0.8 : 1 },
                    pressed && !isLoading && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {isLoading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="white" className="mr-2" />
                      <Text className="text-white font-semibold">
                        登入中...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold text-center">
                      登入
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
        {/* ============================================ */}

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
