import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";

const prerequisites = [
  "你的品牌或門市名稱",
  "若要加入別人的團隊，需要邀請碼",
  "若要建立團隊並啟用 AI，需準備 LINE 官方帳號",
];

const slides = [
  {
    key: "intro",
    badge: "新手引導",
    badgeText: "#047857",
    badgeBg: "#DCFCE7",
    background: "#F0FDF9",
    title: "打造第一個團隊",
    description: "OFlow 會在幾個步驟內幫你完成團隊設定與 LINE 鏈結。",
    chips: ["團隊資訊", "邀請夥伴", "LINE Webhook"],
    icon: "sparkles" as const,
    iconBg: "#D1FAE5",
  },
  {
    key: "workflow",
    badge: "運作方式",
    badgeText: "#1D4ED8",
    badgeBg: "#DBEAFE",
    background: "#F4F8FF",
    title: "團隊 = 共享的工作區",
    description: "所有人看到的訂單、訊息與提醒都同步，方便一起回覆客戶。",
    list: [
      {
        title: "建立團隊",
        body: "先填寫店家資料，設定對外顯示的名稱與品牌調性。",
      },
      {
        title: "加入夥伴",
        body: "輸入邀請碼即可進入現有團隊，直接接手訊息。",
      },
    ],
    icon: "chatbubbles-outline" as const,
    iconBg: "#DBEAFE",
  },
  {
    key: "ready",
    badge: "開始之前",
    badgeText: "#C2410C",
    badgeBg: "#FEF3C7",
    background: "#FFFBEB",
    title: "準備好這些資訊",
    description: "帶著以下資訊，設定會更順暢；之後也能再調整。",
    checklist: prerequisites,
    icon: "checkbox-outline" as const,
    iconBg: "#FDE68A",
  },
] as const;

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

type Slide = (typeof slides)[number];

function Dot({
  index,
  width,
  scrollX,
}: {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value / width,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolate.CLAMP
    );
    return {
      width: 10 + 10 * progress,
      opacity: 0.35 + 0.55 * progress,
      backgroundColor: Palette.brand.primary,
    };
  });

  return (
    <Animated.View
      className="h-2 rounded-full bg-gray-200"
      style={[{ width: 10 }, animatedStyle]}
    />
  );
}

function SlideCard({
  slide,
  index,
  width,
}: {
  slide: Slide;
  index: number;
  width: number;
}) {
  return (
    <View style={{ width }} className="px-1 pb-2">
      <View
        className="flex-1 rounded-2xl p-6 justify-between"
        style={{ backgroundColor: slide.background }}
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: slide.badgeBg }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: slide.badgeText }}
                >
                  {slide.badge}
                </Text>
              </View>
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center"
                style={{ backgroundColor: slide.iconBg }}
              >
                <Ionicons
                  name={slide.icon}
                  size={20}
                  color={Palette.brand.primary}
                />
              </View>
            </View>
            <Text className="text-xs font-semibold text-gray-500">
              0{index + 1}/{slides.length}
            </Text>
          </View>

          <Text className="text-2xl font-black text-gray-900 leading-8">
            {slide.title}
          </Text>
          <Text className="text-base text-gray-700 leading-6">
            {slide.description}
          </Text>
        </View>

        {slide.chips ? (
          <View className="flex-row flex-wrap gap-2 pt-4">
            {slide.chips.map((chip) => (
              <View
                key={chip}
                className="px-3 py-1 rounded-full border border-white/60 bg-white/80"
              >
                <Text className="text-xs font-medium text-gray-700">{chip}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {slide.list ? (
          <View className="pt-4 space-y-3">
            {slide.list.map((item, itemIndex) => (
              <View key={item.title} className="flex-row gap-3 items-start">
                <View className="w-10 h-10 rounded-2xl bg-white/80 items-center justify-center">
                  <Text className="text-xs font-bold text-gray-900">
                    0{itemIndex + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {item.title}
                  </Text>
                  <Text className="text-sm text-gray-700 leading-5">
                    {item.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {slide.checklist ? (
          <View className="pt-4 space-y-3">
            {slide.checklist.map((item) => (
              <View key={item} className="flex-row items-start gap-3">
                <View className="w-4 h-4 mt-1 rounded-full bg-amber-400" />
                <Text className="text-sm text-gray-800 flex-1 leading-5">
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function TeamSetupIndex() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(width - 48, 280);
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const renderOption = (option: (typeof options)[number]) => {
    const isPrimary = option.variant === "primary";
    return (
      <Pressable
        key={option.key}
        onPress={() => router.push(option.href)}
        className={`rounded-3xl p-5 flex-row items-center justify-between border ${
          isPrimary ? "border-transparent" : "border-gray-100 bg-white"
        }`}
        style={isPrimary ? { backgroundColor: Palette.brand.primary } : undefined}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
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
              className={`text-base font-semibold ${
                isPrimary ? "text-white" : "text-gray-900"
              }`}
            >
              {option.title}
            </Text>
            <Text
              className={`text-xs mt-1 ${
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
    );
  };

  return (
    <OnboardingLayout>
      <View className="gap-6">
        <View className="rounded-3xl border border-gray-100 bg-white/90 shadow-sm overflow-hidden">
          <View className="px-6 pt-6 pb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                <Text className="text-xs font-semibold text-emerald-700">
                  左右滑動，先看流程
                </Text>
              </View>
              <Ionicons name="hand-left-outline" size={16} color="#0F172A" />
            </View>
            <Text className="text-xs text-gray-500">{slides.length} 張卡片</Text>
          </View>

          <View className="items-center">
            <Animated.ScrollView
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              snapToInterval={cardWidth}
              decelerationRate="fast"
              style={{ width: cardWidth }}
            >
              {slides.map((slide, index) => (
                <SlideCard
                  key={slide.key}
                  slide={slide}
                  index={index}
                  width={cardWidth}
                />
              ))}
            </Animated.ScrollView>
          </View>

          <View className="flex-row items-center justify-center gap-2 py-4">
            {slides.map((_, index) => (
              <Dot
                key={`dot-${index}`}
                index={index}
                width={cardWidth}
                scrollX={scrollX}
              />
            ))}
          </View>
        </View>

        <View className="rounded-3xl border border-gray-100 bg-white/95 p-4 space-y-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="flash-outline" size={16} color={Palette.brand.primary} />
              <Text className="text-base font-semibold text-gray-900">準備開始</Text>
            </View>
            <Text className="text-xs text-gray-500">挑一個行動</Text>
          </View>
          <View className="space-y-4">{options.map(renderOption)}</View>
        </View>

        <View className="items-center px-4">
          <Text className="text-xs text-center text-gray-500">
            建立或加入後，仍可於設定頁切換其他團隊。
          </Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}
