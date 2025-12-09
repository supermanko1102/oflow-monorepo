import { ApiClient } from "@/lib/apiClient";

type TeamRow = {
  team_id: string;
  team_name: string;
  team_slug: string;
  subscription_status?: string;
  member_count?: number;
  order_count?: number;
  line_channel_id?: string | null;
  line_channel_name?: string | null;
  auto_mode?: boolean;
  business_type?: string | null;
  created_at?: string;
  role?: string;
};

const teamApi = new ApiClient(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/team-operations`
);

const adminApi = new ApiClient(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin`
);

export async function getUserTeams() {
  const { teams } = await teamApi.call<{ teams: TeamRow[] }>("GET", "list");
  return teams;
}

export async function getAllTeams() {
  const { teams } = await adminApi.call<{ teams: TeamRow[] }>(
    "GET",
    "teams"
  );
  return teams;
}

export async function getTeamMembers(teamId: string) {
  const { members } = await teamApi.call<{ members: unknown[] }>(
    "GET",
    "members",
    { team_id: teamId }
  );
  return members;
}

export async function getInviteCode(teamId: string): Promise<string> {
  const { invite_code } = await teamApi.call<{ invite_code: string }>(
    "GET",
    "invite",
    { team_id: teamId }
  );
  return invite_code;
}

export async function createTeam(params: unknown) {
  const { team } = await teamApi.call<{ team: TeamRow }>(
    "POST",
    "create",
    undefined,
    params
  );
  return team;
}

export async function joinTeam(inviteCode: string) {
  const { team } = await teamApi.call<{ team: TeamRow }>(
    "POST",
    "join",
    undefined,
    { invite_code: inviteCode }
  );
  return team;
}

export async function leaveTeam(teamId: string): Promise<void> {
  await teamApi.call<{ message: string }>("POST", "leave", undefined, {
    team_id: teamId,
  });
}

export async function validateLineChannel(params: {
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
}) {
  try {
    const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${params.channel_access_token}`,
      },
    });

    if (!botInfoResponse.ok) {
      const errorData = await botInfoResponse.json().catch(() => ({}));
      return {
        valid: false,
        error:
          errorData.message || "Access Token 無效或已過期，請檢查是否正確複製",
      };
    }

    const botInfo = await botInfoResponse.json();

    if (!/^\d+$/.test(params.channel_id.trim())) {
      return {
        valid: false,
        error: "Channel ID 格式不正確，應該是純數字",
      };
    }

    return {
      valid: true,
      bot_name: botInfo.displayName,
      bot_picture_url: botInfo.pictureUrl,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "網路錯誤，請檢查網路連線後重試";
    console.error("[Validate LINE Channel] 驗證失敗:", error);
    return {
      valid: false,
      error: message,
    };
  }
}

export async function updateLineSettings(params: unknown) {
  const response = await teamApi.call<{ webhook_url: string }>(
    "POST",
    "update-line-settings",
    undefined,
    params
  );
  return response;
}

export async function testWebhook(params: unknown) {
  const response = await teamApi.call<{
    webhook_url?: string;
    webhook_configured?: boolean;
  }>("POST", "test-webhook", undefined, params);
  return response;
}

export async function deleteTeam(teamId: string): Promise<void> {
  await teamApi.call<{ message: string }>("POST", "delete", undefined, {
    team_id: teamId,
  });
}

export async function updateAutoMode(
  teamId: string,
  autoMode: boolean
): Promise<void> {
  await teamApi.call("POST", "update-auto-mode", undefined, {
    team_id: teamId,
    auto_mode: autoMode,
  });
}
