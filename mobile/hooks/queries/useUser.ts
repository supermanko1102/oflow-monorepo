import { queryKeys } from "@/hooks/queries/queryKeys";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export function useUser() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async (): Promise<UserProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      // 嘗試從 metadata 獲取顯示名稱
      const metadata = user.user_metadata;

      return {
        id: user.id,
        email: user.email || "",
        displayName: metadata?.display_name || metadata?.full_name || "店主",
        avatarUrl: metadata?.avatar_url,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
}
