import { ReactNode, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Navbar, NavbarTab } from "@/components/Navbar";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { useTeams } from "@/hooks/queries/useTeams";
import { useAuthStore } from "@/stores/auth";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  teamName?: string;
  teamStatus?: "open" | "closed";
  showActions?: boolean;
  showDangerTrigger?: boolean;
  dangerActions?: { label: string; onPress: () => void; destructive?: boolean }[];
  tabs?: NavbarTab[];
  trailingContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
  contentPaddingClassName?: string;
  onTeamPress?: () => void;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
  onCreatePress?: () => void;
};

export function MainLayout({
  title,
  subtitle,
  teamName,
  teamStatus = "open",
  showActions = true,
  showDangerTrigger = false,
  dangerActions,
  tabs,
  trailingContent,
  centerContent,
  rightContent,
  children,
  scrollable = true,
  onTeamPress,
  onSearchPress,
  onNotificationsPress,
  onCreatePress,
}: MainLayoutProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: teams = [] } = useTeams();
  const currentTeamId = useAuthStore((state) => state.currentTeamId);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const hasDangerActions = !!dangerActions && dangerActions.length > 0;

  const togglePicker = (visible: boolean) => setPickerVisible(visible);
  const isIOS = Platform.OS === "ios";

  const handleTeamPress = () => {
    onTeamPress?.();

    // iOS 用原生 ActionSheet：列出團隊 + 加入其他團隊
    if (Platform.OS === "ios") {
      const options = [
        ...teams.map(
          (team) =>
            `${team.team_name}${
              team.team_id === currentTeamId ? "（目前）" : ""
            }`
        ),
        "加入其他團隊…",
        "取消",
      ];
      const joinIndex = options.length - 2;
      const cancelIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex || buttonIndex == null) return;
          if (buttonIndex === joinIndex) {
            togglePicker(true); // 開啟邀請碼輸入
            return;
          }
          const selected = teams[buttonIndex];
          if (selected) {
            useAuthStore.getState().setCurrentTeamId(selected.team_id);
          }
        }
      );
      return;
    }

    // 其他平台使用自訂 Modal（含列表 + 邀請碼）
    togglePicker(true);
  };

  const handleDangerPress = () => {
    if (!hasDangerActions) return;
    if (Platform.OS === "ios") {
      const options = [
        ...dangerActions.map((action) => action.label),
        "取消",
      ];
      const destructiveIndex = dangerActions.findIndex((a) => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex:
            destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === options.length - 1) return;
          const action = dangerActions[buttonIndex];
          action?.onPress();
        }
      );
    } else {
      Alert.alert(
        "操作選擇",
        "請選擇要執行的項目",
        dangerActions.map((action) => ({
          text: action.label,
          style: action.destructive ? "destructive" : "default",
          onPress: action.onPress,
        })),
        { cancelable: true }
      );
    }
  };

  const content = scrollable ? (
    <ScrollView
      className="flex-1 px-6 pb-8"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className="flex-1 px-6 pb-8"
    >
      {children}
    </View>
  );

  const backgroundClass = isDark ? "bg-slate-900" : "bg-slate-50";
  return (
    <View
      className={`flex-1 ${backgroundClass}`}
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom + 60,
      }}
    >
      <Navbar
        title={title}
        subtitle={subtitle}
        teamName={teamName}
        teamStatus={teamStatus}
        showActions={showActions}
        showDangerTrigger={showDangerTrigger && hasDangerActions}
        onDangerPress={handleDangerPress}
        tabs={tabs}
        trailingContent={trailingContent}
        centerContent={centerContent}
        rightContent={rightContent}
        onTeamPress={handleTeamPress}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onCreatePress={onCreatePress}
      />
      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => togglePicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center"
          onPress={() => togglePicker(false)}
        >
          <View className="mx-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg space-y-3">
            <TeamSwitcher onClose={() => togglePicker(false)} showList={!isIOS} />
          </View>
        </Pressable>
      </Modal>
      {content}
    </View>
  );
}
