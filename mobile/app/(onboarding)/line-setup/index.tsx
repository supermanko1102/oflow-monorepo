import { Ionicons } from "@expo/vector-icons";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";
import { updateLineSettings } from "@/services/teamService";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { useRouter } from "expo-router";
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

/**
 * LINE Setup - LINE 官方帳號設定頁面
 * 引導使用者設定 LINE 官方帳號和 Webhook
 * 狀態：NoWebhook → Active
 */
export default function LineSetup() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: 說明, 2: 輸入資料, 3: 完成
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  const openLineConsole = () => {
    Linking.openURL("https://developers.line.biz/console/");
  };

  const handleSubmit = async () => {
    if (
      !channelId.trim() ||
      !channelSecret.trim() ||
      !channelAccessToken.trim()
    ) {
      Alert.alert("請填寫完整", "所有欄位都是必填的", [{ text: "確定" }]);
      return;
    }

    // 驗證 currentTeamId 存在
    if (!currentTeamId) {
      Alert.alert("錯誤", "找不到團隊 ID，請重新登入", [{ text: "確定" }]);
      return;
    }

    try {
      setIsSubmitting(true);

      // 呼叫 API 儲存 LINE 設定
      await updateLineSettings({
        team_id: currentTeamId,
        line_channel_id: channelId.trim(),
        line_channel_secret: channelSecret.trim(),
        line_channel_access_token: channelAccessToken.trim(),
      });

      // 更新狀態為 Active
      useAuthStore.setState({
        status: AuthStatus.Active,
      });

      Alert.alert("設定成功", "LINE 官方帳號已設定完成", [{ text: "確定" }]);

      // 導向 dashboard
      router.replace("/(main)/(tabs)/inbox");
    } catch (error) {
      console.error("設定失敗:", error);
      Alert.alert(
        "設定失敗",
        "無法完成設定，請檢查 LINE 資訊是否正確或稍後再試",
        [{ text: "確定" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 跳過設定（暫時）
   */
  const handleSkip = () => {
    Alert.alert(
      "確定跳過？",
      "跳過設定後將無法使用 AI 自動讀取訂單功能，可以之後在設定中補設定",
      [
        { text: "取消", style: "cancel" },
        {
          text: "跳過",
          style: "destructive",
          onPress: () => {
            // 設為 Active 但不儲存 LINE 資訊
            useAuthStore.setState({
              status: AuthStatus.Active,
            });
            router.replace("/(main)/(tabs)/inbox");
          },
        },
      ]
    );
  };

  // 步驟 1: 說明
  if (step === 1) {
    return (
      <OnboardingLayout>
        <View className="space-y-3">
          <Text className="text-3xl font-black text-gray-900">
            設定 LINE 官方帳號
          </Text>
          <Text className="text-sm text-gray-600">
            連接你的 LINE 官方帳號，讓 AI 自動處理訂單
          </Text>
        </View>

        <View className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
          <Text className="text-sm font-semibold text-gray-900">
            你需要準備
          </Text>
          <View className="space-y-2">
            {[
              "LINE 官方帳號（Messaging API）",
              "Channel ID",
              "Channel Secret",
              "Channel Access Token",
            ].map((item) => (
              <View key={item} className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-sm text-gray-700">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <Text className="text-sm font-semibold text-gray-900">
            設定步驟
          </Text>
          <View className="space-y-3">
            {[
              {
                title: "前往 LINE Developers Console",
                description: "登入並選擇你的 Messaging API Channel",
              },
              {
                title: "取得 Channel 資訊",
                description: "在 Basic settings 複製 Channel ID 與 Secret",
              },
              {
                title: "發行 Access Token",
                description: "在 Messaging API 頁面發行 Access Token",
              },
            ].map((stepItem, index) => (
              <View key={stepItem.title} className="flex-row gap-3">
                <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center">
                  <Text className="text-xs font-semibold text-gray-600">
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {stepItem.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {stepItem.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="space-y-3">
          <Pressable
            onPress={openLineConsole}
            className="w-full h-14 rounded-2xl items-center justify-center border border-gray-200 bg-white"
          >
            <Text className="text-gray-900 font-semibold text-base">
              開啟 LINE Developers Console
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStep(2)}
            className="w-full h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: Palette.brand.primary }}
          >
            <Text className="text-white font-semibold text-base">
              我已準備好，繼續
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} className="items-center py-2">
            <Text className="text-sm text-gray-500">暫時跳過</Text>
          </Pressable>
        </View>
      </OnboardingLayout>
    );
  }

  // 步驟 2: 輸入資料
  return (
    <OnboardingLayout>
      <Pressable
        onPress={() => setStep(1)}
        className="self-start flex-row items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2"
      >
        <Ionicons name="chevron-back" size={16} color="#0F172A" />
        <Text className="text-xs font-semibold text-gray-900">返回</Text>
      </Pressable>

      <View className="space-y-2">
        <Text className="text-3xl font-black text-gray-900">輸入 LINE 資訊</Text>
        <Text className="text-sm text-gray-600">
          請從 LINE Developers Console 複製以下資訊
        </Text>
      </View>

      <View className="space-y-6">
        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Channel ID
          </Text>
          <TextInput
            value={channelId}
            onChangeText={setChannelId}
            placeholder="例如：1234567890"
            className="w-full h-14 bg-white rounded-2xl px-4 text-base border border-gray-200"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Channel Secret
          </Text>
          <TextInput
            value={channelSecret}
            onChangeText={setChannelSecret}
            placeholder="例如：abcdef1234567890"
            className="w-full h-14 bg-white rounded-2xl px-4 text-base border border-gray-200"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Channel Access Token
          </Text>
          <TextInput
            value={channelAccessToken}
            onChangeText={setChannelAccessToken}
            placeholder="長字串的 Access Token"
            className="w-full h-14 bg-white rounded-2xl px-4 text-base border border-gray-200"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
          />
        </View>
      </View>

      <View className="space-y-2">
        <Pressable
          onPress={handleSubmit}
          disabled={
            isSubmitting ||
            !channelId ||
            !channelSecret ||
            !channelAccessToken
          }
          className="w-full h-14 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: Palette.brand.primary,
            opacity:
              isSubmitting ||
              !channelId ||
              !channelSecret ||
              !channelAccessToken
                ? 0.6
                : 1,
          }}
        >
          {isSubmitting ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-semibold text-base">
                設定中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">完成設定</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} className="items-center py-2">
          <Text className="text-sm text-gray-500">暫時跳過</Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
