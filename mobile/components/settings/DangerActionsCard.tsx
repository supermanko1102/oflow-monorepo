import { SettingRow } from "./SettingRow";
import { Text, View } from "react-native";

type Props = {
  onLeaveTeam: () => void;
  onDeleteTeam: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isLeaving: boolean;
  isDeletingTeam: boolean;
  isLoggingOut: boolean;
  isDeletingAccount: boolean;
  leaveTeamPending: boolean;
  deleteTeamPending: boolean;
  deleteAccountPending: boolean;
  versionLabel: string;
};

export function DangerActionsCard({
  onLeaveTeam,
  onDeleteTeam,
  onLogout,
  onDeleteAccount,
  isLeaving,
  isDeletingTeam,
  isLoggingOut,
  isDeletingAccount,
  leaveTeamPending,
  deleteTeamPending,
  deleteAccountPending,
  versionLabel,
}: Props) {
  return (
    <View className="gap-3 rounded-3xl border border-slate-100 bg-white shadow-sm p-4">
      <Text className="text-sm font-bold text-slate-900">危險操作</Text>
      <Text className="text-sm text-slate-600">
        團隊 / 帳號相關高風險操作，請謹慎使用
      </Text>
      <View className="mt-3 gap-2">
        <SettingRow
          icon="exit-outline"
          label="退出目前團隊"
          detail="離開當前團隊並清除相關資料快取"
          actionLabel="退出"
          actionVariant="primary"
          onPress={onLeaveTeam}
          disabled={isLeaving || leaveTeamPending}
        />
        <SettingRow
          icon="trash-outline"
          label="刪除團隊"
          detail="不可復原，將永久刪除團隊資料"
          actionLabel="刪除"
          actionVariant="primary"
          onPress={onDeleteTeam}
          disabled={isDeletingTeam || deleteTeamPending}
        />
        <SettingRow
          icon="log-out-outline"
          label="登出帳號"
          detail="離開目前登入狀態"
          actionLabel="登出"
          actionVariant="primary"
          onPress={onLogout}
          disabled={isLoggingOut}
        />
        <SettingRow
          icon="person-remove-outline"
          label="刪除帳號"
          detail="不可復原，將永久刪除個人帳號與資料"
          actionLabel="刪除"
          actionVariant="primary"
          onPress={onDeleteAccount}
          disabled={isDeletingAccount || deleteAccountPending}
        />
        <Text className="text-[11px] text-slate-400 text-center mt-2">
          {versionLabel}
        </Text>
      </View>
    </View>
  );
}
