# LINE 多輪對話訂單系統 - 實作總結

## 🎯 核心問題解決

### 問題 1：客人多輪對話無法建立訂單
**原始情境：**
```
客人：「我要訂蛋糕」
AI：「請補充取貨日期和時間」
客人：「明天下午 2 點」
❌ AI 無法合併資訊，無法建立訂單
```

**解決方案：對話追蹤系統**
1. 建立 `conversations` 表，追蹤每個客人的對話狀態
2. AI 解析時傳入「對話歷史」（最近 5 條）和「已收集資訊」
3. AI 判斷是否為延續對話，合併新舊資訊
4. 資訊完整時自動建立訂單

---

### 問題 2：APP 只顯示 1 句話，無法查看完整對話
**原始情境：**
```
客人和 AI 來回 10 句話
APP 只顯示最後 1 句 ❌
```

**解決方案：完整對話記錄**
1. `line_messages` 表新增 `conversation_id` 和 `role` 欄位
2. 每條訊息（客人和 AI）都儲存並關聯到對話
3. 訂單 API 查詢時自動取得完整對話記錄
4. APP 以對話氣泡 UI 顯示（客人右側藍色、AI 左側灰色）

---

### 問題 3：訂單完成後，AI 是否應該繼續回覆？

**設計決策：AI 應該繼續回覆（開啟新對話）**

#### 當前邏輯
```typescript
// 訂單完成時
complete_conversation(conversation_id, order_id)
// → 對話狀態變為 'completed'

// 客人再發訊息時
get_or_create_conversation(team_id, line_user_id)
// → 只查找 status = 'collecting_info' 的對話
// → 找不到舊對話，建立新對話 ✅
```

#### 為什麼這樣設計？

**情境分析：**

**情境 A：客人對已完成訂單有疑問**
```
訂單已完成 → 客人：「蛋糕可以改時間嗎？」
AI 判斷：intent = 'inquiry'（詢問）
AI 回覆：「您好！關於訂單修改，請直接與我們聯絡...」
```

**情境 B：客人想訂新的訂單**
```
訂單已完成 → 客人：「我要再訂一個 8 吋的」
AI 判斷：intent = 'order'（新訂單）
AI 回覆：「好的！請問取貨日期和時間？」
```

**情境 C：客人剛完成訂單就想追加**
```
訂單剛完成 → 客人：「等等，我還要加一個」
AI 判斷：intent = 'order'（新訂單）
AI 開始：新的對話流程
```

#### 優點
- ✅ 邏輯簡單清晰
- ✅ 不會誤修改已完成的訂單
- ✅ 支援客人連續下單
- ✅ 詢問和新訂單都能處理

#### 替代方案（不建議）
如果要「訂單完成後不回覆」：
```typescript
// 在 line-webhook/index.ts 加入檢查
const recentCompletedOrder = await checkRecentCompletedOrder(lineUserId);
if (recentCompletedOrder) {
  // 不回覆或提示「訂單已完成」
  return;
}
```

**缺點：**
- ❌ 客人無法詢問問題
- ❌ 無法連續下單
- ❌ 需要定義「多久內算最近」
- ❌ 增加複雜度

---

## 🏗️ 系統架構

### 資料流程圖

```
客人發訊息
    ↓
LINE Webhook
    ↓
1. 儲存訊息 (line_messages, role='customer')
    ↓
2. 取得或建立對話 (get_or_create_conversation)
    ↓
3. 查詢對話歷史 (get_conversation_history, limit=5)
    ↓
4. 呼叫 AI 解析
   ├─ 傳入：訊息、對話歷史、已收集資訊
   ├─ AI 判斷：intent, is_continuation, is_complete
   └─ AI 回傳：合併後的訂單資訊、缺少欄位、建議回覆
    ↓
5. 儲存 AI 回覆 (line_messages, role='ai')
    ↓
6. 根據 is_complete 決定
   ├─ TRUE → 建立訂單 + 標記對話完成
   └─ FALSE → 更新對話資訊 + 詢問缺少欄位
    ↓
回覆客人
```

### 資料庫 Schema

```
conversations (對話追蹤)
├─ id (UUID)
├─ team_id (UUID)
├─ line_user_id (TEXT)
├─ status (TEXT) - collecting_info / completed / abandoned
├─ collected_data (JSONB) - AI 已收集的部分資訊
├─ missing_fields (TEXT[]) - 還需要的欄位
├─ order_id (UUID) - 建單後才有值
└─ last_message_at (TIMESTAMPTZ)

orders (訂單)
├─ ... (原有欄位)
└─ conversation_id (UUID) ← 新增

line_messages (訊息記錄)
├─ ... (原有欄位)
├─ conversation_id (UUID) ← 新增
└─ role (TEXT) ← 新增 (customer / ai)
```

---

## 🤖 AI 解析邏輯

### Prompt 策略

**系統提示詞包含：**
1. 當前日期時間
2. 團隊上下文（商家名稱、類型）
3. **對話歷史**（最近 5 條，格式化顯示）
4. **已收集的訂單資訊**（JSON 格式）
5. 任務說明（合併資訊、判斷完整性）

**範例 Prompt：**
```
你是一個專業的訂單解析助手，專門從多輪對話中累積和提取訂單資訊。

當前日期：2025年10月26日 星期日
團隊資訊：小米烘焙坊（bakery）

**對話歷史（最近的對話）：**
1. 客人: 我要訂蛋糕
2. AI: 好的！請問要訂什麼口味、尺寸，以及取貨日期和時間？
3. 客人: 6 吋巴斯克

**已收集的訂單資訊：**
{
  "items": [
    {"name": "巴斯克蛋糕 6吋", "quantity": 1}
  ]
}

你的任務：
1. 判斷訊息的意圖（order/inquiry/other）
2. 判斷是否為延續之前的對話（is_continuation）
3. 將新訊息與之前的資訊合併
4. 判斷資訊是否完整（is_complete）：必須有商品、日期、時間
5. 列出缺少的欄位（missing_fields）
6. 提供建議的回覆訊息（suggested_reply）
```

### AI 回傳格式

```typescript
{
  intent: 'order',
  confidence: 0.9,
  is_continuation: true,        // 是延續對話
  is_complete: false,            // 資訊還不完整
  order: {
    items: [{name: '巴斯克蛋糕 6吋', quantity: 1}],
    pickup_date: null,
    pickup_time: null
  },
  missing_fields: ['pickup_date', 'pickup_time'],
  suggested_reply: '收到！6 吋巴斯克蛋糕。請問取貨日期和時間？'
}
```

---

## 📱 前端 UI 設計

### 對話氣泡設計

```
┌─────────────────────────────────────┐
│  LINE 對話記錄                      │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐                   │  ← AI 訊息（灰色左側）
│  │ 好的！請問  │                   │
│  │ 取貨時間？  │                   │
│  └─────────────┘                   │
│  09:15                              │
│                                     │
│                   ┌──────────────┐ │  ← 客人訊息（藍色右側）
│                   │ 明天下午2點  │ │
│                   └──────────────┘ │
│                              09:16  │
│                                     │
│  ┌─────────────┐                   │
│  │ ✅ 訂單已確認│                   │
│  │ 訂單編號：... │                   │
│  └─────────────┘                   │
│  09:16                              │
└─────────────────────────────────────┘
```

### 實作細節

```typescript
// 判斷是新格式還是舊格式
const isNewFormat = typeof message === 'object' && 'role' in message;

// 新格式：{ role: 'customer', message: '...', timestamp: '...' }
// 舊格式：'客人的訊息文字'

// 動態判斷顏色和位置
const isCustomer = isNewFormat 
  ? message.role === 'customer'
  : !message.startsWith('AI:');

// 對話氣泡樣式
className={`p-3 rounded-2xl ${
  isCustomer ? 'bg-blue-500' : 'bg-gray-200'
}`}
```

---

## 🔄 完整流程範例

### 多輪對話建單流程

**第 1 輪：**
```
客人：「我要訂蛋糕」
  ↓ Webhook 接收
  ↓ 建立新對話 (conversation-001, status='collecting_info')
  ↓ 對話歷史：[]
  ↓ 已收集資訊：{}
  ↓ AI 解析
  ↓ {
      intent: 'order',
      is_continuation: false,
      is_complete: false,
      order: {items: []},
      missing_fields: ['items', 'pickup_date', 'pickup_time'],
      suggested_reply: '好的！請問要訂什麼口味...'
    }
  ↓ 更新對話資訊 (collected_data={}, missing_fields=[...])
  ↓ 儲存 AI 回覆
AI：「好的！請問要訂什麼口味、尺寸，以及取貨日期和時間？」
```

**第 2 輪：**
```
客人：「6 吋巴斯克」
  ↓ Webhook 接收
  ↓ 取得對話 (conversation-001, status='collecting_info')
  ↓ 對話歷史：[
      {role: 'customer', message: '我要訂蛋糕'},
      {role: 'ai', message: '好的！請問要訂...'}
    ]
  ↓ 已收集資訊：{}
  ↓ AI 解析（傳入對話歷史）
  ↓ {
      intent: 'order',
      is_continuation: true,
      is_complete: false,
      order: {
        items: [{name: '巴斯克蛋糕 6吋', quantity: 1}]
      },
      missing_fields: ['pickup_date', 'pickup_time'],
      suggested_reply: '收到！6 吋巴斯克蛋糕。請問取貨日期和時間？'
    }
  ↓ 更新對話資訊
  ↓ 儲存 AI 回覆
AI：「收到！6 吋巴斯克蛋糕。請問取貨日期和時間？」
```

**第 3 輪：**
```
客人：「明天下午 2 點」
  ↓ Webhook 接收
  ↓ 取得對話 (conversation-001)
  ↓ 對話歷史：[最近 5 條...]
  ↓ 已收集資訊：{items: [...]}
  ↓ AI 解析
  ↓ {
      intent: 'order',
      is_continuation: true,
      is_complete: true, ✅ 完整了！
      order: {
        items: [{name: '巴斯克蛋糕 6吋', quantity: 1}],
        pickup_date: '2025-10-27',
        pickup_time: '14:00'
      },
      missing_fields: [],
      suggested_reply: '✅ 訂單已確認！訂單編號...'
    }
  ↓ 建立訂單 (create_order_from_ai, conversation_id=conversation-001)
  ↓ 標記對話完成 (complete_conversation)
  ↓ 儲存 AI 回覆
AI：「✅ 訂單已確認！訂單編號：ORD-20251026-001...」
```

---

## 🎯 關鍵設計決策

### 1. 為什麼不用草稿訂單？
- ❌ 商家會看到一堆「未完成的訂單」，造成困擾
- ✅ 對話追蹤在背景進行，不影響商家
- ✅ 訂單列表只顯示「確認的訂單」

### 2. 為什麼對話歷史只傳 5 條？
- ⚖️ 平衡 Token 成本和效果
- ✅ 5 條足夠處理大部分訂單情境
- ✅ 可根據需求調整（在 RPC 呼叫中改 `p_limit` 參數）

### 3. 為什麼訂單完成後開啟新對話？
- ✅ 邏輯簡單，不會誤修改已完成訂單
- ✅ 支援連續下單
- ✅ 詢問和新訂單都能處理

### 4. 為什麼要自動清理對話？
- 🗑️ 超過 24 小時無回應的對話標記為 `abandoned`
- 💾 節省資料庫空間
- 🚀 加速查詢效能

---

## 📈 預期效果

### 使用者體驗提升
- ✅ 客人不需要一次提供所有資訊
- ✅ AI 會引導客人補充缺少的欄位
- ✅ 商家可以看到完整對話過程

### 訂單轉換率提升
- ✅ 減少客人「資訊不完整就放棄」的情況
- ✅ AI 主動詢問，提高完成率

### 商家效率提升
- ✅ 不需要手動詢問缺少的資訊
- ✅ 對話記錄完整保存，方便查證

---

## 🚀 後續優化建議

### 1. 智能建議
AI 可以根據歷史訂單，主動建議：
```
客人：「我要訂蛋糕」
AI：「您上次訂了 6 吋巴斯克蛋糕，這次也要訂這個嗎？」
```

### 2. 快速回覆按鈕
LINE 支援 Quick Reply，可以提供選項：
```
AI：「請問取貨時間？」
快速回覆：[明天 10:00] [明天 14:00] [後天 10:00]
```

### 3. 對話分類
追蹤不同類型的對話：
- 完整訂單（1 輪）
- 多輪訂單（2-5 輪）
- 放棄對話（>5 輪未完成）

### 4. 客戶偏好記憶
儲存客戶偏好：
```typescript
customer_preferences: {
  usual_pickup_time: '14:00',
  favorite_items: ['巴斯克蛋糕 6吋']
}
```

---

## ✅ 總結

**核心成就：**
1. ✅ 支援多輪對話建立訂單
2. ✅ 完整對話記錄追蹤
3. ✅ AI 智能資訊收集
4. ✅ 精美對話氣泡 UI
5. ✅ 無草稿訂單干擾

**技術亮點：**
- 對話狀態機（collecting_info → completed）
- AI 上下文合併（對話歷史 + 已收集資訊）
- 向下兼容（舊訂單仍可正常顯示）
- 自動清理機制（abandoned conversations）

**商業價值：**
- 提升訂單轉換率
- 減少商家人工詢問
- 改善客戶體驗
- 完整對話記錄保存

這個系統已經準備好投入生產環境！🎉

