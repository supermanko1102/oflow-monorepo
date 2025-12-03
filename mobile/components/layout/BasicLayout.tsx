import { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingBottom?: number;
};

export function BasicLayout({
  title,
  subtitle,
  children,
  scrollable = true,
  backgroundColor = "#F8FAFC",
  paddingHorizontal = 20,
  paddingBottom = 24,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal,
        paddingBottom: paddingBottom + insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className="flex-1"
      style={{
        paddingHorizontal,
        paddingBottom: paddingBottom + insets.bottom,
      }}
    >
      {children}
    </View>
  );

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor,
        paddingTop: insets.top,
      }}
    >
      {(title || subtitle) && (
        <View
          className="flex-row items-center"
          style={{
            paddingHorizontal,
            paddingBottom: 12,
            paddingTop: 8,
          }}
        >
          <View className="w-12 items-start">
            <Pressable
              onPress={router.back}
              className="w-10 h-10 rounded-full items-center justify-center bg-white border border-slate-200"
            >
              <Ionicons name="chevron-back" size={18} color="#0F172A" />
            </Pressable>
          </View>

          <View className="flex-1 items-center">
            {title ? (
              <Text className="text-xl font-bold text-slate-900">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text className="text-[12px] text-slate-500 mt-1">
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View className="w-12 items-end"></View>
        </View>
      )}
      {content}
    </View>
  );
}
