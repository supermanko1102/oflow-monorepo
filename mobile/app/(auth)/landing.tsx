import { initiateAppleLogin } from "@/services/apple";
import { loginWithLine, loginWithApple, syncAuthStatus } from "@/services/auth";
import { handleAuthCallback, initiateLineLogin } from "@/services/line";
import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { AuthStatus, useAuthStore } from "@/stores/auth";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState("");

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

  // Apple 登入處理函數
  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      // 1. 獲取 Apple credential 並換取 Supabase session tokens
      const session = await initiateAppleLogin();
      // 2. 設置 Supabase session（與 LINE 登入流程一致）
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

  const handleDevLogin = async () => {
    if (!devEmail) {
      Alert.alert("Error", "Please enter an email");
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: "Dev1234!",
      });
      await supabase.auth.setSession({
        access_token: data?.session?.access_token ?? "",
        refresh_token: data?.session?.refresh_token ?? "",
      });
      console.log("authStore", useAuthStore.getState());
      useAuthStore.setState({
        status: AuthStatus.Active,
      });
      await syncAuthStatus();
    } catch (e) {
      if (e instanceof Error) {
        Alert.alert("Dev Login Failed", e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Logo / Icon */}
        {/* App Logo */}
        <View className="items-center mb-8">
          <View className="w-48 h-48 rounded-3xl items-center justify-center overflow-hidden bg-white ">
            <Image
              source={require("@/assets/images/icon.png")}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Product Description */}
        <View className="mb-12 w-full">
          <View className="bg-white border border-gray-100 rounded-2xl p-6 ">
            <Text className="text-xl font-bold text-brand-slate mb-6 text-center">
              讓 AI 幫你自動處理訂單
            </Text>
            <View className="space-y-6">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-4 mt-0.5">
                  <Ionicons
                    name="chatbubbles-outline"
                    size={18}
                    color="#008080"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-800 mb-1">
                    自動讀取 LINE 對話
                  </Text>
                  <Text className="text-sm text-gray-500 leading-relaxed">
                    AI 自動識別訂單資訊並建立訂單，省去手動輸入的麻煩
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-4 mt-0.5">
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color="#008080"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-800 mb-1">
                    智慧提醒功能
                  </Text>
                  <Text className="text-sm text-gray-500 leading-relaxed">
                    提前提醒備貨與出貨，讓你不漏接任何一張單
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-teal-50 rounded-full items-center justify-center mr-4 mt-0.5">
                  <MaterialCommunityIcons
                    name="robot-outline"
                    size={18}
                    color="#008080"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-800 mb-1">
                    全自動/半自動模式
                  </Text>
                  <Text className="text-sm text-gray-500 leading-relaxed">
                    彈性選擇適合你的接單方式，完全掌控你的生意
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* LINE 登入（主要） */}
        <View className="w-full mb-6">
          <Pressable
            onPress={() => handleLineLogin()}
            disabled={isLoading}
            className="w-full h-14 bg-[#06C755] rounded-xl items-center justify-center  active:opacity-90"
            style={{ opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="text-white font-bold text-lg">登入中...</Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={24}
                  color="white"
                  className="mr-2"
                />
                <Text className="text-white font-bold text-lg ml-2">
                  使用 LINE 登入
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        {Platform.OS === "ios" && (
          <View className="flex-row items-center mb-6 w-full px-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-4 text-sm text-gray-400 font-medium">或</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>
        )}

        {/* Apple 登入 (iOS only) */}
        {Platform.OS === "ios" && (
          <View className="w-full mb-8">
            <Pressable
              onPress={() => handleAppleLogin()}
              disabled={isLoading}
              className="w-full h-14 bg-black rounded-xl items-center justify-center active:opacity-90"
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="logo-apple"
                  size={24}
                  color="white"
                  className="mr-2"
                />
                <Text className="text-white font-bold text-lg ml-2">
                  使用 Apple 登入
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Dev Login */}
        {__DEV__ && (
          <View className="w-full mb-8 p-4 bg-gray-100 rounded-xl">
            <Text className="text-sm font-bold text-gray-500 mb-2">
              Developer Login
            </Text>
            <TextInput
              className="w-full h-12 bg-white rounded-lg px-4 mb-3 border border-gray-200"
              placeholder="Enter Dev Email"
              value={devEmail}
              onChangeText={setDevEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable
              onPress={handleDevLogin}
              disabled={isLoading}
              className="w-full h-12 bg-gray-800 rounded-lg items-center justify-center"
            >
              <Text className="text-white font-bold">Login as Dev</Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View className="mt-auto">
          <Text className="text-sm text-brand-slate/60 text-center font-medium">
            你只要聊天，OFlow 就能幫你完成整個接單流程
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
