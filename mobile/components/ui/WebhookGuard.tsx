import { ReactNode } from "react";
import { View } from "react-native";

import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { NoWebhookState } from "./NoWebhookState";

type Props = {
  children: ReactNode;
};

export function WebhookGuard({ children }: Props) {
  const { hasWebhook, isLoading: isTeamLoading } = useCurrentTeam();
  const showOverlay = !hasWebhook && !isTeamLoading;

  return (
    <View className="flex-1 relative">
      {children}
      {showOverlay && <NoWebhookState />}
    </View>
  );
}
