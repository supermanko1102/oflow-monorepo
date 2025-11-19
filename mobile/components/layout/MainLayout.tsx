import { ReactNode } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  ScrollView,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Navbar, NavbarTab } from "@/components/Navbar";

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
  const hasDangerActions = !!dangerActions && dangerActions.length > 0;


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
        onTeamPress={onTeamPress}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onCreatePress={onCreatePress}
      />
      {content}
    </View>
  );
}
