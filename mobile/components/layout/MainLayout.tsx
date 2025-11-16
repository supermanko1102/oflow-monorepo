import { ReactNode } from "react";
import { ActionSheetIOS, Alert, Platform, ScrollView, View } from "react-native";
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
  children,
  scrollable = true,
  onTeamPress,
  onSearchPress,
  onNotificationsPress,
  onCreatePress,
}: MainLayoutProps) {
  const insets = useSafeAreaInsets();
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

  return (
      <View
        className="flex-1"
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
        onTeamPress={onTeamPress}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
        onCreatePress={onCreatePress}
      />
        {content}
      </View>
  );
}
