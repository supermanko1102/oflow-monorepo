import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { LogoIcon } from '@/components/icons';
import { Button } from '@/components/native/Button';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

  const handleLineLogin = () => {
    // 模擬登入邏輯
    login();
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6 py-12 min-h-screen">
        {/* Logo / Icon */}
        <View className="mb-8 items-center">
          <View className="mb-4">
            <LogoIcon size={100} color="#00B900" />
          </View>
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

        {/* CTA */}
        <View className="w-full mb-6">
          <Button
            onPress={handleLineLogin}
            variant="primary"
            fullWidth
          >
            使用 LINE 登入
          </Button>
        </View>

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

