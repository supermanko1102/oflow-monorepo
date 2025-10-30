/**
 * LINE 官方帳號設定 Bottom Sheet
 * 包含 Channel ID/Secret/Token 表單和 Webhook URL 顯示
 */

import { BottomSheet } from "@/components/BottomSheet";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useToast } from "@/hooks/useToast";
import { queryClient } from "@/lib/queryClient";
import { updateLineSettings } from "@/services/teamService";
import { type LineSettingsFormData } from "@/types/team";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button } from "react-native-paper";

interface LineSettingsBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  teamId: string;
  currentChannelName?: string;
}

export function LineSettingsBottomSheet({
  visible,
  onDismiss,
  teamId,
  currentChannelName,
}: LineSettingsBottomSheetProps) {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);

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
    },
  });

  const onSubmit = async (data: LineSettingsFormData) => {
    if (!teamId) return;

    try {
      setIsUpdatingLine(true);
      const response = await updateLineSettings({
        team_id: teamId,
        line_channel_id: data.channelId,
        line_channel_secret: data.channelSecret,
        line_channel_access_token: data.accessToken,
        line_channel_name: undefined,
      });

      setWebhookUrl(response.webhook_url);
      toast.success("LINE 官方帳號設定已更新");

      // 刷新團隊資料
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all() });

      // 顯示 Webhook URL
      Alert.alert(
        "設定成功",
        "LINE 官方帳號已成功連接！\n\n請查看下方的 Webhook URL 並設定到 LINE Developers Console。",
        [{ text: "確定" }]
      );
    } catch (error: any) {
      toast.error(error.message || "更新 LINE 設定失敗");
    } finally {
      setIsUpdatingLine(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (webhookUrl) {
      Alert.alert("Webhook URL", webhookUrl, [{ text: "確定" }]);
    }
  };

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title="LINE 官方帳號">
      <ScrollView style={{ maxHeight: 500 }}>
        {/* 當前連接狀態 */}
        {currentChannelName && (
          <View className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Text className="text-sm text-gray-600 mb-1">目前連接</Text>
            <Text className="text-base font-semibold text-gray-900">
              {currentChannelName}
            </Text>
          </View>
        )}

        <Text className="text-gray-600 text-sm mb-4">
          更新或修改 LINE 官方帳號設定，確保系統正常接收顧客訊息
        </Text>

        {/* Channel ID */}
        <Text className="text-gray-700 font-semibold mb-2">Channel ID</Text>
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
              onChangeText={onChange}
              placeholder="輸入 LINE Channel ID"
              className="border border-gray-300 rounded-lg px-3 py-3 mb-1 bg-white"
            />
          )}
        />
        {errors.channelId && (
          <Text className="text-red-500 text-xs mb-3">
            {errors.channelId.message}
          </Text>
        )}

        {/* Channel Secret */}
        <Text className="text-gray-700 font-semibold mb-2 mt-2">
          Channel Secret
        </Text>
        <Controller
          control={control}
          name="channelSecret"
          rules={{
            required: "請輸入 Channel Secret",
            validate: (value) => value.trim() !== "" || "請輸入 Channel Secret",
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="輸入 LINE Channel Secret"
              secureTextEntry
              className="border border-gray-300 rounded-lg px-3 py-3 mb-1 bg-white"
            />
          )}
        />
        {errors.channelSecret && (
          <Text className="text-red-500 text-xs mb-3">
            {errors.channelSecret.message}
          </Text>
        )}

        {/* Channel Access Token */}
        <Text className="text-gray-700 font-semibold mb-2 mt-2">
          Channel Access Token
        </Text>
        <Controller
          control={control}
          name="accessToken"
          rules={{
            required: "請輸入 Access Token",
            validate: (value) => value.trim() !== "" || "請輸入 Access Token",
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="輸入 LINE Channel Access Token"
              secureTextEntry
              className="border border-gray-300 rounded-lg px-3 py-3 mb-1 bg-white"
            />
          )}
        />
        {errors.accessToken && (
          <Text className="text-red-500 text-xs mb-3">
            {errors.accessToken.message}
          </Text>
        )}

        {/* 更新按鈕 */}
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isUpdatingLine}
          disabled={isUpdatingLine}
          buttonColor="#00B900"
          className="mt-3"
        >
          更新設定
        </Button>

        {/* Webhook URL 顯示 */}
        {webhookUrl && (
          <View className="mt-4 p-3 bg-gray-100 rounded-lg">
            <Text className="text-gray-700 font-semibold mb-2">
              Webhook URL
            </Text>
            <Text className="text-gray-600 text-xs mb-2">
              請將此 URL 設定到 LINE Developers Console
            </Text>
            <TouchableOpacity
              onPress={handleCopyWebhookUrl}
              className="bg-white p-3 rounded-lg border border-gray-300"
            >
              <Text
                className="text-gray-800 text-xs"
                numberOfLines={3}
                selectable={true}
              >
                {webhookUrl}
              </Text>
            </TouchableOpacity>
            <Text className="text-line-green text-xs mt-2 text-center">
              長按文字可複製
            </Text>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
