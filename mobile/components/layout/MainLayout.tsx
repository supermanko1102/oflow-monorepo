import { ReactNode, useMemo, useState } from "react";
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
  const setCurrentTeamId = useAuthStore((state) => state.setCurrentTeamId);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const hasDangerActions = !!dangerActions && dangerActions.length > 0;

  const isSingleTeam = useMemo(() => teams.length <= 1, [teams.length]);
  const togglePicker = (visible: boolean) => setPickerVisible(visible);

  const handleTeamSelect = (selectedTeamId: string) => {
    if (!selectedTeamId || selectedTeamId === currentTeamId) {
      togglePicker(false);
      return;
    }
    setCurrentTeamId(selectedTeamId);
    togglePicker(false);
  };

  const handleTeamPress = () => {
    onTeamPress?.();
    if (!teams.length || isSingleTeam) {
      Alert.alert("尚無其他團隊", "請建立或加入新團隊以切換");
      return;
    }

    if (Platform.OS === "ios") {
      const options = [
        ...teams.map(
          (team) =>
            `${team.team_name}${
              team.team_id === currentTeamId ? "（目前）" : ""
            }`
        ),
        "取消",
      ];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex === options.length - 1) return;
          const selected = teams[buttonIndex];
          if (selected) handleTeamSelect(selected.team_id);
        }
      );
      return;
    }

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
          className="flex-1 bg-black/40"
          onPress={() => togglePicker(false)}
        >
          <View className="mt-16 mx-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <Text className="text-base font-semibold text-slate-900 mb-3">
              切換團隊
            </Text>
            {teams.map((team) => {
              const isActive = team.team_id === currentTeamId;
              return (
                <Pressable
                  key={team.team_id}
                  onPress={() => handleTeamSelect(team.team_id)}
                  className={`flex-row items-center justify-between rounded-xl px-3 py-3 mb-2 ${
                    isActive ? "bg-slate-100" : "bg-white"
                  }`}
                >
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">
                      {team.team_name}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      成員 {team.member_count} 人
                    </Text>
                  </View>
                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#14b8a6"
                    />
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => togglePicker(false)}
              className="mt-2 items-center py-2"
            >
              <Text className="text-sm font-semibold text-brand-slate">
                關閉
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      {content}
    </View>
  );
}
