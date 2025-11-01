// 日期時間處理工具

// 取得當前日期時間作為上下文字串
export function getCurrentDateContext(): string {
  const now = new Date();
  return now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
}

// 構建對話歷史字串
export function buildConversationContext(
  conversationHistory?: Array<{ role: string; message: string }>
): string {
  if (!conversationHistory || conversationHistory.length === 0) {
    return "";
  }

  let context = "\n\n**對話歷史（最近的對話）：**\n";
  // 反轉順序，讓最舊的在前面
  const orderedHistory = [...conversationHistory].reverse();
  orderedHistory.forEach((msg, idx) => {
    const speaker = msg.role === "customer" ? "客人" : "AI";
    context += `${idx + 1}. ${speaker}: ${msg.message}\n`;
  });

  return context;
}

// 構建已收集資訊字串
export function buildCollectedDataContext(collectedData?: any): string {
  if (!collectedData || Object.keys(collectedData).length === 0) {
    return "";
  }

  let context = "\n\n**已收集的訂單資訊：**\n";
  context += JSON.stringify(collectedData, null, 2);

  return context;
}

