import { IconButton } from "@/components/Navbar";
import { LineConnectionForm } from "@/components/form/LineConnectionForm";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { BasicLayout } from "@/components/layout/BasicLayout";

export default function LineConnectionSettings() {
  const router = useRouter();
  const {
    currentTeamId,
    currentTeam,
    refetch: refetchTeams,
  } = useCurrentTeam();

  const screenshotSteps = [
    {
      title: "取得 Channel ID / Secret",
      description: "LINE Developers > Messaging API > 基本設定",
      source: require("../../../assets/images/line-channelId.png"),
    },
    {
      title: "查看 Channel Secret",
      description: "Messaging API > 基本設定 > Channel secret",
      source: require("../../../assets/images/secret.jpeg"),
    },
    {
      title: "生成 Channel access token",
      description: "Messaging API > 發行長期 Access Token",
      source: require("../../../assets/images/access.jpeg"),
    },
    {
      title: "啟用 Webhook",
      description: "Messaging API > Webhook 設定 > 開啟 Webhook 開關",
      source: require("../../../assets/images/line-webhook.png"),
    },
  ];

  return (
    <BasicLayout title="LINE 串接">
      <KeyboardAwareScrollView
        bottomOffset={50}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1"
      >
        <View className="p-4 flex-col gap-4">
          <View className="rounded-3xl bg-white border border-gray-100 p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-900">
                4 步驟設定示意
              </Text>
              <Text className="text-xs text-gray-500">左右滑動查看截圖</Text>
            </View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingHorizontal: 4 }}
            >
              {screenshotSteps.map((item) => (
                <View
                  key={item.title}
                  className="w-[320px] rounded-2xl border border-gray-100 bg-gray-50 p-3 shadow-sm"
                >
                  <Image
                    source={item.source}
                    className="w-full h-52 rounded-xl bg-gray-200"
                    resizeMode="cover"
                  />
                  <Text className="mt-3 text-sm font-semibold text-gray-900">
                    {item.title}
                  </Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    {item.description}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="chatbubbles-outline"
                  size={20}
                  color="#0F172A"
                />
                <Text className="text-xl font-bold text-gray-900">
                  連接 LINE 官方帳號
                </Text>
              </View>
              <IconButton
                ariaLabel="幫助"
                isDark={false}
                icon="help-circle-outline"
                onPress={() =>
                  Alert.alert(
                    "如何取得 Webhook URL？",
                    "在 Supabase Edge Function 部署後，複製 line-webhook 的 URL 貼至 LINE 後台。若需要協助，請聯繫支援。"
                  )
                }
              />
            </View>
            <Text className="text-sm text-gray-600 mb-3">
              連接後，AI 會自動讀取 LINE 訊息並整理訂單。照步驟貼上 Channel
              資訊即可啟用。
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {currentTeam?.line_channel_id ? (
                <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border border-green-100 bg-green-50">
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text className="text-[12px] font-semibold text-green-700">
                    已連接 · {currentTeam.line_channel_id}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border border-amber-100 bg-amber-50">
                  <Ionicons name="alert-circle" size={14} color="#D97706" />
                  <Text className="text-[12px] font-semibold text-amber-700">
                    尚未連接 · 填寫下方資訊啟用功能
                  </Text>
                </View>
              )}
              <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 bg-gray-50">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color="#0F172A"
                />
                <Text className="text-[12px] font-semibold text-gray-800">
                  僅團隊管理者可編輯
                </Text>
              </View>
            </View>
          </View>

          <View className="rounded-3xl bg-white border border-gray-100 p-5 shadow-sm">
            <LineConnectionForm
              currentTeamId={currentTeamId}
              currentChannelId={currentTeam?.line_channel_id ?? ""}
              refetchTeams={refetchTeams}
              onCancel={() => router.replace("/(main)/(tabs)/overview")}
              onSuccess={(botName) =>
                Alert.alert(
                  "設定成功",
                  `已成功連接 LINE 官方帳號：${botName}`,
                  [
                    {
                      text: "確定",
                      onPress: () => router.replace("/(main)/(tabs)/inbox"),
                    },
                  ]
                )
              }
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </BasicLayout>
  );
}
