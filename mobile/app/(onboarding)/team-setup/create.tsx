import { Ionicons } from "@expo/vector-icons";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";
import { useCreateTeam, useTeams } from "@/hooks/queries/useTeams";
import { AuthStatus, useAuthStore } from "@/stores/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type BusinessType =
  | "bakery"
  | "beauty"
  | "nail"
  | "massage"
  | "flower"
  | "pet"
  | "craft"
  | "other";

const categories: {
  key: BusinessType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "bakery",
    label: "烘焙・甜點",
    description: "蛋糕、甜點、咖啡廳",
    icon: "pizza-outline",
  },
  {
    key: "beauty",
    label: "美容・美髮",
    description: "沙龍、染燙、保養",
    icon: "cut-outline",
  },
  {
    key: "nail",
    label: "美甲・美睫",
    description: "指甲彩繪與睫毛服務",
    icon: "color-palette-outline",
  },
  {
    key: "massage",
    label: "按摩・SPA",
    description: "芳療、筋膜、紓壓療程",
    icon: "leaf-outline",
  },
  {
    key: "flower",
    label: "花藝・植栽",
    description: "花店、植栽設計",
    icon: "rose-outline",
  },
  {
    key: "pet",
    label: "寵物服務",
    description: "美容、旅館、陪伴",
    icon: "paw-outline",
  },
  {
    key: "craft",
    label: "手作・課程",
    description: "手工藝、體驗教材",
    icon: "apps-outline",
  },
  {
    key: "other",
    label: "其他",
    description: "未在清單中的產業",
    icon: "grid-outline",
  },
];

export default function CreateTeam() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("bakery");

  const createTeam = useCreateTeam();
  const { refetch: refetchTeams } = useTeams();
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert("請輸入團隊名稱", "團隊名稱不能為空", [{ text: "確定" }]);
      return;
    }

    try {
      const newTeam = await createTeam.mutateAsync({
        team_name: teamName.trim(),
        business_type: businessType,
      });

      useAuthStore.setState({
        currentTeamId: newTeam.id,
        status: AuthStatus.Active,
      });

      await refetchTeams();

      Alert.alert(
        "建立成功",
        `團隊「${teamName}」已建立，接下來請設定 LINE 官方帳號`,
        [{ text: "確定" }]
      );

      router.replace("/(onboarding)/line-setup");
    } catch (error) {
      console.error("建立團隊失敗:", error);
      Alert.alert("建立失敗", "無法建立團隊，請稍後再試", [{ text: "確定" }]);
    }
  };

  return (
    <OnboardingLayout>
      <Pressable
        onPress={() => router.back()}
        className="self-start mb-2 flex-row items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2"
      >
        <Ionicons name="chevron-back" size={16} color="#0F172A" />
        <Text className="text-xs font-semibold text-gray-900">返回</Text>
      </Pressable>

      <View className="space-y-2">
        <Text className="text-3xl font-black text-gray-900">建立新團隊</Text>
        <Text className="text-sm text-gray-600">為你的團隊取個好名字吧！</Text>
      </View>

      <View className="space-y-2">
        <Text className="text-sm font-semibold text-gray-700">團隊名稱</Text>
        <TextInput
          value={teamName}
          onChangeText={setTeamName}
          placeholder="例如：美味餐廳、甜點工作室"
          className="w-full h-14 bg-white rounded-2xl px-4 text-base border border-gray-200"
          placeholderTextColor="#94A3B8"
          autoFocus
        />
      </View>

      <View className="rounded-3xl border border-gray-100 bg-white/90 p-4 space-y-2">
        <Text className="text-sm font-semibold text-gray-900">
          選擇團隊類別
        </Text>
        <Text className="text-xs text-gray-500">
          類別會同步到 Supabase `teams.business_type`，AI
          會依行業調整回覆語氣與欄位。
        </Text>
        <View className="space-y-2">
          {categories.map((category) => {
            const isActive = businessType === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => setBusinessType(category.key)}
                className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <View
                  className={`w-10 h-10 rounded-2xl items-center justify-center ${
                    isActive ? "bg-white" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name={category.icon}
                    size={18}
                    color={isActive ? Palette.brand.primary : "#0F172A"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? "text-emerald-800" : "text-gray-900"
                    }`}
                  >
                    {category.label}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {category.description}
                  </Text>
                </View>
                <Ionicons
                  name={isActive ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={isActive ? Palette.brand.primary : "#94A3B8"}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={handleCreateTeam}
        disabled={createTeam.isPending || !teamName.trim()}
        className="w-full h-14 rounded-2xl items-center justify-center"
        style={{
          backgroundColor: Palette.brand.primary,
          opacity: createTeam.isPending || !teamName.trim() ? 0.6 : 1,
        }}
      >
        {createTeam.isPending ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="#FFFFFF" className="mr-2" />
            <Text className="text-white font-semibold text-base">
              建立中...
            </Text>
          </View>
        ) : (
          <Text className="text-white font-semibold text-base">建立團隊</Text>
        )}
      </Pressable>
    </OnboardingLayout>
  );
}
