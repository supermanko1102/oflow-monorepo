import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import {useSafeAreaInsets } from "react-native-safe-area-context";

import { Navbar, NavbarTab } from "@/components/Navbar";

type MainLayoutProps = {
  title: string;
  subtitle?: string;
  teamName?: string;
  teamStatus?: "open" | "closed";
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
  tabs,
  trailingContent,
  children,
  scrollable = true,
  contentPaddingClassName = "px-6 pb-8",
  onTeamPress,
  onSearchPress,
  onNotificationsPress,
  onCreatePress,
}: MainLayoutProps) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;

  const baseContentClasses = `${contentPaddingClassName}`.trim();

  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={baseContentClasses}
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className={`flex-1 ${baseContentClasses}`}
      style={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}
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
        }}
      >
      <Navbar
        title={title}
        subtitle={subtitle}
        teamName={teamName}
        teamStatus={teamStatus}
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
