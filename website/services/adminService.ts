import { ApiClient } from "@/lib/apiClient";

const adminApi = new ApiClient(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin`
);

export async function verifyLine(params: {
  line_channel_id: string;
  line_channel_secret: string;
  line_channel_access_token: string;
}) {
  return adminApi.call<{
    success: boolean;
    line_bot_user_id: string;
    webhook_url: string;
    webhook_test_success: boolean;
    bot_name?: string;
    bot_picture_url?: string;
  }>("POST", "verify-line", undefined, params);
}

export async function adminCreateTeam(params: {
  team_name: string;
  business_type?: string;
  line_channel_id?: string;
  line_channel_secret?: string;
  line_channel_access_token?: string;
  line_channel_name?: string;
  owner_user_id?: string;
  slug?: string;
}) {
  return adminApi.call<{
    success: boolean;
    team: { id: string; name: string; slug: string };
  }>("POST", "create-team", undefined, params);
}

export async function adminCreateInvite(params: {
  team_id: string;
  role?: string;
  max_uses?: number;
  is_system?: boolean;
}) {
  return adminApi.call<{
    success: boolean;
    invite_code: string;
    reused?: boolean;
  }>("POST", "create-invite", undefined, params);
}
