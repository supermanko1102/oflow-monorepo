// OFlow Product Operations API
// 處理所有商品相關操作（查詢列表、查詢詳情、新增、更新、刪除）

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
  // 改用 auth_user_id 查詢，支援 LINE 和 Apple 用戶
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

// 驗證使用者是否為團隊成員並有商品管理權限
async function verifyTeamMembership(
  supabaseAdmin: any,
  userId: string,
  teamId: string
) {
  const { data: member, error } = await supabaseAdmin
    .from("team_members")
    .select("role, can_manage_orders")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();

  if (error || !member) {
    throw new Error("You are not a member of this team");
  }

  return member;
}

// 將資料庫商品格式轉換為前端格式
function transformProductToClient(product: any) {
  return {
    id: product.id,
    team_id: product.team_id,
    name: product.name,
    price: parseFloat(product.price),
    description: product.description,
    category: product.category,
    unit: product.unit,
    stock: product.stock,
    low_stock_threshold: product.low_stock_threshold,
    is_available: product.is_available,
    metadata: product.metadata || {},
    sort_order: product.sort_order,
    image_url: product.image_url,
    total_sold: product.total_sold,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
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
    console.log("[Product Operations] User:", user.id, user.line_display_name);

    // 解析請求
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ═══════════════════════════════════════════════════════════════════
    // GET 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "GET") {
      // 查詢商品列表
      if (action === "list") {
        const teamId = url.searchParams.get("team_id");
        const category = url.searchParams.get("category");
        const search = url.searchParams.get("search");
        const availableOnly = url.searchParams.get("available_only") === "true";

        if (!teamId) {
          throw new Error("Missing team_id parameter");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, teamId);

        console.log("[Product Operations] 查詢商品列表:", teamId, {
          category,
          search,
          availableOnly,
        });

        // 建立查詢
        let query = supabaseAdmin
          .from("products")
          .select("*")
          .eq("team_id", teamId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        // 分類篩選
        if (category && category !== "all") {
          query = query.eq("category", category);
        }

        // 只顯示上架商品
        if (availableOnly) {
          query = query.eq("is_available", true);
        }

        // 搜尋篩選（商品名稱或描述）
        if (search) {
          query = query.or(
            `name.ilike.%${search}%,description.ilike.%${search}%`
          );
        }

        const { data: products, error } = await query;

        if (error) {
          throw error;
        }

        // 轉換為前端格式
        const transformedProducts = (products || []).map(
          transformProductToClient
        );

        return new Response(
          JSON.stringify({
            success: true,
            products: transformedProducts,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 查詢單一商品詳情
      if (action === "detail") {
        const productId = url.searchParams.get("product_id");

        if (!productId) {
          throw new Error("Missing product_id parameter");
        }

        console.log("[Product Operations] 查詢商品詳情:", productId);

        const { data: product, error } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (error) {
          throw error;
        }

        if (!product) {
          throw new Error("Product not found");
        }

        // 驗證團隊成員身份
        await verifyTeamMembership(supabaseAdmin, user.id, product.team_id);

        // 轉換為前端格式
        const transformedProduct = transformProductToClient(product);

        return new Response(
          JSON.stringify({
            success: true,
            product: transformedProduct,
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

      // 新增商品
      if (action === "create") {
        const {
          team_id,
          name,
          price,
          description,
          category,
          unit,
          stock,
          low_stock_threshold,
          is_available,
          metadata,
          sort_order,
        } = body;

        if (!team_id || !name || price === undefined) {
          throw new Error("Missing required fields: team_id, name, price");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          team_id
        );

        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to manage products");
        }

        console.log("[Product Operations] 新增商品:", name);

        // 插入商品（category 和 unit 使用預設值）
        const { data: product, error } = await supabaseAdmin
          .from("products")
          .insert({
            team_id,
            name,
            price: Number(price),
            description,
            category: category || "未分類", // 預設值
            unit: unit || "個", // 預設值
            stock: stock !== undefined ? Number(stock) : null,
            low_stock_threshold:
              low_stock_threshold !== undefined
                ? Number(low_stock_threshold)
                : null,
            is_available: is_available !== undefined ? is_available : true,
            metadata: metadata || {},
            sort_order: sort_order !== undefined ? Number(sort_order) : 0,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            product: transformProductToClient(product),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Unknown POST action: ${action}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUT 操作
    // ═══════════════════════════════════════════════════════════════════
    if (req.method === "PUT") {
      const body = await req.json();

      // 更新商品
      if (action === "update") {
        const { product_id, ...updates } = body;

        if (!product_id) {
          throw new Error("Missing product_id");
        }

        console.log("[Product Operations] 更新商品:", product_id);

        // 先取得商品資訊以驗證權限
        const { data: product, error: fetchError } = await supabaseAdmin
          .from("products")
          .select("team_id")
          .eq("id", product_id)
          .single();

        if (fetchError || !product) {
          throw new Error("Product not found");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          product.team_id
        );

        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to manage products");
        }

        // 準備更新資料
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.price !== undefined)
          updateData.price = Number(updates.price);
        if (updates.description !== undefined)
          updateData.description = updates.description;
        if (updates.category !== undefined)
          updateData.category = updates.category;
        if (updates.unit !== undefined) updateData.unit = updates.unit;
        if (updates.stock !== undefined)
          updateData.stock =
            updates.stock !== null ? Number(updates.stock) : null;
        if (updates.low_stock_threshold !== undefined)
          updateData.low_stock_threshold =
            updates.low_stock_threshold !== null
              ? Number(updates.low_stock_threshold)
              : null;
        if (updates.is_available !== undefined)
          updateData.is_available = updates.is_available;
        if (updates.metadata !== undefined)
          updateData.metadata = updates.metadata;
        if (updates.sort_order !== undefined)
          updateData.sort_order = Number(updates.sort_order);

        const { data: updatedProduct, error: updateError } = await supabaseAdmin
          .from("products")
          .update(updateData)
          .eq("id", product_id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            product: transformProductToClient(updatedProduct),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 切換上架狀態
      if (action === "toggle-availability") {
        const { product_id, is_available } = body;

        if (!product_id || is_available === undefined) {
          throw new Error("Missing product_id or is_available");
        }

        console.log(
          "[Product Operations] 切換商品上架狀態:",
          product_id,
          is_available
        );

        // 先取得商品資訊以驗證權限
        const { data: product, error: fetchError } = await supabaseAdmin
          .from("products")
          .select("team_id")
          .eq("id", product_id)
          .single();

        if (fetchError || !product) {
          throw new Error("Product not found");
        }

        // 驗證團隊成員身份和權限
        const member = await verifyTeamMembership(
          supabaseAdmin,
          user.id,
          product.team_id
        );

        if (
          !member.can_manage_orders &&
          member.role !== "owner" &&
          member.role !== "admin"
        ) {
          throw new Error("You don't have permission to manage products");
        }

        const { data: updatedProduct, error: updateError } = await supabaseAdmin
          .from("products")
          .update({ is_available })
          .eq("id", product_id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            product: transformProductToClient(updatedProduct),
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
      const productId = url.searchParams.get("product_id");

      if (!productId) {
        throw new Error("Missing product_id parameter");
      }

      console.log("[Product Operations] 刪除商品:", productId);

      // 先取得商品資訊以驗證權限
      const { data: product, error: fetchError } = await supabaseAdmin
        .from("products")
        .select("team_id, name")
        .eq("id", productId)
        .single();

      if (fetchError || !product) {
        throw new Error("Product not found");
      }

      // 驗證團隊成員身份和權限
      const member = await verifyTeamMembership(
        supabaseAdmin,
        user.id,
        product.team_id
      );

      if (
        !member.can_manage_orders &&
        member.role !== "owner" &&
        member.role !== "admin"
      ) {
        throw new Error("You don't have permission to manage products");
      }

      const { error: deleteError } = await supabaseAdmin
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Product "${product.name}" deleted successfully`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Method ${req.method} not allowed`);
  } catch (error) {
    console.error("[Product Operations] 錯誤:", error);

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
