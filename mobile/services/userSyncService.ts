import { supabase } from "@/lib/supabase";
import type { LineUserProfile } from "./lineLoginService";

export interface SupabaseUser {
  id: string;
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
 * 將 LINE 使用者資料同步至 Supabase
 * - 若使用者不存在，則新增
 * - 若使用者已存在，則更新資料
 */
export const syncUserWithSupabase = async (
  lineProfile: LineUserProfile
): Promise<SupabaseUser> => {
  try {
    console.log("[User Sync] 開始同步使用者:", lineProfile.userId);

    // 1. 檢查使用者是否已存在
    const { data: existingUser, error: queryError } = await supabase
      .from("users")
      .select("*")
      .eq("line_user_id", lineProfile.userId)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 = 找不到資料，這是正常的
      console.error("[User Sync] 查詢使用者錯誤:", queryError);
      throw new Error(`查詢使用者失敗: ${queryError.message}`);
    }

    if (existingUser) {
      // 2a. 使用者已存在，更新資料
      console.log("[User Sync] 使用者已存在，更新資料...");

      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          line_display_name: lineProfile.displayName,
          line_picture_url: lineProfile.pictureUrl || null,
          line_email: lineProfile.email || null,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("line_user_id", lineProfile.userId)
        .select()
        .single();

      if (updateError) {
        console.error("[User Sync] 更新使用者錯誤:", updateError);
        throw new Error(`更新使用者失敗: ${updateError.message}`);
      }

      console.log("[User Sync] 使用者更新成功:", updatedUser.id);
      return updatedUser;
    } else {
      // 2b. 使用者不存在，新增資料
      console.log("[User Sync] 使用者不存在，建立新使用者...");

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          line_user_id: lineProfile.userId,
          line_display_name: lineProfile.displayName,
          line_picture_url: lineProfile.pictureUrl || null,
          line_email: lineProfile.email || null,
          preferred_language: "zh-TW",
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("[User Sync] 新增使用者錯誤:", insertError);
        throw new Error(`新增使用者失敗: ${insertError.message}`);
      }

      console.log("[User Sync] 使用者建立成功:", newUser.id);
      return newUser;
    }
  } catch (error) {
    console.error("[User Sync] 同步失敗:", error);
    throw error;
  }
};

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

