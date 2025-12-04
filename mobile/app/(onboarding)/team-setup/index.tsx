import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Palette } from "@/constants/palette";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Slide = {
  key: string;
  badge: string;
  badgeText: string;
  badgeBg: string;
  background: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  chips?: readonly string[];
  list?: readonly { title: string; body: string }[];
  checklist?: readonly string[];
  showOptions?: boolean;
};

const prerequisites = [
  "你的品牌或門市名稱",
  "若要加入別人的團隊，需要邀請碼",
  "若要建立團隊並啟用 AI，需準備 LINE 官方帳號",
];

const slides: Slide[] = [
  {
    key: "intro",
    badge: "新手引導",
    badgeText: "#0F172A",
    badgeBg: "#E2E8F0",
    background: "#F8FAFC",
    title: "打造第一個團隊",
    description: "OFlow 會在幾個步驟內幫你完成團隊設定與 LINE 鏈結。",
    chips: ["團隊資訊", "邀請夥伴", "LINE Webhook"],
    icon: "sparkles" as const,
    iconBg: "#E2E8F0",
  },
  {
    key: "workflow",
    badge: "運作方式",
    badgeText: "#0F172A",
    badgeBg: "#E2E8F0",
    background: "#F8FAFC",
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
    iconBg: "#E2E8F0",
  },
  {
    key: "ready",
    badge: "開始之前",
    badgeText: "#0F172A",
    badgeBg: "#E2E8F0",
    background: "#F8FAFC",
    title: "準備好這些資訊",
    description: "帶著以下資訊，設定會更順暢；之後也能再調整。",
    checklist: prerequisites,
    icon: "checkbox-outline" as const,
    iconBg: "#E2E8F0",
  },
  {
    key: "start",
    badge: "準備開始",
    badgeText: "#0F172A",
    badgeBg: "#E2E8F0",
    background: "#F8FAFC",
    title: "選擇你的下一步",
    description: "滑完引導後再決定要建立新團隊，或用邀請碼加入夥伴。",
    chips: ["建立或加入", "隨時可切換團隊"],
    icon: "flash-outline" as const,
    iconBg: "#E2E8F0",
    showOptions: true,
  },
];

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

function OptionButton({
  option,
  onPress,
}: {
  option: (typeof options)[number];
  onPress: (href: string) => void;
}) {
  const isPrimary = option.variant === "primary";
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(pressed.value ? 0.98 : 1, { duration: 120 });
    const opacity = withTiming(pressed.value ? 0.92 : 1, { duration: 120 });
    return { transform: [{ scale }], opacity };
  });

  return (
    <AnimatedPressable
      onPress={() => onPress(option.href)}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      className={`rounded-2xl p-5 flex-row items-center justify-between border shadow-sm ${
        isPrimary
          ? "bg-brand-teal border-brand-teal"
          : "bg-white border-gray-200"
      }`}
      style={animatedStyle}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className={`w-11 h-11 rounded-2xl items-center justify-center ${
            isPrimary ? "bg-white/10" : "bg-gray-100"
          }`}
        >
          <Ionicons
            name={option.icon}
            size={22}
            color={isPrimary ? "#FFFFFF" : Palette.brand.primary}
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
    </AnimatedPressable>
  );
}

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
      "clamp"
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
  height,
  onSelectOption,
}: {
  slide: Slide;
  index: number;
  width: number;
  height: number;
  onSelectOption?: (href: string) => void;
}) {
  return (
    <View style={{ width }} className="px-1 pb-2">
      <View
        className="rounded-3xl p-8 justify-between border border-gray-100 shadow-[0px_14px_30px_rgba(15,23,42,0.06)]"
        style={{ backgroundColor: slide.background, height }}
      >
        <View className="gap-5 flex-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
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
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: slide.iconBg }}
              >
                <Ionicons
                  name={slide.icon}
                  size={22}
                  color={Palette.brand.primary}
                />
              </View>
            </View>
            <Text className="text-xs font-semibold text-gray-500 tracking-wider">
              STEP 0{index + 1}/{slides.length}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-3xl font-black text-gray-900 leading-9">
              {slide.title}
            </Text>
            <Text className="text-base text-gray-700 leading-6">
              {slide.description}
            </Text>
          </View>

          {slide.chips ? (
            <View className="flex-row flex-wrap gap-2">
              {slide.chips.map((chip) => (
                <View
                  key={chip}
                  className="px-3 py-1 rounded-full border border-gray-200 bg-white"
                >
                  <Text className="text-xs font-medium text-gray-700">
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {slide.list ? (
            <View className="rounded-2xl border border-gray-100 bg-white px-4 py-3 space-y-3">
              {slide.list.map((item, itemIndex) => (
                <View key={item.title} className="flex-row gap-3 items-start">
                  <View className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
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
            <View className="rounded-2xl border border-gray-100 bg-white px-4 py-3 space-y-3">
              {slide.checklist.map((item) => (
                <View key={item} className="flex-row items-start gap-3">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={Palette.brand.primary}
                    style={{ marginTop: 2 }}
                  />
                  <Text className="text-sm text-gray-800 flex-1 leading-5">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {slide.showOptions ? (
            <View className="pt-2 gap-3">
              {options.map((option) => (
                <OptionButton
                  key={option.key}
                  option={option}
                  onPress={(href) => onSelectOption?.(href)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function TeamSetupIndex() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.max(width - 32, 300);
  const cardHeight = Math.max(height - 220, 540);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });
  const handleMomentumEnd = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setCurrentIndex(page);
  };

  return (
    <OnboardingLayout>
      <View className="gap-5">
        <View className="flex-row items-center justify-between px-2">
          <View className="flex-row items-center gap-2">
            <View className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <Text className="text-xs font-semibold text-emerald-700">
                左右滑動，先看完流程
              </Text>
            </View>
            <Ionicons name="hand-left-outline" size={16} color="#0F172A" />
          </View>
        </View>

        <View className="items-center">
          <Animated.ScrollView
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={handleMomentumEnd}
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
                height={cardHeight}
                onSelectOption={(href) => router.push(href as any)}
              />
            ))}
          </Animated.ScrollView>
        </View>

        <View className="flex-row items-center justify-center gap-2">
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
    </OnboardingLayout>
  );
}
