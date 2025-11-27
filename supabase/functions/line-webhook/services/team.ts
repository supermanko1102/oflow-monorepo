import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import type { TeamContext } from "../../_shared/types.ts";

export type Team = TeamContext & {
  id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
  line_bot_user_id: string;
  auto_mode: boolean;
};

export async function fetchTeamByDestination(
  supabase: SupabaseClient,
  destination: string
): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, name, business_type, line_channel_secret, line_channel_access_token, line_bot_user_id, auto_mode"
    )
    .eq("line_bot_user_id", destination)
    .single();
  if (error || !data) {
    console.error("[LINE Webhook] 找不到團隊:", destination, error);
    return null;
  }
  return {
    ...(data as any),
    team_id: (data as any).team_id || (data as any).id,
  } as Team;
}
