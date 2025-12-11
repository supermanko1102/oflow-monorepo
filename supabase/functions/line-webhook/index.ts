// OFlow LINE Webhook Handler (modularized)
// 支援：簽章驗證、訊息儲存、對話維護、AI 解析、建單、回覆

/// <reference types="https://deno.land/x/edge_runtime@v1.35.0/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "./lib/cors.ts";
import { verifyLineSignature, replyLineMessage } from "./lib/line.ts";
import { fetchTeamByDestination } from "./services/team.ts";
import { processMessageEvent } from "./services/processMessage.ts";

// Main handler -------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ message: "Only POST method is allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const bodyText = await req.text();
    const signature = req.headers.get("x-line-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing x-line-signature header" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const webhookBody = JSON.parse(bodyText) as {
      destination: string;
      events: any[];
    };
    const { destination, events } = webhookBody;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const team = await fetchTeamByDestination(supabaseAdmin, destination);
    if (!team) {
      return new Response(JSON.stringify({ success: false, error: "Team not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSignature = await verifyLineSignature(
      bodyText,
      signature,
      team.line_channel_secret
    );
    if (!validSignature) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    for (const event of events) {
      // 只處理文字訊息
      if (event.type !== "message" || event.message?.type !== "text") {
        continue;
      }

      try {
        await processMessageEvent({
          supabaseAdmin,
          team,
          event,
        });
      } catch (eventError) {
        console.error("[LINE Webhook] 事件處理錯誤:", eventError);
        // 若需要回覆客戶錯誤，可在此處理；目前略過
      }
    }

    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LINE Webhook] 錯誤:", error);
    return new Response(
      JSON.stringify({
        message: "Error processed",
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
