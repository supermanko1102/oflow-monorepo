import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const signatureBase64 = btoa(
      String.fromCharCode(...new Uint8Array(signed))
    );
    return signatureBase64 === signature;
  } catch (error) {
    console.error("[LINE Webhook] 簽章驗證錯誤:", error);
    return false;
  }
}

export async function replyLineMessage(
  replyToken: string,
  messages: any[],
  accessToken: string
): Promise<void> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LINE Webhook] 回覆訊息失敗:", errorText);
    throw new Error("Failed to reply LINE message");
  }
}
