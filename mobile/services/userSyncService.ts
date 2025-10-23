import { supabase } from "@/lib/supabase";

export interface SupabaseUser {
  id: string;
  auth_user_id: string | null;
  line_user_id: string;
  line_display_name: string | null;
  line_picture_url: string | null;
  line_email: string | null;
  current_team_id: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * ⚠️ DEPRECATED: User sync 現在由 Edge Function 處理
 *
 * 此函數已不再使用，因為：
 * 1. LINE token 交換現在在 backend 進行
 * 2. Supabase Auth user 建立在 Edge Function 中處理
 * 3. public.users 同步也在 Edge Function 中完成
 *
 * 保留此檔案僅供參考，未來可能移除。
 */

/**
 * 更新使用者的當前團隊
 */
export const updateCurrentTeam = async (
  userId: string,
  teamId: string | null
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("users")
      .update({
        current_team_id: teamId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`更新當前團隊失敗: ${error.message}`);
    }

    console.log("[User Sync] 當前團隊更新成功");
  } catch (error) {
    console.error("[User Sync] 更新當前團隊錯誤:", error);
    throw error;
  }
};

/**
 * 取得使用者資料
 */
export const getUserById = async (userId: string): Promise<SupabaseUser> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error(`取得使用者失敗: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("[User Sync] 取得使用者錯誤:", error);
    throw error;
  }
};

/**
 * 取得使用者的所有團隊
 */
export const getUserTeams = async (userId: string): Promise<any[]> => {
  try {
    console.log("[User Sync] 取得使用者團隊:", userId);

    const { data, error } = await supabase
      .from("team_members")
      .select(
        `
        *,
        teams:team_id (
          id,
          name,
          slug,
          logo_url,
          business_type,
          subscription_status,
          member_count,
          created_at
        )
      `
      )
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("[User Sync] 取得團隊錯誤:", error);
      throw new Error(`取得團隊失敗: ${error.message}`);
    }

    // 轉換資料格式，只回傳團隊資料
    const teams = data.map((member) => ({
      ...member.teams,
      role: member.role,
      joined_at: member.joined_at,
    }));

    console.log("[User Sync] 找到", teams.length, "個團隊");
    return teams;
  } catch (error) {
    console.error("[User Sync] 取得團隊錯誤:", error);
    throw error;
  }
};
