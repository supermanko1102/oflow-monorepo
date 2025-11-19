import { initiateAppleLogin } from "@/services/apple";
import { loginWithApple, loginWithLine } from "@/services/auth";
import { handleAuthCallback, initiateLineLogin } from "@/services/line";
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
      await loginWithLine(session.access_token, session.refresh_token);
    } catch (e) {
      e instanceof Error && console.log(`AuthLayout: Blocking [${e.message}]`);
      Alert.alert("登入失敗", "無法完成 LINE 登入，請稍後再試", [
        { text: "確定" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Google 登入處理函數
  // const handleGoogleLogin = async () => {
  //   try {
  //     setIsLoading(true);
  //     const session = await initiateGoogleLogin();
  //     await loginWithGoogle(session.access_token, session.refresh_token);
  //   } catch (e) {
  //     if (e instanceof Error && e.message === "使用者取消登入") {
  //       Alert.alert("登入已取消", "您已取消 Google 登入", [{ text: "確定" }]);
  //       return;
  //     }
  //     console.error("Google Login: Error", e);
  //     Alert.alert("登入失敗", "無法完成 Google 登入，請稍後再試", [
  //       { text: "確定" },
  //     ]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Apple 登入處理函數
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      const session = await initiateAppleLogin();
      await loginWithApple(session.access_token, session.refresh_token);
    } catch (e) {
      if (e instanceof Error && e.message === "使用者取消登入") {
        Alert.alert("登入已取消", "您已取消 Apple 登入", [{ text: "確定" }]);
        return;
      }
      console.error("Apple Login: Error", e);
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
        <View className="w-full mb-4">
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

        {/* Divider */}
        <View className="flex-row items-center mb-4 w-full">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-3 text-xs text-gray-500">或</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Google 登入 */}
        {/* <View className="w-full mb-4">
          <Pressable
            onPress={() => handleGoogleLogin()}
            disabled={isLoading}
            className="w-full h-14 bg-white border border-gray-300 rounded-md items-center justify-center flex-row"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            <Text className="text-gray-900 font-semibold text-lg">
              使用 Google 登入
            </Text>
          </Pressable>
        </View> */}

        {/* Apple 登入 (iOS only) */}
        {Platform.OS === "ios" && (
          <View className="w-full mb-4">
            <Pressable
              onPress={() => handleAppleLogin()}
              disabled={isLoading}
              className="w-full h-14 bg-black rounded-md items-center justify-center"
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              <Text className="text-white font-semibold text-lg">
                使用 Apple 登入
              </Text>
            </Pressable>
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
