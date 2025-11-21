import { MainLayout } from "@/components/layout/MainLayout";
import { Palette } from "@/constants/palette";
import {
  updateLineSettings,
  validateLineChannel,
} from "@/services/teamService";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function LineConnectionSettings() {
  const router = useRouter();
  const {
    currentTeamId,
    currentTeam,
    refetch: refetchTeams,
  } = useCurrentTeam();

  const [channelId, setChannelId] = useState(
    currentTeam?.line_channel_id || ""
  );
  const [channelSecret, setChannelSecret] = useState(""); // Secret usually not returned for security, or maybe it is? Assuming empty for security
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!currentTeamId) {
      Alert.alert("錯誤", "找不到團隊 ID", [{ text: "確定" }]);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Validate first
      const validation = await validateLineChannel({
        channel_id: channelId.trim(),
        channel_secret: channelSecret.trim(),
        channel_access_token: channelAccessToken.trim(),
      });

      if (!validation.valid) {
        Alert.alert("驗證失敗", validation.error || "請檢查輸入的資訊是否正確");
        setIsSubmitting(false);
        return;
      }

      // 2. Update settings
      await updateLineSettings({
        team_id: currentTeamId,
        line_channel_id: channelId.trim(),
        line_channel_secret: channelSecret.trim(),
        line_channel_access_token: channelAccessToken.trim(),
        line_channel_name: validation.bot_name,
      });

      await refetchTeams();

      Alert.alert(
        "設定成功",
        `已成功連接 LINE 官方帳號：${validation.bot_name}`,
        [
          {
            text: "確定",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("設定失敗:", error);
      Alert.alert("設定失敗", "無法完成設定，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAwareScrollView
        bottomOffset={50}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1"
      >
        <View className="p-6">
          {/* Header Section */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
              <Ionicons name="logo-android" size={40} color="#06C755" />
            </View>
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              連接 LINE 官方帳號
            </Text>
            <Text className="text-center text-sm text-gray-500">
              連接後，AI 將自動讀取訊息並為您整理訂單
            </Text>
          </View>

          {/* Current Status Card */}
          {currentTeam?.line_channel_id ? (
            <View className="mb-8 overflow-hidden rounded-2xl border border-green-100 bg-green-50 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
                  <Ionicons name="checkmark" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-green-800">已連接</Text>
                  <Text className="text-xs text-green-600">
                    Channel ID: {currentTeam.line_channel_id}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="mb-8 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                  <Ionicons name="alert" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-orange-800">尚未連接</Text>
                  <Text className="text-xs text-orange-600">
                    請填寫下方資訊以啟用功能
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Form Section */}
          <View className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
            <View>
              <Text className="mb-2 text-sm font-semibold text-gray-700">
                Channel ID
              </Text>
              <TextInput
                value={channelId}
                onChangeText={setChannelId}
                placeholder="請輸入 Channel ID"
                className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-gray-700">
                Channel Secret
              </Text>
              <TextInput
                value={channelSecret}
                onChangeText={setChannelSecret}
                placeholder="請輸入 Channel Secret"
                className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                secureTextEntry
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-semibold text-gray-700">
                Channel Access Token
              </Text>
              <TextInput
                value={channelAccessToken}
                onChangeText={setChannelAccessToken}
                placeholder="請輸入 Channel Access Token"
                className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                multiline
                style={{ height: 100, paddingTop: 12 }}
              />
            </View>

            <TouchableOpacity
              onPress={openLineConsole}
              className="items-center py-2"
            >
              <Text className="text-sm font-medium text-brand-primary">
                如何取得這些資訊？
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <View className="mt-8">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="h-14 w-full items-center justify-center rounded-2xl shadow-sm"
              style={{
                backgroundColor: Palette.brand.primary,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-bold text-white">
                  {currentTeam?.line_channel_id ? "更新設定" : "連接帳號"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white"
            >
              <Text className="text-base font-semibold text-gray-700">
                取消
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
