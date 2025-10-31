import { prefetchTeams } from "@/hooks/queries/useTeams";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

/**
 * Universal Link 處理頁面
 *
 * 此頁面透過 Universal Link 接收來自 website 的 OAuth callback
 * 路徑：https://oflow-website.vercel.app/auth/mobile-redirect?access_token=...
 *
 * iOS 會自動將 Universal Link 導向到這個頁面（配置在 AASA 檔案中）
 */
export default function MobileRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    teams?: string;
    error?: string;
  }>();

  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginWithLine = useAuthStore((state) => state.loginWithLine);
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const hasHandledRef = useRef(false);

  const getSingleParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  useEffect(() => {
    if (!hasHydrated || hasHandledRef.current) {
      return;
    }

    hasHandledRef.current = true;
    handleCallback();
  }, [hasHydrated]);

  const handleCallback = async () => {
    try {
      console.log("[Mobile Redirect] 處理 Universal Link callback");

      // 檢查是否有錯誤
      const errorParam = getSingleParam(params.error);
      if (errorParam) {
        throw new Error(`授權失敗: ${decodeURIComponent(errorParam)}`);
      }

      // 檢查必要參數
      const accessTokenParam = getSingleParam(params.access_token);
      const refreshTokenParam = getSingleParam(params.refresh_token);

      if (!accessTokenParam || !refreshTokenParam) {
        throw new Error("未收到有效的 session tokens");
      }

      console.log("[Mobile Redirect] 收到 session tokens");

      // 1. 設定 Supabase session
      console.log("[Mobile Redirect] 設定 Supabase session...");
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessTokenParam,
          refresh_token: refreshTokenParam,
        });

      if (sessionError || !sessionData.user) {
        throw new Error(sessionError?.message || "Session 設定失敗");
      }

      console.log("[Mobile Redirect] Supabase session 設定成功");

      // 2. 從 user metadata 取得 LINE 資料
      const lineUserId = sessionData.user.user_metadata?.line_user_id || "";
      const displayName =
        sessionData.user.user_metadata?.display_name || "使用者";
      const pictureUrl = sessionData.user.user_metadata?.picture_url || null;

      // 3. 更新本地 store
      console.log("[Mobile Redirect] 更新本地狀態...");
      loginWithLine(
        lineUserId,
        sessionData.user.id,
        displayName,
        pictureUrl,
        accessTokenParam
      );

      // 4. Prefetch teams data
      console.log("[Mobile Redirect] Prefetch 團隊資料...");
      await prefetchTeams(queryClient);

      // 5. 解析團隊資訊
      let teams: any[] = [];
      const teamsParam = getSingleParam(params.teams);
      if (teamsParam) {
        try {
          teams = JSON.parse(decodeURIComponent(teamsParam));
        } catch (e) {
          console.warn("[Mobile Redirect] 團隊資料解析失敗:", e);
        }
      }

      // 6. 根據團隊數量和 LINE 設定狀態決定導航
      if (teams.length === 0) {
        // 無團隊：前往團隊設置頁
        console.log("[Mobile Redirect] 無團隊，導向團隊設置頁");
        router.replace("/(auth)/team-setup");
      } else {
        // 優先檢查是否有未完成 LINE 設定的團隊
        const incompleteTeam = teams.find((t) => !t.line_channel_id);

        if (incompleteTeam) {
          // 有未完成的團隊，強制完成設定
          console.log(
            "[Mobile Redirect] 發現未完成設定的團隊，強制完成:",
            incompleteTeam.team_name
          );
          setCurrentTeamId(incompleteTeam.team_id);
          router.replace("/(auth)/team-webhook");
        } else if (teams.length === 1) {
          // 只有一個團隊且已完成設定
          console.log(
            "[Mobile Redirect] 單一團隊且已設定，進入主頁:",
            teams[0].team_name
          );
          setCurrentTeamId(teams[0].team_id);
          router.replace("/(main)/(tabs)");
        } else {
          // 多個團隊且都已完成設定
          console.log("[Mobile Redirect] 多個團隊（都已完成設定），導向選擇頁");
          router.replace("/(auth)/team-select");
        }
      }
    } catch (error: any) {
      console.error("[Mobile Redirect] 處理失敗:", error);

      // 友善的錯誤訊息
      let message = "登入失敗，請稍後再試";

      if (error.message?.includes("網路")) {
        message = "網路連線有問題，請檢查網路設定";
      } else if (error.message?.includes("Session")) {
        message = "登入驗證失敗，請重新嘗試";
      } else if (error.message?.includes("Configuration")) {
        message = "系統設定錯誤，請聯絡管理員";
      }

      setErrorMessage(message);
      setIsProcessing(false);

      // 顯示錯誤並返回登入頁
      Alert.alert("登入失敗", message, [
        {
          text: "確定",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center items-center px-6">
      {isProcessing ? (
        <>
          <ActivityIndicator size="large" color="#00B900" />
          <Text className="text-base text-gray-600 mt-4">處理登入中...</Text>
        </>
      ) : (
        <>
          <Text className="text-lg font-semibold text-red-600 mb-2">
            登入失敗
          </Text>
          {errorMessage && (
            <Text className="text-sm text-gray-600 text-center">
              {errorMessage}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
