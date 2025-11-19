import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useDerivedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";

const options = [
  {
    key: "create",
    title: "建立新團隊",
    description: "建立屬於你的團隊，邀請成員一起管理訂單",
    icon: "sparkles-outline" as const,
    variant: "primary" as const,
    href: "/(onboarding)/team-setup/create",
  },
  {
    key: "join",
    title: "加入現有團隊",
    description: "使用邀請碼加入其他人的團隊",
    icon: "people-outline" as const,
    variant: "secondary" as const,
    href: "/(onboarding)/team-setup/join",
  },
] as const;



const prerequisites = [
  "你的品牌或門市名稱",
  "若要加入別人的團隊，需要邀請碼",
  "若要建立團隊並啟用 AI，需準備 LINE 官方帳號",
];

export default function TeamSetupIndex() {
  const router = useRouter();
  const pulse = useSharedValue(0);
  const hasStarted = useSharedValue(false);

  useDerivedValue(() => {
    if (hasStarted.value) return;
    hasStarted.value = true;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600 }),
        withTiming(0, { duration: 1600 })
      ),
      -1,
      false
    );
  });
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
  }));

  const renderOption = (option: (typeof options)[number]) => {
    const isPrimary = option.variant === "primary";
    return (
      <View key={option.key} className="relative">
        {isPrimary ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: 32,
                borderWidth: 2,
                borderColor: Palette.brand.primary,
              },
              pulseStyle,
            ]}
          />
        ) : null}
        <Pressable
          onPress={() => router.push(option.href)}
          className={`rounded-3xl p-6 flex-row items-center justify-between ${
            isPrimary ? "" : "border border-gray-100 bg-white"
          }`}
          style={
            isPrimary ? { backgroundColor: Palette.brand.primary } : undefined
          }
        >
          <View className="flex-row items-center gap-4 flex-1">
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                isPrimary ? "bg-white/20" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={isPrimary ? "#FFFFFF" : "#0F172A"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-xl font-bold ${
                  isPrimary ? "text-white" : "text-gray-900"
                }`}
              >
                {option.title}
              </Text>
              <Text
                className={`text-sm mt-1 ${
                  isPrimary ? "text-white/80" : "text-gray-600"
                }`}
              >
                {option.description}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isPrimary ? "#FFFFFF" : "#64748B"}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <OnboardingLayout >
      <View className="rounded-3xl border border-emerald-100 bg-white/95 p-6 items-center  shadow-sm">
        <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center">
          <Ionicons name="sparkles" size={26} color={Palette.brand.primary} />
        </View>
        <View className="px-4 py-1 rounded-full bg-emerald-50 border border-emerald-100">
          <Text className="text-xs font-semibold text-emerald-700 tracking-widest">
            新手引導
          </Text>
        </View>
        <View className="space-y-2">
          <Text className="text-3xl font-black text-center text-gray-900">
            打造第一個團隊
          </Text>
          <Text className="text-base text-center text-gray-600">
            OFlow 會在幾個步驟內幫你完成團隊設定與 LINE 鏈結。
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-center gap-2">
          {["團隊資訊", "邀請夥伴", "LINE Webhook"].map((tag) => (
            <View
              key={tag}
              className="px-3 py-1 rounded-full bg-white/90 border border-gray-100"
            >
              <Text className="text-xs font-medium text-gray-600">{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="rounded-3xl border border-gray-100 bg-white/90 p-4 space-y-3">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#0F172A"
          />
          <Text className="text-sm font-semibold text-gray-900">什麼是團隊？</Text>
        </View>
        <Text className="text-sm text-gray-600">
          把團隊想成你跟夥伴的同一個帳號：大家在這裡看到的訂單、訊息、提醒都一樣。建立團隊時會先輸入店家資料；如果加入其他人的團隊，就能直接在他們的工作區一起回覆客戶。
        </Text>
      </View>

      <View className="rounded-3xl border border-gray-100 bg-white/80 p-4 space-y-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="checkmark-circle-outline" size={18} color={Palette.brand.primary} />
          <Text className="text-sm font-semibold text-gray-900">開始前你需要</Text>
        </View>
        {prerequisites.map((item) => (
          <View key={item} className="flex-row items-start gap-2 mt-1">
            <View className="w-2 h-2 rounded-full bg-emerald-400 mt-2" />
            <Text className="text-sm text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </View>

      <View className="space-y-4">{options.map(renderOption)}</View>

      <View className="items-center">
        <Text className="text-xs text-center text-gray-500">
          建立或加入後，仍可於設定頁切換其他團隊。
        </Text>
      </View>

    </OnboardingLayout>
  );
}
