import { updateLineSettings } from "@/services/teamService";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
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
      router.replace("/(main)/(tabs)/dashboard");
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
            router.replace("/(main)/(tabs)/dashboard");
          },
        },
      ]
    );
  };

  // 步驟 1: 說明
  if (step === 1) {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-12">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              設定 LINE 官方帳號
            </Text>
            <Text className="text-sm text-gray-600">
              連接你的 LINE 官方帳號，讓 AI 自動處理訂單
            </Text>
          </View>

          {/* 說明卡片 */}
          <View className="mb-6 bg-blue-50 rounded-xl p-5 border border-blue-200">
            <Text className="text-base font-semibold text-blue-900 mb-3">
              📱 你需要準備：
            </Text>
            <View className="space-y-2">
              <Text className="text-sm text-blue-800 mb-2">
                • LINE 官方帳號（Messaging API）
              </Text>
              <Text className="text-sm text-blue-800 mb-2">• Channel ID</Text>
              <Text className="text-sm text-blue-800 mb-2">
                • Channel Secret
              </Text>
              <Text className="text-sm text-blue-800">
                • Channel Access Token
              </Text>
            </View>
          </View>

          {/* 步驟說明 */}
          <View className="mb-8 bg-gray-50 rounded-xl p-5">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              🔧 設定步驟：
            </Text>
            <View className="space-y-3">
              <View>
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  1. 前往 LINE Developers Console
                </Text>
                <Text className="text-xs text-gray-600">
                  登入並選擇你的 Messaging API Channel
                </Text>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  2. 取得 Channel 資訊
                </Text>
                <Text className="text-xs text-gray-600">
                  在「Basic settings」頁面複製 Channel ID 和 Channel Secret
                </Text>
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-800 mb-1">
                  3. 發行 Access Token
                </Text>
                <Text className="text-xs text-gray-600">
                  在「Messaging API」頁面發行 Channel Access Token
                </Text>
              </View>
            </View>
          </View>

          {/* 按鈕組 */}
          <View className="space-y-3">
            <Pressable
              onPress={openLineConsole}
              className="w-full h-14 bg-green-500 rounded-lg items-center justify-center"
            >
              <Text className="text-white font-semibold text-base">
                開啟 LINE Developers Console
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep(2)}
              className="w-full h-14 bg-blue-500 rounded-lg items-center justify-center"
            >
              <Text className="text-white font-semibold text-base">
                我已準備好，繼續
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              className="w-full h-14 items-center justify-center"
            >
              <Text className="text-gray-600 text-sm">暫時跳過</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  // 步驟 2: 輸入資料
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-12">
        {/* Header */}
        <View className="mb-8">
          <Pressable onPress={() => setStep(1)} className="mb-4">
            <Text className="text-blue-500 text-base">← 返回</Text>
          </Pressable>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            輸入 LINE 資訊
          </Text>
          <Text className="text-sm text-gray-600">
            請從 LINE Developers Console 複製以下資訊
          </Text>
        </View>

        {/* 表單 */}
        <View className="space-y-6">
          {/* Channel ID */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Channel ID
            </Text>
            <TextInput
              value={channelId}
              onChangeText={setChannelId}
              placeholder="例如：1234567890"
              className="w-full h-14 bg-gray-50 rounded-lg px-4 text-base border border-gray-200"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Channel Secret */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Channel Secret
            </Text>
            <TextInput
              value={channelSecret}
              onChangeText={setChannelSecret}
              placeholder="例如：abcdef1234567890"
              className="w-full h-14 bg-gray-50 rounded-lg px-4 text-base border border-gray-200"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Channel Access Token */}
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Channel Access Token
            </Text>
            <TextInput
              value={channelAccessToken}
              onChangeText={setChannelAccessToken}
              placeholder="長字串的 Access Token"
              className="w-full h-14 bg-gray-50 rounded-lg px-4 text-base border border-gray-200"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
            />
          </View>
        </View>

        {/* 提交按鈕 */}
        <View className="mt-8">
          <Pressable
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              !channelId ||
              !channelSecret ||
              !channelAccessToken
            }
            className="w-full h-14 bg-blue-500 rounded-lg items-center justify-center"
            style={{
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
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="text-white font-semibold text-base">
                  設定中...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">
                完成設定
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSkip}
            className="w-full h-14 items-center justify-center mt-2"
          >
            <Text className="text-gray-600 text-sm">暫時跳過</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
