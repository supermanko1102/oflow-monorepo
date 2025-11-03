/**
 * 步驟 1：價值說明
 * 向用戶說明為什麼需要設定 LINE 以及整體流程
 */

import { Button } from "@/components/native/Button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface StepIntroductionProps {
  onNext: () => void;
}

export function StepIntroduction({ onNext }: StepIntroductionProps) {
  return (
    <View className="flex-1">
      {/* 圖示 */}
      <View className="items-center mb-6">
        <View className="bg-green-50 w-24 h-24 rounded-full items-center justify-center mb-4">
          <MaterialCommunityIcons
            name="message-processing"
            size={56}
            color="#00B900"
          />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center mb-2">
          為什麼需要 LINE？
        </Text>
        <Text className="text-base text-gray-600 text-center">
          讓 OFlow 自動接收並處理訂單訊息
        </Text>
      </View>

      {/* 功能說明卡片 */}
      <View className="space-y-3 mb-6">
        <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row">
          <View className="bg-blue-50 w-12 h-12 rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons name="robot" size={24} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              AI 自動解析
            </Text>
            <Text className="text-sm text-gray-600 leading-5">
              顧客傳來的訊息自動轉換成訂單，不需手動輸入
            </Text>
          </View>
        </View>

        <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row">
          <View className="bg-purple-50 w-12 h-12 rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons name="bell-ring" size={24} color="#9333EA" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              即時通知
            </Text>
            <Text className="text-sm text-gray-600 leading-5">
              新訂單立即推播到 App，不會錯過任何一筆生意
            </Text>
          </View>
        </View>

        <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row">
          <View className="bg-amber-50 w-12 h-12 rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons
              name="chart-line"
              size={24}
              color="#F59E0B"
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              統一管理
            </Text>
            <Text className="text-sm text-gray-600 leading-5">
              所有訂單集中在 App 中，方便追蹤和統計
            </Text>
          </View>
        </View>
      </View>

      {/* 時間說明 */}
      <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <View className="flex-row items-center mb-2">
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color="#2563EB"
          />
          <Text className="text-sm font-semibold text-blue-900 ml-2">
            設定時間約 5 分鐘
          </Text>
        </View>
        <Text className="text-sm text-blue-800 leading-5">
          我們會一步步引導你完成設定，過程中可以隨時返回修改
        </Text>
      </View>

      {/* 開始按鈕 */}
      <Button onPress={onNext} variant="primary" fullWidth>
        開始設定
      </Button>
    </View>
  );
}

