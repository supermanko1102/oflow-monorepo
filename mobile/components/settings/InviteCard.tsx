import { Palette } from "@/constants/palette";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  inviteCode?: string | null;
  isLoading: boolean;
  isRefetching: boolean;
  onCopyInvite: () => void;
  onRefetchInvite: () => void;
};

export function InviteCard({
  inviteCode,
  isLoading,
  isRefetching,
  onCopyInvite,
  onRefetchInvite,
}: Props) {
  return (
    <View className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-sm font-semibold text-slate-900">邀請成員</Text>
          <Text className="text-[12px] text-slate-500 mt-0.5">
            分享邀請碼讓夥伴加入此團隊
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
        <View className="flex-1">
          <Text className="text-[11px] text-slate-500 mb-1">邀請碼</Text>
          {isLoading || isRefetching ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color={Palette.brand.primary} />
              <Text className="text-sm text-slate-500">生成中...</Text>
            </View>
          ) : (
            <Text className="text-xl font-bold tracking-widest text-slate-900">
              {inviteCode || "尚未產生"}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onCopyInvite}
          className="ml-3 px-3 py-2 rounded-full"
          style={{
            backgroundColor: inviteCode ? Palette.brand.primary : "#E2E8F0",
          }}
          disabled={!inviteCode}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: inviteCode ? "#FFFFFF" : "#94A3B8" }}
          >
            複製
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
