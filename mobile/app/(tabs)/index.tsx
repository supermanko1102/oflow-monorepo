import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLineLogin = () => {
    // 假的登入邏輯
    setIsLoggedIn(true);
    // 實際應該導航到訂單頁面，但這裡只是切換狀態
    setTimeout(() => {
      router.push('/(tabs)/orders');
    }, 500);
  };

  if (isLoggedIn) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          登入成功！
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          正在跳轉...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 justify-center items-center px-6 py-12">
        {/* Logo / Icon */}
        <View className="mb-8">
          <Text className="text-6xl text-center mb-4">🧾</Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            OFlow
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
            智慧訂單中心
          </Text>
        </View>

        {/* Product Description */}
        <View className="mb-8 w-full">
          <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
              讓 AI 幫你自動處理訂單
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-start mb-3">
                <Text className="text-2xl mr-3">✨</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    自動讀取 LINE 對話
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    AI 自動識別訂單資訊並建立訂單
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-start mb-3">
                <Text className="text-2xl mr-3">🔔</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    智慧提醒功能
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    提前提醒，讓你不漏單
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-start">
                <Text className="text-2xl mr-3">⚡</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    全自動/半自動模式
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">
                    彈性選擇適合你的接單方式
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View className="w-full mb-6">
          <Button
            mode="contained"
            onPress={handleLineLogin}
            className="w-full"
            buttonColor="#00B900"
            textColor="#FFFFFF"
            contentStyle={{ paddingVertical: 8 }}
          >
            <Text className="text-base font-semibold">使用 LINE 登入</Text>
          </Button>
        </View>

        {/* Footer */}
        <View className="mt-4">
          <Text className="text-xs text-gray-500 dark:text-gray-500 text-center">
            你只要聊天，OFlow 就能幫你完成整個接單流程
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
