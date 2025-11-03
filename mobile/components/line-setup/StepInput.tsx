/**
 * 步驟 3：輸入並自動設定
 * 輸入 LINE Channel 資訊，驗證後自動完成所有設定
 */

import { Button } from "@/components/native/Button";
import { useToast } from "@/hooks/useToast";
import { updateLineSettings, validateLineChannel, testWebhook } from "@/services/teamService";
import type { LineSettingsFormData } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

interface StepInputProps {
  form: UseFormReturn<LineSettingsFormData>;
  onComplete: () => void;  // 改為 onComplete（直接完成）
  onBack: () => void;
  teamId: string;  // 需要 teamId 來呼叫 API
}

interface ValidationResult {
  channelId: "idle" | "validating" | "valid" | "invalid";
  accessToken: "idle" | "validating" | "valid" | "invalid";
  error?: string;
  botName?: string;
}

// 截圖展開狀態
interface GuideState {
  channelId: boolean;
  channelSecret: boolean;
  accessToken: boolean;
}

// 設定狀態
type SetupStatus = "idle" | "validating" | "saving" | "configuring" | "success" | "error";
type StepStatus = "idle" | "loading" | "success" | "error";

export function StepInput({ form, onComplete, onBack, teamId }: StepInputProps) {
  const toast = useToast();
  const {
    control,
    formState: { errors },
    getValues,
  } = form;

  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({
    channelId: "idle",
    accessToken: "idle",
  });
  const [showGuide, setShowGuide] = useState<GuideState>({
    channelId: false,
    channelSecret: false,
    accessToken: false,
  });

  // 完整設定流程狀態
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("idle");
  const [validateStatus, setValidateStatus] = useState<StepStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<StepStatus>("idle");
  const [webhookStatus, setWebhookStatus] = useState<StepStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [botName, setBotName] = useState<string>("");

  // 驗證並自動設定完整流程
  const handleValidateAndSetup = async () => {
    const values = getValues();

    // 檢查必填欄位
    if (!values.channelId.trim()) {
      toast.error("請輸入 Channel ID");
      return;
    }

    if (!values.channelSecret.trim()) {
      toast.error("請輸入 Channel Secret");
      return;
    }

    if (!values.accessToken.trim()) {
      toast.error("請輸入 Access Token");
      return;
    }

    // 重置狀態
    setErrorMessage("");
    setSetupStatus("validating");
    setValidateStatus("loading");
    setSaveStatus("idle");
    setWebhookStatus("idle");

    try {
      // ========== 步驟 1：驗證 Channel 資訊 ==========
      console.log("[Setup] Step 1: 驗證 Channel 資訊");
      const validateResult = await validateLineChannel({
        channel_id: values.channelId.trim(),
        channel_secret: values.channelSecret.trim(),
        channel_access_token: values.accessToken.trim(),
      });

      if (!validateResult.valid) {
        setValidateStatus("error");
        setSetupStatus("error");
        setErrorMessage(validateResult.error || "驗證失敗，請檢查輸入的資訊是否正確");
        toast.error("Channel 資訊驗證失敗");
        return;
      }

      // 驗證成功
      setValidateStatus("success");
      if (validateResult.bot_name) {
        setBotName(validateResult.bot_name);
        form.setValue("channelName", validateResult.bot_name);
      }
      console.log("[Setup] Step 1 完成：驗證成功");

      // ========== 步驟 2：儲存設定到資料庫 ==========
      setSetupStatus("saving");
      setSaveStatus("loading");
      console.log("[Setup] Step 2: 儲存設定到資料庫");

      const saveResult = await updateLineSettings({
        team_id: teamId,
        line_channel_id: values.channelId.trim(),
        line_channel_secret: values.channelSecret.trim(),
        line_channel_access_token: values.accessToken.trim(),
        line_channel_name: validateResult.bot_name || values.channelName?.trim() || undefined,
      });

      setSaveStatus("success");
      console.log("[Setup] Step 2 完成：設定已儲存，Webhook URL:", saveResult.webhook_url);

      // ========== 步驟 3：自動設定 Webhook 到 LINE ==========
      setSetupStatus("configuring");
      setWebhookStatus("loading");
      console.log("[Setup] Step 3: 自動設定 Webhook 到 LINE");

      const webhookResult = await testWebhook({
        team_id: teamId,
      });

      if (webhookResult.webhook_configured && webhookResult.webhook_test_success) {
        setWebhookStatus("success");
        setSetupStatus("success");
        console.log("[Setup] Step 3 完成：Webhook 設定並測試成功");
        toast.success("LINE 設定完成！");
      } else if (webhookResult.webhook_configured && !webhookResult.webhook_test_success) {
        // Webhook 設定成功但測試失敗
        setWebhookStatus("error");
        setSetupStatus("success"); // 仍視為成功，因為不影響基本使用
        setErrorMessage("Webhook 已設定，但測試連線失敗。這不影響基本使用，你可以稍後再測試。");
        toast.warning("Webhook 設定完成，但測試失敗");
      } else {
        setWebhookStatus("error");
        setSetupStatus("error");
        setErrorMessage(webhookResult.error || "Webhook 設定失敗");
        toast.error("Webhook 設定失敗");
      }
    } catch (error: any) {
      console.error("[Setup] 設定失敗:", error);
      setSetupStatus("error");
      
      // 根據當前步驟設定錯誤狀態
      if (setupStatus === "validating") {
        setValidateStatus("error");
      } else if (setupStatus === "saving") {
        setSaveStatus("error");
      } else if (setupStatus === "configuring") {
        setWebhookStatus("error");
      }
      
      const errorMsg = error.message || "設定過程發生錯誤，請重試";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  const isSettingUp = setupStatus !== "idle" && setupStatus !== "success";
  const isSetupComplete = setupStatus === "success";

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* 標題 */}
      <View className="mb-6">
        <Text className="text-2xl font-black text-gray-900 mb-2">
          輸入並驗證 Channel 資訊
        </Text>
        <Text className="text-base text-gray-600">
          從 LINE Developers Console 複製以下資訊，驗證後將自動完成設定
        </Text>
      </View>

      {/* 輸入欄位 */}
      <View className="space-y-4 mb-6">
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
              validate: (value) => value.trim() !== "" || "請輸入 Channel ID",
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  setValidation({ channelId: "idle", accessToken: "idle" });
                }}
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
          <Pressable
            onPress={() =>
              setShowGuide((prev) => ({
                ...prev,
                channelId: !prev.channelId,
              }))
            }
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-blue-800 leading-5 flex-1">
                💡 在 LINE Developers Console → Basic settings → Channel ID
              </Text>
              <MaterialCommunityIcons
                name={showGuide.channelId ? "chevron-up" : "chevron-down"}
                size={18}
                color="#1E40AF"
              />
            </View>
            {showGuide.channelId && (
              <Text className="text-xs text-blue-700 mt-2 leading-5">
                📖 提示：截圖說明即將提供。請前往 LINE Developers Console 找到你的
                Channel，在 Basic settings 頁面中找到 Channel ID（一串數字）。
              </Text>
            )}
          </Pressable>
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
                  onChangeText={(text) => {
                    onChange(text);
                    setValidation({ channelId: "idle", accessToken: "idle" });
                  }}
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
          <Pressable
            onPress={() =>
              setShowGuide((prev) => ({
                ...prev,
                channelSecret: !prev.channelSecret,
              }))
            }
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-blue-800 leading-5 flex-1">
                💡 在 LINE Developers Console → Basic settings → Channel
                Secret
              </Text>
              <MaterialCommunityIcons
                name={showGuide.channelSecret ? "chevron-up" : "chevron-down"}
                size={18}
                color="#1E40AF"
              />
            </View>
            {showGuide.channelSecret && (
              <Text className="text-xs text-blue-700 mt-2 leading-5">
                📖 提示：截圖說明即將提供。在同一頁面找到 Channel Secret，可能需要點擊「Show」按鈕顯示。
              </Text>
            )}
          </Pressable>
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
              validate: (value) => value.trim() !== "" || "請輸入 Access Token",
            }}
            render={({ field: { onChange, value } }) => (
              <View className="relative">
                <TextInput
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    setValidation({ channelId: "idle", accessToken: "idle" });
                  }}
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
          <Pressable
            onPress={() =>
              setShowGuide((prev) => ({
                ...prev,
                accessToken: !prev.accessToken,
              }))
            }
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-blue-800 leading-5 flex-1">
                💡 在 LINE Developers Console → Messaging API → Channel Access
                Token
              </Text>
              <MaterialCommunityIcons
                name={showGuide.accessToken ? "chevron-up" : "chevron-down"}
                size={18}
                color="#1E40AF"
              />
            </View>
            {showGuide.accessToken && (
              <Text className="text-xs text-blue-700 mt-2 leading-5">
                📖 提示：截圖說明即將提供。切換到 Messaging API 分頁，找到
                「Channel access token (long-lived)」區塊。如果是空的，點擊「Issue」按鈕生成新的
                token。
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* 設定按鈕 */}
      {!isSetupComplete && (
        <View className="mb-6">
          <Button
            onPress={handleValidateAndSetup}
            variant="primary"
            fullWidth
            disabled={isSettingUp}
          >
            {isSettingUp ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator color="#FFFFFF" />
                <Text className="text-white font-bold ml-2">設定中...</Text>
              </View>
            ) : (
              "驗證並設定"
            )}
          </Button>
        </View>
      )}

      {/* 設定進度 */}
      {isSettingUp && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <Text className="text-lg font-bold text-blue-900 mb-4">
            正在設定中...
          </Text>
          
          {/* 步驟 1: 驗證 */}
          <View className="flex-row items-center mb-3">
            {validateStatus === "loading" && (
              <ActivityIndicator size="small" color="#3B82F6" />
            )}
            {validateStatus === "success" && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
            )}
            {validateStatus === "error" && (
              <MaterialCommunityIcons name="close-circle" size={20} color="#DC2626" />
            )}
            {validateStatus === "idle" && (
              <MaterialCommunityIcons name="circle-outline" size={20} color="#9CA3AF" />
            )}
            <Text className={`ml-2 ${
              validateStatus === "success" ? "text-green-700" :
              validateStatus === "error" ? "text-red-700" :
              validateStatus === "loading" ? "text-blue-700" : "text-gray-500"
            }`}>
              驗證 Channel 資訊
            </Text>
          </View>

          {/* 步驟 2: 儲存 */}
          <View className="flex-row items-center mb-3">
            {saveStatus === "loading" && (
              <ActivityIndicator size="small" color="#3B82F6" />
            )}
            {saveStatus === "success" && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
            )}
            {saveStatus === "error" && (
              <MaterialCommunityIcons name="close-circle" size={20} color="#DC2626" />
            )}
            {saveStatus === "idle" && (
              <MaterialCommunityIcons name="circle-outline" size={20} color="#9CA3AF" />
            )}
            <Text className={`ml-2 ${
              saveStatus === "success" ? "text-green-700" :
              saveStatus === "error" ? "text-red-700" :
              saveStatus === "loading" ? "text-blue-700" : "text-gray-500"
            }`}>
              儲存設定到資料庫
            </Text>
          </View>

          {/* 步驟 3: Webhook */}
          <View className="flex-row items-center">
            {webhookStatus === "loading" && (
              <ActivityIndicator size="small" color="#3B82F6" />
            )}
            {webhookStatus === "success" && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#059669" />
            )}
            {webhookStatus === "error" && (
              <MaterialCommunityIcons name="close-circle" size={20} color="#DC2626" />
            )}
            {webhookStatus === "idle" && (
              <MaterialCommunityIcons name="circle-outline" size={20} color="#9CA3AF" />
            )}
            <Text className={`ml-2 ${
              webhookStatus === "success" ? "text-green-700" :
              webhookStatus === "error" ? "text-red-700" :
              webhookStatus === "loading" ? "text-blue-700" : "text-gray-500"
            }`}>
              設定 Webhook 到 LINE
            </Text>
          </View>
        </View>
      )}

      {/* 錯誤訊息 */}
      {errorMessage && setupStatus === "error" && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              name="alert-circle"
              size={24}
              color="#DC2626"
            />
            <View className="flex-1 ml-2">
              <Text className="text-base font-semibold text-red-900 mb-1">
                設定失敗
              </Text>
              <Text className="text-sm text-red-800 leading-5">
                {errorMessage}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 成功訊息 */}
      {isSetupComplete && (
        <View className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <View className="flex-row items-start mb-4">
            <MaterialCommunityIcons
              name="check-circle"
              size={32}
              color="#059669"
            />
            <View className="flex-1 ml-3">
              <Text className="text-xl font-bold text-green-900 mb-1">
                🎉 設定完成！
              </Text>
              <Text className="text-sm text-green-800 leading-5">
                {botName && `已成功連接到「${botName}」`}
              </Text>
            </View>
          </View>

          <View className="space-y-2">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="check" size={18} color="#059669" />
              <Text className="text-sm text-green-800 ml-2">Channel 資訊已驗證</Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="check" size={18} color="#059669" />
              <Text className="text-sm text-green-800 ml-2">設定已儲存到資料庫</Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="check" size={18} color="#059669" />
              <Text className="text-sm text-green-800 ml-2">Webhook 已自動設定到 LINE</Text>
            </View>
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="check" size={18} color="#059669" />
              <Text className="text-sm text-green-800 ml-2">Webhook 連線測試成功</Text>
            </View>
          </View>
        </View>
      )}

      {/* 警告訊息（部分成功） */}
      {isSetupComplete && errorMessage && (
        <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              name="alert"
              size={24}
              color="#F59E0B"
            />
            <View className="flex-1 ml-2">
              <Text className="text-base font-semibold text-yellow-900 mb-1">
                提示
              </Text>
              <Text className="text-sm text-yellow-800 leading-5">
                {errorMessage}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 按鈕 */}
      <View className="space-y-3">
        {isSetupComplete ? (
          <Button onPress={onComplete} variant="primary" fullWidth>
            完成設定，開始使用 OFlow
          </Button>
        ) : (
          <Button onPress={onBack} variant="secondary" fullWidth disabled={isSettingUp}>
            返回
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

