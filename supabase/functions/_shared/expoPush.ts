// Simple helper to send Expo push notifications from Edge Functions.
// Usage example:
// await sendExpoPushNotifications([
//   { to: expoPushToken, title: "新訂單", body: "客戶下單了", data: { type: "new_order", order_id } }
// ]);

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null | string;
  priority?: "default" | "normal" | "high";
  badge?: number;
  subtitle?: string;
}

type ExpoPushResponse = {
  data?: { status: string; id?: string };
  errors?: Array<{ code: string; message: string }>;
};

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<ExpoPushResponse[]> {
  if (!messages.length) return [];

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Expo Push] HTTP error", response.status, text);
    throw new Error(`Expo Push API error: ${response.status}`);
  }

  return (await response.json()) as ExpoPushResponse[];
}
