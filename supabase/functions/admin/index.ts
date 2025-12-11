// Admin Backoffice API
// 只允許 admin_users 白名單的 JWT 操作（跨團隊資料）

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupabaseAdmin = ReturnType<typeof createClient>;

async function authenticateUser(req: Request, supabaseAdmin: SupabaseAdmin) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");

  return user;
}

async function assertAdmin(
  supabaseAdmin: SupabaseAdmin,
  authUserId: string
): Promise<void> {
  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("disabled", false)
    .maybeSingle();

  if (error) throw error;
  if (!admin) throw new Error("Forbidden: admin only");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const authUser = await authenticateUser(req, supabaseAdmin);

    // Admin gate
    await assertAdmin(supabaseAdmin, authUser.id);

    if (req.method === "GET") {
      // 全域列出團隊
      if (action === "teams") {
        const { data: teams, error } = await supabaseAdmin
          .from("teams")
          .select(
            "id, name, slug, subscription_status, member_count, total_orders, line_channel_id, line_channel_name, auto_mode, business_type, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            teams: (teams || []).map((t) => ({
              team_id: t.id,
              team_name: t.name,
              team_slug: t.slug,
              subscription_status: t.subscription_status,
              member_count: t.member_count,
              order_count: t.total_orders,
              line_channel_id: t.line_channel_id,
              line_channel_name: t.line_channel_name,
              auto_mode: t.auto_mode,
              business_type: t.business_type,
              created_at: t.created_at,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown GET action: ${action}`);
    }

    if (req.method === "POST") {
      if (action === "verify-line") {
        const body = await req.json();
        const {
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
        } = body || {};

        const channelId = String(line_channel_id ?? "").trim();
        const channelSecret = String(line_channel_secret ?? "").trim();
        const accessToken = String(line_channel_access_token ?? "").trim();

        if (!channelId || !channelSecret || !accessToken) {
          throw new Error("Missing required LINE settings");
        }

        if (!/^\d+$/.test(channelId)) {
          throw new Error("Channel ID 格式不正確，應該是純數字");
        }

        // 先檢查 Channel Secret 是否有效：用 client_credentials 換取 token，失敗代表 Secret/ID 不匹配
        const channelSecretVerifyResp = await fetch(
          "https://api.line.me/v2/oauth/accessToken",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: channelId,
              client_secret: channelSecret,
            }).toString(),
          }
        );
        if (!channelSecretVerifyResp.ok) {
          const errorText = await channelSecretVerifyResp.text().catch(() => "");
          throw new Error(
            `驗證 LINE Channel Secret 失敗: ${channelSecretVerifyResp.status} ${errorText}`
          );
        } else {
          // 避免產生多餘 token，成功後嘗試回收剛產生的 access token（失敗可忽略）
          const issuedToken = await channelSecretVerifyResp
            .json()
            .catch(() => ({}));
          const revokeToken = issuedToken?.access_token;
          if (revokeToken) {
            fetch("https://api.line.me/v2/oauth/accessToken/revoke", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ access_token: revokeToken }).toString(),
            }).catch(() => {});
          }
        }

        // 取得 Bot User ID（用 Access Token 驗證）
        const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!botInfoResponse.ok) {
          const errorText = await botInfoResponse.text();
          throw new Error(
            `驗證 LINE Channel Access Token 失敗: ${botInfoResponse.status} ${errorText}`
          );
        }
        const botInfo = await botInfoResponse.json();
        const lineBotUserId = botInfo.userId;
        if (!lineBotUserId) throw new Error("無法取得 LINE Bot User ID");

        // 設定 webhook 並測試（若測試未通過即視為失敗）
        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;
        const setWebhookResponse = await fetch(
          "https://api.line.me/v2/bot/channel/webhook/endpoint",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ endpoint: webhookUrl }),
          }
        );
        if (!setWebhookResponse.ok) {
          const errorData = await setWebhookResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to set webhook endpoint: ${setWebhookResponse.status}`
          );
        }

        const testWebhookResponse = await fetch(
          "https://api.line.me/v2/bot/channel/webhook/test",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ endpoint: webhookUrl }),
          }
        );

        // 解析 webhook test 回應，遇到 404（team 尚未建立導致 webhook 找不到）時可視為可忽略的警告
        const testWebhookText = await testWebhookResponse.text().catch(() => "");
        let testResult: any = {};
        try {
          testResult = testWebhookText ? JSON.parse(testWebhookText) : {};
        } catch {
          testResult = { raw: testWebhookText };
        }

        const webhookTestSuccess = testResult?.success === true;
        const testReason =
          testResult?.reason ||
          testResult?.message ||
          (typeof testWebhookText === "string" ? testWebhookText : "");
        const is404Related =
          testWebhookResponse.status === 404 ||
          (typeof testReason === "string" && testReason.includes("404"));
        const webhookTestAccepted = webhookTestSuccess || is404Related;

        if (!webhookTestAccepted) {
          const errorText =
            typeof testReason === "string" && testReason.trim().length > 0
              ? testReason
              : `${testWebhookResponse.status} ${testWebhookText}`;
          throw new Error(`LINE Webhook 測試未通過: ${errorText}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            line_bot_user_id: lineBotUserId,
            webhook_url: webhookUrl,
            webhook_test_success: webhookTestAccepted,
            webhook_test_warning: is404Related
              ? "LINE Webhook 測試回應 404，可能是 team 尚未建立；稍後正式訊息仍會觸發"
              : undefined,
            bot_name: botInfo.displayName,
            bot_picture_url: botInfo.pictureUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "create-invite") {
        const body = await req.json();
        const {
          team_id,
          role = "owner",
          max_uses = 1,
          is_system = false,
        } = body || {};
        if (!team_id) throw new Error("Missing team_id");

        // 最多允許 2 個 owner
        if (role === "owner") {
          const { count: ownerCount, error: ownerCountError } =
            await supabaseAdmin
              .from("team_members")
              .select("*", { head: true, count: "exact" })
              .eq("team_id", team_id)
              .eq("role", "owner");
          if (ownerCountError) throw ownerCountError;
          if ((ownerCount ?? 0) >= 2) {
            throw new Error("Owner limit reached (max 2 owners per team)");
          }
          if (max_uses && (ownerCount ?? 0) + max_uses > 2) {
            throw new Error(
              `Owner invites available: ${Math.max(0, 2 - (ownerCount ?? 0))}`
            );
          }
        }

        // 若已有同角色同 is_system 的有效邀請碼且未用完，直接重用
        const { data: existingInvite } = await supabaseAdmin
          .from("team_invites")
          .select(
            "invite_code, max_uses, uses_count, is_active, expires_at, role, is_system, created_at"
          )
          .eq("team_id", team_id)
          .eq("role", role)
          .eq("is_system", is_system)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingInvite) {
          const { invite_code, max_uses: m, uses_count, expires_at } =
            existingInvite as any;
          const notExpired = !expires_at || new Date(expires_at) > new Date();
          const hasQuota = m === null || (uses_count ?? 0) < (m ?? 0);
          if (notExpired && hasQuota) {
            return new Response(
              JSON.stringify({
                success: true,
                invite_code,
                reused: true,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // 產生唯一邀請碼
        let inviteCode: string | null = null;
        for (let i = 0; i < 5; i++) {
          const code = `ADMIN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const { data: exists } = await supabaseAdmin
            .from("team_invites")
            .select("id")
            .eq("invite_code", code)
            .maybeSingle();
          if (!exists) {
            inviteCode = code;
            break;
          }
        }
        if (!inviteCode) {
          throw new Error("Failed to generate invite code");
        }

        const { data, error } = await supabaseAdmin
          .from("team_invites")
          .insert({
            team_id,
            invite_code: inviteCode,
            role,
            max_uses,
            is_active: true,
            is_system,
          })
          .select("invite_code")
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            invite_code: data?.invite_code,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "create-team") {
        const body = await req.json();
        const {
          team_name,
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
          line_channel_name,
          business_type,
          owner_user_id,
          slug,
        } = body || {};
        if (!team_name) throw new Error("Missing team_name");

        // 解析 owner_user_id：若未提供，嘗試用 admin auth_user_id 對應的 users.id
        let resolvedOwnerUserId = owner_user_id;
        if (!resolvedOwnerUserId) {
          const { data: adminUser, error: adminUserError } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();

          if (adminUserError) throw adminUserError;
          if (!adminUser?.id) {
            throw new Error("Admin user not linked to public.users");
          }
          resolvedOwnerUserId = adminUser.id;
        }

        const isLineChannelConflict = (err: unknown) => {
          if (typeof err !== "object" || !err) return false;
          const msg =
            (err as { message?: string }).message ||
            (err as { error?: string }).error ||
            "";
          return (
            msg.includes("line_channel_id") ||
            msg.includes("teams_line_channel_id_key") ||
            msg.includes('duplicate key value violates unique constraint "teams_line_channel_id_key"')
          );
        };

        // 若提供 owner_user_id，走既有 RPC
        if (resolvedOwnerUserId) {
          let teamData;
          let error;
          try {
            const result = await supabaseAdmin.rpc("create_team_with_owner", {
              p_user_id: resolvedOwnerUserId,
              p_team_name: team_name,
              p_line_channel_id: line_channel_id || null,
              p_business_type: business_type || "bakery",
            });
            teamData = result.data;
            error = result.error;
          } catch (err) {
            if (isLineChannelConflict(err)) {
              throw new Error(
                "此 LINE Channel 已被其他團隊使用，請換一組或先解除舊團隊綁定"
              );
            }
            throw err;
          }
          if (error) {
            if (isLineChannelConflict(error)) {
              throw new Error(
                "此 LINE Channel 已被其他團隊使用，請換一組或先解除舊團隊綁定"
              );
            }
            throw error;
          }
          const team = teamData?.[0];

          // 若有提供 LINE 三鍵/名稱，補寫入 teams（RPC 只帶 channel_id）
          if (team?.team_id) {
            const updateFields: Record<string, unknown> = {};
            if (line_channel_id !== undefined) updateFields.line_channel_id = line_channel_id;
            if (line_channel_secret !== undefined)
              updateFields.line_channel_secret = line_channel_secret;
            if (line_channel_access_token !== undefined)
              updateFields.line_channel_access_token = line_channel_access_token;
            if (line_channel_name !== undefined)
              updateFields.line_channel_name = line_channel_name;
            if (Object.keys(updateFields).length > 0) {
              updateFields.updated_at = new Date().toISOString();
              const { error: updateErr } = await supabaseAdmin
                .from("teams")
                .update(updateFields)
                .eq("id", team.team_id);
              if (updateErr) {
                if (isLineChannelConflict(updateErr)) {
                  throw new Error(
                    "此 LINE Channel 已被其他團隊使用，請換一組或先解除舊團隊綁定"
                  );
                }
                throw updateErr;
              }
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              team: team
                ? {
                    id: team.team_id,
                    name: team.team_name,
                    slug: team.team_slug,
                    invite_code: team.invite_code,
                  }
                : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 否則：直接插入 teams（無成員），供後續邀請碼加入
        const generatedSlug =
          slug ||
          `${team_name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 32) || `team-${crypto.randomUUID().slice(0, 6)}`;

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("teams")
          .insert({
            name: team_name,
            slug: generatedSlug,
            line_channel_id: line_channel_id || null,
            line_channel_secret: line_channel_secret || null,
            line_channel_access_token: line_channel_access_token || null,
            line_channel_name: line_channel_name || null,
            business_type: business_type || "bakery",
            line_webhook_verified: false,
          })
          .select("id, name, slug")
          .single();

        if (insertError) {
          if (isLineChannelConflict(insertError)) {
            throw new Error(
              "此 LINE Channel 已被其他團隊使用，請換一組或先解除舊團隊綁定"
            );
          }
          throw insertError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            team: inserted,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "update-line-settings") {
        const body = await req.json();
        const {
          team_id,
          line_channel_id,
          line_channel_secret,
          line_channel_access_token,
          line_channel_name,
        } = body || {};
        if (!team_id) throw new Error("Missing team_id");
        if (
          !line_channel_id ||
          !line_channel_secret ||
          !line_channel_access_token
        ) {
          throw new Error("Missing required LINE settings");
        }

        // 取得 Bot User ID
        let lineBotUserId: string | null = null;
        const botInfoResponse = await fetch("https://api.line.me/v2/bot/info", {
          method: "GET",
          headers: { Authorization: `Bearer ${line_channel_access_token}` },
        });
        if (!botInfoResponse.ok) {
          const errorText = await botInfoResponse.text();
          throw new Error(
            `驗證 LINE Channel Access Token 失敗: ${botInfoResponse.status} ${errorText}`
          );
        }
        const botInfo = await botInfoResponse.json();
        lineBotUserId = botInfo.userId;
        if (!lineBotUserId) throw new Error("無法取得 LINE Bot User ID");

        const { error } = await supabaseAdmin
          .from("teams")
          .update({
            line_channel_id,
            line_channel_secret,
            line_channel_access_token,
            line_channel_name: line_channel_name || null,
            line_bot_user_id: lineBotUserId,
            line_connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", team_id);
        if (error) throw error;

        const webhookUrl = `${SUPABASE_URL}/functions/v1/line-webhook`;
        return new Response(
          JSON.stringify({
            success: true,
            webhook_url: webhookUrl,
            message: "LINE settings updated (admin)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown POST action: ${action}`);
    }

    throw new Error(`Unsupported method: ${req.method}`);
  } catch (error) {
    console.error("[Admin] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
