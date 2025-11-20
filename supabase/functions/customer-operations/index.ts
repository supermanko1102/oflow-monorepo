// OFlow Customer Operations API
// 處理所有顧客相關操作（查詢列表、查詢詳情、建立、更新、刪除、標籤管理）

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 驗證 JWT token 並取得使用者資訊
async function authenticateUser(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid token");
  }

  // 從 public.users 取得完整使用者資訊
  const { data: publicUser, error: publicUserError } = await supabaseAdmin
    .from("users")
    .select("id, line_user_id, apple_user_id, line_display_name, auth_provider")
    .eq("auth_user_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    throw new Error("User not found in database");
  }

  return publicUser;
}

// 驗證使用者是否為團隊成員
async function verifyTeamMembership(
  supabaseAdmin: any,
  userId: string,
  teamId: string
) {
  const { data: member, error } = await supabaseAdmin
    .from("team_members")
    .select("role, can_manage_customers")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (error || !member) {
    throw new Error("You are not a member of this team");
  }

  return member;
}

// 檢查管理權限
function checkManagePermission(member: any) {
  if (
    !member.can_manage_customers &&
    member.role !== "owner" &&
    member.role !== "admin"
  ) {
    throw new Error("You don't have permission to manage customers");
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 初始化 Supabase Admin Client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 驗證使用者
    const user = await authenticateUser(req, supabaseAdmin);
    console.log("[Customer Operations] User:", user.id, user.line_display_name);

    // 解析請求
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // GET 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      // 查詢顧客列表
      if (action === "list") {
        const teamId = url.searchParams.get("team_id");
        const search = url.searchParams.get("search");
        const tag = url.searchParams.get("tag");
        const sortBy = url.searchParams.get("sort_by") || "updated_at"; // updated_at, total_spent, total_orders
        const sortOrder = url.searchParams.get("sort_order") || "desc";

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Customer Operations] 查詢顧客列表:", teamId, {
          search,
          tag,
          sortBy,
        });

        // 建立查詢
        let query = supabaseAdmin
          .from("customers")
          .select("*")
          .eq("team_id", teamId);

        // 搜尋篩選（姓名或電話）
        if (search) {
          query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        // 標籤篩選
        if (tag) {
          query = query.contains("tags", [tag]);
        }

        // 排序
        query = query.order(sortBy, { ascending: sortOrder === "asc" });

        const { data: customers, error } = await query;

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            customers: customers || [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢單一顧客詳情
      if (action === "detail") {
        const customerId = url.searchParams.get("customer_id");

        if (!customerId) {
          throw new Error("Missing customer_id parameter");
        }

        console.log("[Customer Operations] 查詢顧客詳情:", customerId);

        const { data: customer, error } = await supabaseAdmin
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .single();

        if (error) {
          throw error;
        }

        if (!customer) {
          throw new Error("Customer not found");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, customer.team_id);

        // 查詢該顧客的最近訂單（限制 10 筆）
        const { data: recentOrders, error: ordersError } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(10);

        return new Response(
          JSON.stringify({
            success: true,
            customer,
            recentOrders: recentOrders || [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown GET action: ${action}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "POST") {
      const body = await req.json();

      // 建立顧客
      if (action === "create") {
        const { team_id, name, phone, email, line_user_id, notes, tags } = body;

        if (!team_id || !name) {
          throw new Error("Missing team_id or name");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(supabaseAdmin, user.id, team_id);
        checkManagePermission(member);

        console.log("[Customer Operations] 建立顧客:", team_id, name);

        // 檢查電話是否重複（如果有的話）
        if (phone) {
          const { data: existing } = await supabaseAdmin
            .from("customers")
            .select("id")
            .eq("team_id", team_id)
            .eq("phone", phone)
            .single();
          
          if (existing) {
            throw new Error("Customer with this phone number already exists");
          }
        }

        const { data: newCustomer, error } = await supabaseAdmin
          .from("customers")
          .insert({
            team_id,
            name,
            phone,
            email,
            line_user_id,
            notes,
            tags: tags || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            customer: newCustomer,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 新增標籤
      if (action === "add-tag") {
        const { customer_id, tag } = body;

        if (!customer_id || !tag) {
          throw new Error("Missing customer_id or tag");
        }

        // 先取得顧客資訊
        const { data: customer, error: fetchError } = await supabaseAdmin
          .from("customers")
          .select("team_id, tags")
          .eq("id", customer_id)
          .single();

        if (fetchError || !customer) {
          throw new Error("Customer not found");
        }

        // 驗證權限
        const member = await verifyTeamMembership(supabaseAdmin, user.id, customer.team_id);
        checkManagePermission(member);

        // 檢查標籤是否已存在
        const currentTags = customer.tags || [];
        if (currentTags.includes(tag)) {
          return new Response(
            JSON.stringify({ success: true, message: "Tag already exists" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // 更新標籤
        const newTags = [...currentTags, tag];
        const { error: updateError } = await supabaseAdmin
          .from("customers")
          .update({ tags: newTags, updated_at: new Date().toISOString() })
          .eq("id", customer_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true, tags: newTags }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 移除標籤
      if (action === "remove-tag") {
        const { customer_id, tag } = body;

        if (!customer_id || !tag) {
          throw new Error("Missing customer_id or tag");
        }

        // 先取得顧客資訊
        const { data: customer, error: fetchError } = await supabaseAdmin
          .from("customers")
          .select("team_id, tags")
          .eq("id", customer_id)
          .single();

        if (fetchError || !customer) {
          throw new Error("Customer not found");
        }

        // 驗證權限
        const member = await verifyTeamMembership(supabaseAdmin, user.id, customer.team_id);
        checkManagePermission(member);

        // 更新標籤
        const currentTags = customer.tags || [];
        const newTags = currentTags.filter((t: string) => t !== tag);
        
        const { error: updateError } = await supabaseAdmin
          .from("customers")
          .update({ tags: newTags, updated_at: new Date().toISOString() })
          .eq("id", customer_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true, tags: newTags }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unknown POST action: ${action}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUT 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "PUT") {
      const body = await req.json();

      // 更新顧客資料
      if (action === "update") {
        const { customer_id, ...updates } = body;

        if (!customer_id) {
          throw new Error("Missing customer_id");
        }

        // 先取得顧客資訊
        const { data: customer, error: fetchError } = await supabaseAdmin
          .from("customers")
          .select("team_id")
          .eq("id", customer_id)
          .single();

        if (fetchError || !customer) {
          throw new Error("Customer not found");
        }

        // 驗證權限
        const member = await verifyTeamMembership(supabaseAdmin, user.id, customer.team_id);
        checkManagePermission(member);

        // 準備更新資料
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        // 允許更新的欄位
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.tags !== undefined) updateData.tags = updates.tags;

        const { error: updateError } = await supabaseAdmin
          .from("customers")
          .update(updateData)
          .eq("id", customer_id);

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Customer updated successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown PUT action: ${action}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DELETE 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");

      // 刪除顧客
      if (action === "delete") {
        const customerId = url.searchParams.get("customer_id");

        if (!customerId) {
          throw new Error("Missing customer_id parameter");
        }

        // 先取得顧客資訊
        const { data: customer, error: fetchError } = await supabaseAdmin
          .from("customers")
          .select("team_id")
          .eq("id", customerId)
          .single();

        if (fetchError || !customer) {
          throw new Error("Customer not found");
        }

        // 驗證權限
        const member = await verifyTeamMembership(supabaseAdmin, user.id, customer.team_id);
        checkManagePermission(member);

        const { error: deleteError } = await supabaseAdmin
          .from("customers")
          .delete()
          .eq("id", customerId);

        if (deleteError) {
          throw deleteError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Customer deleted successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown DELETE action: ${action}`);
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    console.error("[Customer Operations] 錯誤:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
