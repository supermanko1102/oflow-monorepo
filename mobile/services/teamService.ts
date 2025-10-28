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
  UpdateLineSettingsParams,
  UpdateLineSettingsResponse,
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
 * 刪除團隊（永久刪除）
 */
export async function deleteTeam(teamId: string): Promise<void> {
  await teamApi.call<{ message: string }>("POST", "delete", undefined, {
    team_id: teamId,
  });
}
