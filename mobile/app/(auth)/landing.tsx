import { supabase } from "@/lib/supabase";
import { initiateAppleLogin } from "@/services/apple";
import { loginWithApple, loginWithLine } from "@/services/auth";
import { handleAuthCallback, initiateLineLogin } from "@/services/line";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);

  // LINE 登入處理函數
  const handleLineLogin = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = await initiateLineLogin();
      if (!redirectUrl) {
        Alert.alert("登入已取消", "您已取消 LINE 登入", [{ text: "確定" }]);
        return;
      }
      const session = await handleAuthCallback(redirectUrl);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

      if (sessionError || !sessionData.user) {
        throw new Error(sessionError?.message || "Session 設定失敗");
      }

      const lineUserId = sessionData.user.user_metadata?.line_user_id || "";
      const displayName =
        sessionData.user.user_metadata?.display_name || "使用者";
      const pictureUrl = sessionData.user.user_metadata?.picture_url || null;

      await loginWithLine(
        lineUserId,
        sessionData.user.id,
        displayName,
        pictureUrl,
        session.access_token
      );
    } catch (e) {
      e instanceof Error && console.log(`AuthLayout: Blocking [${e.message}]`);
      Alert.alert("登入失敗", "無法完成 LINE 登入，請稍後再試", [
        { text: "確定" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apple 登入處理函數
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);

      // 1. 透過 Apple Service 取得 Supabase session
      const session = await initiateAppleLogin();

      // 2. 將 session 設定到 Supabase client
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

      if (sessionError || !sessionData.user) {
        throw new Error(sessionError?.message || "Session 設定失敗");
      }

      // 3. 更新 Auth Store 狀態
      await loginWithApple(
        sessionData.user.id,
        session.access_token,
        session.refresh_token
      );
    } catch (e) {
      // 紀錄錯誤訊息
      if (e instanceof Error) {
        console.log(`Apple Login: Error [${e.message}]`);

        // 處理使用者取消的情況
        if (e.message === "使用者取消登入") {
          Alert.alert("登入已取消", "您已取消 Apple 登入", [{ text: "確定" }]);
          return;
        }
      }

      // 其他錯誤
      Alert.alert("登入失敗", "無法完成 Apple 登入，請稍後再試", [
        { text: "確定" },
      ]);
    } finally {
      setIsLoading(false);
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

        {/* LINE 登入（主要） */}
        <View className="w-full mb-6">
          <Pressable
            onPress={() => handleLineLogin()}
            disabled={isLoading}
            className="w-full h-14 bg-green-500 rounded-md items-center justify-center"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="text-white font-semibold text-xl">
                  登入中...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-xl">
                使用 LINE 登入
              </Text>
            )}
          </Pressable>
        </View>
        {Platform.OS === "ios" && (
          <>
            <View className="flex-row items-center mb-4 w-full">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-3 text-xs text-gray-500">或</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            <View className="w-full mb-4">
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={{ width: "100%", height: 44 }}
                onPress={handleAppleLogin}
              />
            </View>
          </>
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
