/**
 * 步驟 2：準備引導
 * 引導用戶準備 LINE Official Account
 */

import { Button } from "@/components/native/Button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

interface StepPrepareProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepPrepare({ onNext, onBack }: StepPrepareProps) {
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  const handleOpenLineConsole = () => {
    Linking.openURL("https://developers.line.biz/console/");
  };

  const handleOpenLineManager = () => {
    Linking.openURL("https://manager.line.biz/");
  };

  return (
    <View className="flex-1">
      {/* 標題 */}
      <View className="mb-6">
        <Text className="text-2xl font-black text-gray-900 mb-2">
          準備 LINE 官方帳號
        </Text>
        <Text className="text-base text-gray-600">
          確認你已經有 LINE Official Account
        </Text>
      </View>

      {/* 問題選擇 */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-gray-700 mb-3">
          你已經有 LINE 官方帳號了嗎？
        </Text>

        {/* 選項：已有帳號 */}
        <Pressable
          onPress={() => setHasAccount(true)}
          className={`border-2 rounded-xl p-4 mb-3 ${
            hasAccount === true
              ? "bg-green-50 border-green-500"
              : "bg-white border-gray-300"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                hasAccount === true
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300"
              }`}
            >
              {hasAccount === true && (
                <MaterialCommunityIcons name="check" size={16} color="white" />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-semibold ${
                  hasAccount === true ? "text-green-900" : "text-gray-900"
                }`}
              >
                是，我已經有了
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                我已經有 LINE Official Account 和 Messaging API Channel
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 選項：還沒有帳號 */}
        <Pressable
          onPress={() => setHasAccount(false)}
          className={`border-2 rounded-xl p-4 ${
            hasAccount === false
              ? "bg-orange-50 border-orange-500"
              : "bg-white border-gray-300"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                hasAccount === false
                  ? "border-orange-500 bg-orange-500"
                  : "border-gray-300"
              }`}
            >
              {hasAccount === false && (
                <MaterialCommunityIcons name="check" size={16} color="white" />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-semibold ${
                  hasAccount === false ? "text-orange-900" : "text-gray-900"
                }`}
              >
                還沒有，需要建立
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                我需要先建立 LINE Official Account
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* 根據選擇顯示不同內容 */}
      {hasAccount === true && (
        <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-start mb-3">
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#059669"
            />
            <Text className="text-base font-semibold text-green-900 ml-2 flex-1">
              太好了！請確認以下事項
            </Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row items-start">
              <Text className="text-green-700 mr-2">✓</Text>
              <Text className="text-sm text-green-800 flex-1">
                已經建立 Messaging API Channel
              </Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-green-700 mr-2">✓</Text>
              <Text className="text-sm text-green-800 flex-1">
                可以在 LINE Developers Console 取得 Channel 資訊
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleOpenLineConsole}
            className="bg-green-600 py-2 px-4 rounded-lg flex-row items-center justify-center mt-3"
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color="white"
            />
            <Text className="text-white font-semibold ml-2">
              開啟 LINE Developers
            </Text>
          </Pressable>
        </View>
      )}

      {hasAccount === false && (
        <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <Text className="text-base font-semibold text-orange-900 mb-3">
            📱 建立步驟
          </Text>
          <View className="space-y-3 mb-4">
            <View className="flex-row items-start">
              <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">1</Text>
              </View>
              <Text className="text-sm text-orange-900 flex-1">
                前往 LINE Official Account Manager 建立官方帳號
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">2</Text>
              </View>
              <Text className="text-sm text-orange-900 flex-1">
                在設定中啟用 Messaging API
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="bg-orange-500 w-6 h-6 rounded-full items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
              <Text className="text-sm text-orange-900 flex-1">
                系統會自動建立 Messaging API Channel
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleOpenLineManager}
            className="bg-orange-600 py-2 px-4 rounded-lg flex-row items-center justify-center"
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color="white"
            />
            <Text className="text-white font-semibold ml-2">
              建立 LINE 官方帳號
            </Text>
          </Pressable>
        </View>
      )}

      {/* 按鈕 */}
      <View className="space-y-3">
        <Button
          onPress={onNext}
          variant="primary"
          fullWidth
          disabled={hasAccount === null}
        >
          下一步
        </Button>
        <Button onPress={onBack} variant="secondary" fullWidth>
          返回
        </Button>
      </View>
    </View>
  );
}

