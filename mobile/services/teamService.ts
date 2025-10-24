/**
 * Team Operations Service
 * 封裝所有團隊相關的 Edge Function API 呼叫
 */

import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";

/**
 * 動態取得 Team Operations Edge Function URL
 * 確保使用與 Supabase client 相同的設定
 */
function getTeamOperationsUrl(): string {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured in app.config.js");
  }
  return `${supabaseUrl}/functions/v1/team-operations`;
}

interface Team {
  team_id: string;
  team_name: string;
  team_slug: string;
  role: string;
  member_count: number;
  order_count: number;
  subscription_status: string;
  line_channel_name: string | null;
}

interface TeamMember {
  member_id: string;
  user_id: string;
  user_name: string;
  user_picture_url: string | null;
  role: string;
  joined_at: string;
  can_manage_orders: boolean;
  can_manage_customers: boolean;
  can_manage_settings: boolean;
  can_view_analytics: boolean;
  can_invite_members: boolean;
}

interface CreateTeamParams {
  team_name: string;
  line_channel_id?: string | null;
  business_type?: string;
}

interface CreateTeamResponse {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
}

/**
 * 取得使用者的 access token
 */
async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("未登入或 session 已過期");
  }

  return session.access_token;
}

/**
 * 呼叫 Team Operations API
 */
async function callTeamAPI<T>(
  method: "GET" | "POST",
  action: string,
  params?: Record<string, string>,
  body?: any
): Promise<T> {
  try {
    const accessToken = await getAccessToken();
    
    // 動態取得 Edge Function URL
    const baseUrl = getTeamOperationsUrl();

    // 建立 URL
    const url = new URL(baseUrl);
    url.searchParams.set("action", action);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    console.log(`[Team Service] ${method} ${action}`, {
      url: url.toString(),
      params: params || {},
      body: body || {},
    });

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 檢查 HTTP status
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Team Service] HTTP ${response.status}:`, errorText);
      throw new Error(
        `API 請求失敗 (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "API 呼叫失敗");
    }

    console.log(`[Team Service] ${method} ${action} 成功`);
    return data;
  } catch (error) {
    // 加強錯誤訊息
    if (error instanceof TypeError && error.message === "Network request failed") {
      console.error("[Team Service] Network 錯誤 - 可能原因:");
      console.error("  1. Edge Function 尚未部署");
      console.error("  2. Supabase URL 設定錯誤");
      console.error("  3. 網路連線問題");
      console.error("  4. CORS 設定問題");
      throw new Error(
        "無法連線到伺服器，請檢查網路連線或聯絡管理員"
      );
    }
    throw error;
  }
}

/**
 * 查詢使用者的所有團隊
 */
export async function getUserTeams(): Promise<Team[]> {
  try {
    const response = await callTeamAPI<{ teams: Team[] }>("GET", "list");
    return response.teams;
  } catch (error) {
    console.error("[Team Service] 查詢團隊失敗:", error);
    throw error;
  }
}

/**
 * 建立新團隊
 */
export async function createTeam(
  params: CreateTeamParams
): Promise<CreateTeamResponse> {
  try {
    const response = await callTeamAPI<{ team: CreateTeamResponse }>(
      "POST",
      "create",
      undefined,
      params
    );
    return response.team;
  } catch (error) {
    console.error("[Team Service] 建立團隊失敗:", error);
    throw error;
  }
}

/**
 * 加入團隊（使用邀請碼）
 */
export async function joinTeam(inviteCode: string): Promise<Team> {
  try {
    const response = await callTeamAPI<{ team: Team }>(
      "POST",
      "join",
      undefined,
      { invite_code: inviteCode }
    );
    return response.team;
  } catch (error) {
    console.error("[Team Service] 加入團隊失敗:", error);
    throw error;
  }
}

/**
 * 離開團隊
 */
export async function leaveTeam(teamId: string): Promise<void> {
  try {
    await callTeamAPI("POST", "leave", undefined, { team_id: teamId });
  } catch (error) {
    console.error("[Team Service] 離開團隊失敗:", error);
    throw error;
  }
}

/**
 * 查詢團隊成員
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const response = await callTeamAPI<{ members: TeamMember[] }>(
      "GET",
      "members",
      { team_id: teamId }
    );
    return response.members;
  } catch (error) {
    console.error("[Team Service] 查詢團隊成員失敗:", error);
    throw error;
  }
}

/**
 * 取得或建立邀請碼
 */
export async function getInviteCode(teamId: string): Promise<string> {
  try {
    const response = await callTeamAPI<{ invite_code: string }>(
      "GET",
      "invite",
      { team_id: teamId }
    );
    return response.invite_code;
  } catch (error) {
    console.error("[Team Service] 取得邀請碼失敗:", error);
    throw error;
  }
}
