import { logout } from "@/services/auth";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

export default function Overview() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * 處理登出
   * 清除所有認證狀態並導航回登入頁面
   */
  const handleLogout = async () => {
    // 顯示確認對話框
    Alert.alert("確認登出", "確定要登出嗎？", [
      {
        text: "取消",
        style: "cancel",
      },
      {
        text: "登出",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
            // 登出後會自動導航到 landing 頁面（由 MainLayout 處理）
          } catch (error) {
            console.error("登出失敗:", error);
            Alert.alert("登出失敗", "無法完成登出，請稍後再試", [
              { text: "確定" },
            ]);
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white p-6">
      {/* Header */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900">控制面板</Text>
        <Text className="text-sm text-gray-600 mt-1">歡迎使用 OFlow</Text>
      </View>

      {/* Content Area */}
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500 mb-4">Dashboard 內容開發中...</Text>
      </View>

      {/* Logout Button */}
      <View className="mt-auto">
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-14 bg-red-500 rounded-lg items-center justify-center"
          style={{ opacity: isLoggingOut ? 0.6 : 1 }}
        >
          {isLoggingOut ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-semibold text-base">
                登出中...
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">登出</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
