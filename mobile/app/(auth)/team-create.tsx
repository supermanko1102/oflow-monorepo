import { Button } from "@/components/native/Button";
import { useCreateTeam } from "@/hooks/queries/useTeams";
import { useToast } from "@/hooks/useToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { BUSINESS_TYPE_OPTIONS, type TeamCreateFormData } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function TeamCreateScreen() {
  const router = useRouter();
  const toast = useToast();

  // Auth Store (統一使用 AuthStore)
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);

  // React Query mutation
  const createTeamMutation = useCreateTeam();

  // React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamCreateFormData>({
    defaultValues: {
      teamName: "",
      businessType: "bakery",
    },
  });

  const onSubmit = async (data: TeamCreateFormData) => {
    try {
      // 建立團隊（使用 React Query mutation）
      // LINE 設定將在後續的專門頁面完成
      const newTeam = await createTeamMutation.mutateAsync({
        team_name: data.teamName.trim(),
        business_type: data.businessType,
        line_channel_id: null,
      });

      // 設定為當前團隊
      setCurrentTeamId(newTeam.id);

      toast.success("團隊建立成功！");

      // 導航到 LINE 設定頁面（強制設定）
      router.replace("/(auth)/team-webhook");
    } catch (error: any) {
      console.error("[Team Create] 建立失敗:", error);
      toast.error(error.message || "建立失敗，請稍後再試");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-black text-gray-900 mb-2">
              建立新團隊
            </Text>
            <Text className="text-base text-gray-600">
              設定團隊資訊並綁定 LINE 官方帳號
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-6">
            {/* 團隊名稱 */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                團隊名稱 <Text className="text-red-500">*</Text>
              </Text>
              <Controller
                control={control}
                name="teamName"
                rules={{
                  required: "請輸入團隊名稱",
                  validate: (value) => value.trim() !== "" || "請輸入團隊名稱",
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="例如：甜點小舖"
                    className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
              {errors.teamName && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.teamName.message}
                </Text>
              )}
              <Text className="text-xs text-gray-500 mt-1">
                這將顯示在應用程式中，可隨時修改
              </Text>
            </View>

            {/* 業務類別 */}
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                業務類別 <Text className="text-red-500">*</Text>
              </Text>
              <Controller
                control={control}
                name="businessType"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row flex-wrap gap-3">
                    {BUSINESS_TYPE_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        className={`flex-1 min-w-[45%] px-4 py-4 rounded-xl border-2 ${
                          value === option.value
                            ? "bg-blue-50 border-blue-500"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <View className="items-center">
                          <MaterialCommunityIcons
                            name={option.icon}
                            size={32}
                            color={
                              value === option.value ? "#3B82F6" : "#6B7280"
                            }
                          />
                          <Text
                            className={`text-sm font-semibold mt-2 ${
                              value === option.value
                                ? "text-blue-600"
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-1 text-center">
                            {option.description}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
              <Text className="text-xs text-gray-500 mt-2">
                系統會根據您的業務類別自動調整 AI 對話和訂單欄位
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-8 space-y-3">
            <Button
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              fullWidth
              disabled={createTeamMutation.isPending}
            >
              {createTeamMutation.isPending ? "建立中..." : "建立團隊"}
            </Button>

            <Button
              onPress={() => router.back()}
              variant="secondary"
              fullWidth
              disabled={createTeamMutation.isPending}
            >
              返回
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
