/**
 * Team Operations Service
 * 封裝所有團隊相關的 API 呼叫
 *
 * 使用統一的 ApiClient，消除重複程式碼
 */

import { ApiClient } from "@/lib/apiClient";
import { config } from "@/lib/config";
import type {
  CreateTeamParams,
  CreateTeamResponse,
  Team,
  TeamMember,
  TestWebhookParams,
  TestWebhookResponse,
  UpdateLineSettingsParams,
  UpdateLineSettingsResponse,
  ValidateLineChannelParams,
  ValidateLineChannelResponse,
} from "@/types/team";

// 建立 Team API Client 實例
const teamApi = new ApiClient(config.api.teamOperations);

// ==================== Team Queries ====================

/**
 * 查詢使用者的所有團隊
 */
export async function getUserTeams(): Promise<Team[]> {
  const { teams } = await teamApi.call<{ teams: Team[] }>("GET", "list");
  return teams;
}

/**
 * 查詢團隊成員
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { members } = await teamApi.call<{ members: TeamMember[] }>(
    "GET",
    "members",
    { team_id: teamId }
  );
  return members;
}

/**
 * 取得或建立邀請碼
 */
export async function getInviteCode(teamId: string): Promise<string> {
  const { invite_code } = await teamApi.call<{ invite_code: string }>(
    "GET",
    "invite",
    { team_id: teamId }
  );
  return invite_code;
}

// ==================== Team Mutations ====================

/**
 * 建立新團隊
 */
export async function createTeam(
  params: CreateTeamParams
): Promise<CreateTeamResponse> {
  const { team } = await teamApi.call<{ team: CreateTeamResponse }>(
    "POST",
    "create",
    undefined,
    params
  );
  return team;
}

/**
 * 加入團隊（使用邀請碼）
 */
export async function joinTeam(inviteCode: string): Promise<Team> {
  const { team } = await teamApi.call<{ team: Team }>(
    "POST",
    "join",
    undefined,
    { invite_code: inviteCode }
  );
  return team;
}

/**
 * 離開團隊
 */
export async function leaveTeam(teamId: string): Promise<void> {
  await teamApi.call<{ message: string }>("POST", "leave", undefined, {
    team_id: teamId,
  });
}

/**
 * 驗證 LINE Channel 資訊
 * 在儲存前先驗證 Channel 資訊是否有效
 */
export async function validateLineChannel(
  params: ValidateLineChannelParams
): Promise<ValidateLineChannelResponse> {
  try {
    // 1. 驗證 Access Token 是否有效
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
          errorData.message ||
          "Access Token 無效或已過期，請檢查是否正確複製",
      };
    }

    const botInfo = await botInfoResponse.json();

    // 2. 驗證 Channel ID 格式（LINE Channel ID 是數字）
    if (!/^\d+$/.test(params.channel_id.trim())) {
      return {
        valid: false,
        error: "Channel ID 格式不正確，應該是純數字",
      };
    }

    // 3. 驗證成功，回傳 Bot 資訊
    return {
      valid: true,
      bot_name: botInfo.displayName,
      bot_picture_url: botInfo.pictureUrl,
    };
  } catch (error: any) {
    console.error("[Validate LINE Channel] 驗證失敗:", error);
    return {
      valid: false,
      error: error.message || "網路錯誤，請檢查網路連線後重試",
    };
  }
}

/**
 * 更新團隊 LINE 官方帳號設定
 */
export async function updateLineSettings(
  params: UpdateLineSettingsParams
): Promise<UpdateLineSettingsResponse> {
  const response = await teamApi.call<UpdateLineSettingsResponse>(
    "POST",
    "update-line-settings",
    undefined,
    params
  );
  return response;
}

/**
 * 測試並自動設定 Webhook
 * 當用戶點擊「測試 Webhook」按鈕時呼叫
 */
export async function testWebhook(
  params: TestWebhookParams
): Promise<TestWebhookResponse> {
  const response = await teamApi.call<TestWebhookResponse>(
    "POST",
    "test-webhook",
    undefined,
    params
  );
  return response;
}

/**
 * 刪除團隊（永久刪除）
 */
export async function deleteTeam(teamId: string): Promise<void> {
  await teamApi.call<{ message: string }>("POST", "delete", undefined, {
    team_id: teamId,
  });
}
