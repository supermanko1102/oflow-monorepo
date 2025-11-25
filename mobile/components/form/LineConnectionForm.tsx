import { Palette } from "@/constants/palette";
import { updateLineSettings, validateLineChannel } from "@/services/teamService";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type LineFormValues = {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};

type LineConnectionFormProps = {
  currentTeamId?: string | null;
  currentChannelId: string;
  refetchTeams: () => Promise<any>;
  onCancel: () => void;
  onSuccess: (botName: string) => void;
};

export function LineConnectionForm({
  currentTeamId,
  currentChannelId,
  refetchTeams,
  onCancel,
  onSuccess,
}: LineConnectionFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LineFormValues>({
    defaultValues: {
      channelId: currentChannelId,
      channelSecret: "",
      channelAccessToken: "",
    },
  });

  useEffect(() => {
    reset({
      channelId: currentChannelId,
      channelSecret: "",
      channelAccessToken: "",
    });
  }, [currentChannelId, reset]);

  const openLineConsole = () => {
    Linking.openURL("https://developers.line.biz/console/");
  };

  const onSubmit = handleSubmit(
    async ({ channelId, channelSecret, channelAccessToken }) => {
      if (!currentTeamId) {
        Alert.alert("錯誤", "找不到團隊 ID", [{ text: "確定" }]);
        return;
      }
      const teamId = currentTeamId;

      try {
        const validation = await validateLineChannel({
          channel_id: channelId,
          channel_secret: channelSecret,
          channel_access_token: channelAccessToken,
        });
        const botName = validation.bot_name || channelId;

        if (!validation.valid) {
          Alert.alert("驗證失敗", validation.error || "請檢查輸入的資訊是否正確");
          return;
        }

        await updateLineSettings({
          team_id: teamId,
          line_channel_id: channelId,
          line_channel_secret: channelSecret,
          line_channel_access_token: channelAccessToken,
          line_channel_name: botName,
        });

        await refetchTeams();
        onSuccess(botName);
      } catch (error) {
        console.error("設定失敗:", error);
        Alert.alert("設定失敗", "無法完成設定，請稍後再試");
      }
    }
  );

  return (
    <>
      <View className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Channel ID
          </Text>
          <Controller
            control={control}
            name="channelId"
            rules={{ required: "請輸入 Channel ID" }}
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  placeholder="請輸入 Channel ID"
                  className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
                {errors.channelId && (
                  <Text className="mt-1 text-xs text-rose-500">
                    {errors.channelId.message}
                  </Text>
                )}
              </>
            )}
          />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Channel Secret
          </Text>
          <Controller
            control={control}
            name="channelSecret"
            rules={{ required: "請輸入 Channel Secret" }}
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  placeholder="請輸入 Channel Secret"
                  className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  secureTextEntry
                />
                {errors.channelSecret && (
                  <Text className="mt-1 text-xs text-rose-500">
                    {errors.channelSecret.message}
                  </Text>
                )}
              </>
            )}
          />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Channel Access Token
          </Text>
          <Controller
            control={control}
            name="channelAccessToken"
            rules={{ required: "請輸入 Channel Access Token" }}
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={(text) => onChange(text.trim())}
                  placeholder="請輸入 Channel Access Token"
                  className="h-14 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  multiline
                  style={{ height: 100, paddingTop: 12 }}
                />
                {errors.channelAccessToken && (
                  <Text className="mt-1 text-xs text-rose-500">
                    {errors.channelAccessToken.message}
                  </Text>
                )}
              </>
            )}
          />
        </View>

        <TouchableOpacity onPress={openLineConsole} className="items-center py-2">
          <Text className="text-sm font-medium text-brand-primary">
            如何取得這些資訊？
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-8">
        <TouchableOpacity
          onPress={onSubmit}
          disabled={isSubmitting}
          className="h-14 w-full items-center justify-center rounded-2xl shadow-sm"
          style={{
            backgroundColor: Palette.brand.primary,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              {currentChannelId ? "更新設定" : "連接帳號"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          className="mt-4 h-14 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white"
        >
          <Text className="text-base font-semibold text-gray-700">取消</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
