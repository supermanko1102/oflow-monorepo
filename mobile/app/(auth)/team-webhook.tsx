import { Button } from "@/components/native/Button";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useToast } from "@/hooks/useToast";
import { queryClient } from "@/lib/queryClient";
import { updateLineSettings } from "@/services/teamService";
import { useAuthStore } from "@/stores/useAuthStore";
import { type LineSettingsFormData } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function TeamLineSetupScreen() {
  const router = useRouter();
  const toast = useToast();

  // Auth Store
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LineSettingsFormData>({
    defaultValues: {
      channelId: "",
      channelSecret: "",
      accessToken: "",
      channelName: "",
    },
  });

  // UI 狀態
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  // 開啟 LINE Developers Console
  const handleOpenLineConsole = () => {
    Linking.openURL("https://developers.line.biz/console/");
  };

  // 儲存 LINE 設定
  const onSubmit = async (data: LineSettingsFormData) => {
    if (!currentTeamId) {
      toast.error("找不到團隊資訊，請重新登入");
      return;
    }

    try {
      setIsUpdating(true);

      const response = await updateLineSettings({
        team_id: currentTeamId,
        line_channel_id: data.channelId.trim(),
        line_channel_secret: data.channelSecret.trim(),
        line_channel_access_token: data.accessToken.trim(),
        line_channel_name: data.channelName?.trim() || undefined,
      });

      setWebhookUrl(response.webhook_url);
      setIsCompleted(true);
      toast.success("LINE 設定完成！");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teams.list(),
      });
    } catch (error: any) {
      console.error("[Team LINE Setup] 設定失敗:", error);
      toast.error(error.message || "設定失敗，請檢查資訊是否正確");
    } finally {
      setIsUpdating(false);
    }
  };

  // 完成設定，進入主頁
  const handleComplete = () => {
    router.replace("/(main)/(tabs)");
    console.log("handleComplete");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons
                name="message-settings"
                size={40}
                color="#00B900"
              />
              <Text className="text-3xl font-black text-gray-900 ml-3">
                設定 LINE 官方帳號
              </Text>
            </View>
            <Text className="text-base text-gray-600 leading-6">
              OFlow 透過 LINE 官方帳號自動接收訂單訊息，這是使用 OFlow
              的必要設定。
            </Text>
          </View>

          {/* 說明卡片 */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <Text className="text-sm font-semibold text-blue-900 mb-2">
              📱 還沒有 LINE 官方帳號？
            </Text>
            <Text className="text-sm text-blue-800 mb-3 leading-5">
              請先前往 LINE Developers Console 建立 Messaging API Channel。
            </Text>
            <Pressable
              onPress={handleOpenLineConsole}
              className="bg-blue-600 py-2 px-4 rounded-lg flex-row items-center justify-center"
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={16}
                color="white"
              />
              <Text className="text-white font-semibold ml-2">
                前往 LINE Developers
              </Text>
            </Pressable>
          </View>

          {!isCompleted ? (
            /* 設定表單 */
            <View className="space-y-4">
              {/* Channel ID */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Channel ID <Text className="text-red-500">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="channelId"
                  rules={{
                    required: "請輸入 Channel ID",
                    validate: (value) =>
                      value.trim() !== "" || "請輸入 Channel ID",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="例如：2008352338"
                      keyboardType="numeric"
                      className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.channelId && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.channelId.message}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 mt-1">
                  在 LINE Developers Console 的 Basic settings 中取得
                </Text>
              </View>

              {/* Channel Secret */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Channel Secret <Text className="text-red-500">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="channelSecret"
                  rules={{
                    required: "請輸入 Channel Secret",
                    validate: (value) =>
                      value.trim() !== "" || "請輸入 Channel Secret",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <View className="relative">
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="例如：abcdef1234567890..."
                        secureTextEntry={!showSecret}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base text-gray-900"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        onPress={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-3"
                      >
                        <MaterialCommunityIcons
                          name={showSecret ? "eye-off" : "eye"}
                          size={24}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  )}
                />
                {errors.channelSecret && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.channelSecret.message}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 mt-1">
                  在 LINE Developers Console 的 Basic settings 中取得
                </Text>
              </View>

              {/* Channel Access Token */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Channel Access Token <Text className="text-red-500">*</Text>
                </Text>
                <Controller
                  control={control}
                  name="accessToken"
                  rules={{
                    required: "請輸入 Access Token",
                    validate: (value) =>
                      value.trim() !== "" || "請輸入 Access Token",
                  }}
                  render={({ field: { onChange, value } }) => (
                    <View className="relative">
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="例如：ABC123..."
                        secureTextEntry={!showToken}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base text-gray-900"
                        placeholderTextColor="#9CA3AF"
                        multiline
                      />
                      <Pressable
                        onPress={() => setShowToken(!showToken)}
                        className="absolute right-3 top-3"
                      >
                        <MaterialCommunityIcons
                          name={showToken ? "eye-off" : "eye"}
                          size={24}
                          color="#6B7280"
                        />
                      </Pressable>
                    </View>
                  )}
                />
                {errors.accessToken && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors.accessToken.message}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 mt-1">
                  在 LINE Developers Console 的 Messaging API 中取得
                </Text>
              </View>

              {/* 提示卡片 */}
              <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <Text className="text-sm font-semibold text-amber-900 mb-2">
                  💡 設定步驟
                </Text>
                <View className="space-y-2">
                  <Text className="text-xs text-amber-800">
                    1. 前往 LINE Developers Console
                  </Text>
                  <Text className="text-xs text-amber-800">
                    2. 選擇你的 Messaging API Channel
                  </Text>
                  <Text className="text-xs text-amber-800">
                    3. 從 Basic settings 複製 Channel ID 和 Channel Secret
                  </Text>
                  <Text className="text-xs text-amber-800">
                    4. 從 Messaging API 複製或建立 Channel Access Token
                  </Text>
                  <Text className="text-xs text-amber-800">
                    5. 將資訊填入上方欄位並儲存
                  </Text>
                </View>
              </View>

              {/* 儲存按鈕 */}
              <View className="mt-6">
                <Button
                  onPress={handleSubmit(onSubmit)}
                  variant="primary"
                  fullWidth
                  disabled={isUpdating}
                >
                  {isUpdating ? "設定中..." : "儲存設定"}
                </Button>
              </View>
            </View>
          ) : (
            /* 設定完成畫面 */
            <View>
              {/* 成功提示 */}
              <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color="#059669"
                  />
                  <Text className="text-base font-bold text-green-900 ml-2">
                    設定完成！
                  </Text>
                </View>
                <Text className="text-sm text-green-800 leading-5">
                  LINE 官方帳號已成功連接。接下來請完成最後一個步驟。
                </Text>
              </View>

              {/* Webhook URL 顯示 */}
              <View className="bg-gray-50 border border-gray-300 rounded-xl p-4 mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Webhook URL
                </Text>
                <Text className="text-xs text-gray-600 mb-3 leading-5">
                  請將此 URL 設定到 LINE Developers Console 的 Webhook settings
                </Text>
                <View className="bg-white p-3 rounded-lg border border-gray-300">
                  <Text
                    className="text-gray-800 text-xs"
                    numberOfLines={3}
                    selectable={true}
                  >
                    {webhookUrl}
                  </Text>
                </View>
              </View>

              {/* 設定步驟說明 */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <Text className="text-sm font-semibold text-blue-900 mb-2">
                  📋 最後步驟
                </Text>
                <View className="space-y-2">
                  <Text className="text-xs text-blue-800 leading-5">
                    1. 前往 LINE Developers Console
                  </Text>
                  <Text className="text-xs text-blue-800 leading-5">
                    2. 選擇你的 Channel → Messaging API 分頁
                  </Text>
                  <Text className="text-xs text-blue-800 leading-5">
                    3. 在 Webhook settings 區塊貼上上方的 URL
                  </Text>
                  <Text className="text-xs text-blue-800 leading-5">
                    4. 點擊 Update 並啟用 Use webhook
                  </Text>
                  <Text className="text-xs text-blue-800 leading-5">
                    5. 關閉 Auto-reply messages（避免衝突）
                  </Text>
                </View>

                <Pressable
                  onPress={handleOpenLineConsole}
                  className="bg-blue-600 py-2 px-4 rounded-lg flex-row items-center justify-center mt-3"
                >
                  <MaterialCommunityIcons
                    name="open-in-new"
                    size={16}
                    color="white"
                  />
                  <Text className="text-white font-semibold ml-2">
                    前往 LINE Developers
                  </Text>
                </Pressable>
              </View>

              {/* 完成按鈕 */}
              <Button onPress={handleComplete} variant="primary" fullWidth>
                完成設定，開始使用 OFlow
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
