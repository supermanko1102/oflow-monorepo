import { IconButton } from "@/components/Navbar";
import { LineConnectionForm } from "@/components/form/LineConnectionForm";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { BasicLayout } from "@/components/layout/BasicLayout";

export default function LineConnectionSettings() {
  const router = useRouter();
  const {
    currentTeamId,
    currentTeam,
    refetch: refetchTeams,
  } = useCurrentTeam();

  return (
    <BasicLayout title="LINE 串接">
      <KeyboardAwareScrollView
        bottomOffset={50}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1"
      >
        <View className="p-4">
          <View className="mb-6">
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              連接 LINE 官方帳號
            </Text>
            <Text className="text-sm text-gray-500">
              連接後，AI 將自動讀取訊息並為您整理訂單
            </Text>
            <View className="mt-3 self-start">
              {currentTeam?.line_channel_id ? (
                <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-green-100 bg-green-50">
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text className="text-[12px] font-semibold text-green-700">
                    已連接 · {currentTeam.line_channel_id}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-amber-100 bg-amber-50">
                  <Ionicons name="alert-circle" size={14} color="#D97706" />
                  <Text className="text-[12px] font-semibold text-amber-700">
                    尚未連接 · 填寫下方資訊啟用功能
                  </Text>
                </View>
              )}
            </View>
          </View>

          <LineConnectionForm
            currentTeamId={currentTeamId}
            currentChannelId={currentTeam?.line_channel_id ?? ""}
            refetchTeams={refetchTeams}
            onCancel={() => router.replace("/(main)/(tabs)/overview")}
            onSuccess={(botName) =>
              Alert.alert("設定成功", `已成功連接 LINE 官方帳號：${botName}`, [
                {
                  text: "確定",
                  onPress: () => router.replace("/(main)/(tabs)/inbox"),
                },
              ])
            }
          />
        </View>
      </KeyboardAwareScrollView>
    </BasicLayout>
  );
}
