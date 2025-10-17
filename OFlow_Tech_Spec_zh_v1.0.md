# ⚙️ OFlow 技術說明文件（開發者版 v1.0，繁體中文）

> 本文件針對開發人員撰寫，說明 OFlow 智慧營運系統的架構、資料模型、API 設計與運作流程。
> 技術名詞（Next.js、Supabase、Webhook 等）保留英文原貌，說明部分採繁體中文撰寫。

---

## 🧭 一、系統概觀（System Overview）

OFlow 是一個整合 AI 與自動化流程的 SaaS 平台，
可將聊天訊息（如 LINE 私訊）轉化為結構化訂單，並自動處理：

- 接單與顧客意圖辨識（NLP）
- 付款憑證辨識（OCR）
- 排程取貨／出貨提醒
- 每日營收報表與 AI 洞察

**主要模組：**
1. 行銷引擎（Marketing Engine）  
2. 客服引擎（Customer Engine）  
3. **訂單中心（Order Hub） ← 系統核心模組**  
4. 物流模組（Logistics Module）  
5. 報表模組（Analytics Engine）  
6. AI 顧問（Advisor Engine）  

系統採 **多租戶架構（Multi‑tenant）**：
每個品牌（organization）都有獨立資料空間，透過 Row Level Security（RLS）實現資料隔離。

---

## 🧱 二、前端架構（Frontend Architecture）

### 使用技術
- **Next.js 14 + TypeScript**
- **Tailwind CSS + shadcn/ui**：模組化設計與統一 UI 元件
- **React Query / SWR**：狀態快取與非同步資料同步
- **Recharts**：報表視覺化
- **Supabase Realtime**：即時訂單與訊息更新

### 頁面架構
| 模組 | 功能 |
|------|------|
| Dashboard | 即時營收、訂單狀態、提醒 |
| 行銷中心 | 貼文生成、排程、表現分析 |
| 訂單中心 | 訂單列表、付款狀態、日曆檢視 |
| 客服中心 | 多平台訊息整合與 AI 自動回覆 |
| 報表中心 | 每日／週／月營收趨勢 |
| 顧問中心 | AI 洞察與營運建議 |

### 狀態管理
- 使用 React Query 快取所有主要資料（orders、customers、messages）。
- 透過 Supabase Realtime 訂閱資料變化，即時刷新訂單與聊天紀錄。

---

## 🖥️ 三、後端架構（Backend）

### 技術棧
- **NestJS**：API Gateway 與 Webhook Handler
- **Supabase Edge Functions**：輕量級任務（付款比對、OCR 驗證）
- **Scheduler / Cron Jobs**：生成每日報表與提醒
- **n8n / Make（可選）**：自動化流程任務整合

### 範例流程 — LINE 訊息接單
```text
顧客發送訊息：「我要兩顆原味，週五拿」
 ↓
LINE Webhook → Intent Parser (GPT)
 ↓
AI 擷取商品、數量、日期等欄位
 ↓
建立訂單（狀態：pending）
 ↓
回覆顧客確認訂單摘要
```

### 範例流程 — 轉帳圖 AI 驗證
```text
顧客上傳轉帳截圖
 ↓
Webhook → Vision OCR 模組
 ↓
擷取金額、帳號、時間 → 與訂單比對
 ↓
若符合 → 更新為「已付款」
 ↓
推播通知商家可出貨
```

---

## 🗃️ 四、資料庫 Schema（Supabase / PostgreSQL）

> 每個資料表皆包含欄位：`id uuid`、`org_id`、`created_at`、`updated_at`。  
> 所有表皆啟用 RLS，並以 `org_id` 控制資料權限。

### 1️⃣ organizations（品牌與租戶）
```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),      -- 品牌 ID
  name text not null,                                 -- 品牌名稱
  business_type text default 'other',                 -- 類型（甜點、美業...）
  created_at timestamptz default now()
);
```

### 2️⃣ customers（顧客資料）
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),      -- 顧客 ID
  org_id uuid references organizations(id),           -- 所屬品牌
  name text,                                          -- 顧客姓名
  phone text,                                         -- 聯絡電話
  tags text[],                                        -- 標籤（回頭客、VIP 等）
  channel_user_id text,                               -- LINE / IG 帳號識別碼
  last_seen_at timestamptz                            -- 最後互動時間
);
```

### 3️⃣ catalog_items（商品／服務清單）
```sql
create table catalog_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  type text check (type in ('product','service')),    -- 商品或服務
  name text not null,                                 -- 名稱
  price numeric(12,2) not null,                       -- 價格
  options jsonb default '{}',                         -- 選項（口味、溫層...）
  active boolean default true                         -- 是否上架
);
```

### 4️⃣ orders（訂單主表）
```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  customer_id uuid references customers(id),
  type text default 'order',                          -- 訂單或預約
  total numeric(12,2) not null,                       -- 總金額
  status text check (status in ('pending','paid','shipped','completed','cancelled')) default 'pending',
  delivery_method text check (delivery_method in ('pickup','delivery','service')),
  notes text,                                         -- 備註
  created_at timestamptz default now()
);
```

### 5️⃣ order_items（訂單明細）
```sql
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  catalog_item_id uuid references catalog_items(id),
  name text,
  quantity int not null,
  unit_price numeric(12,2) not null,
  options jsonb default '{}'                          -- 額外設定（例如冷藏／常溫）
);
```

### 6️⃣ suborders（分段取貨）
```sql
create table suborders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  schedule_at timestamptz not null,                   -- 取貨或服務時間
  quantity int,
  status text default 'scheduled',                    -- 狀態
  notes text
);
```

### 7️⃣ payments（付款資料）
```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  method text,                                        -- 付款方式（轉帳／現金等）
  amount numeric(12,2) not null,                      -- 付款金額
  status text default 'pending',                      -- 狀態（pending／confirmed）
  proof_url text,                                     -- 上傳圖片連結
  recognized jsonb,                                   -- OCR 結果（含金額與時間）
  confirmed_at timestamptz
);
```

---

## 🔌 五、API 設計（REST）

### Orders
| Method | Endpoint | 功能 |
|---------|-----------|------|
| GET | `/api/orders` | 查詢訂單列表 |
| GET | `/api/orders/:id` | 查詢單筆訂單 |
| POST | `/api/orders` | 建立手動訂單 |
| PATCH | `/api/orders/:id` | 更新訂單狀態 |
| POST | `/api/orders/:id/mark-paid` | 標記已付款 |

### Payments
| Method | Endpoint | 功能 |
|---------|-----------|------|
| POST | `/api/payments/:orderId/proof` | 上傳轉帳截圖 |
| POST | `/api/payments/:id/confirm` | 確認付款 |
| GET | `/api/payments?orderId=xxx` | 查詢指定訂單付款紀錄 |

---

## 🔗 六、整合項目（Integrations）

| 模組 | 用途 |
|------|------|
| LINE Messaging API | 接收與回覆私訊、傳送提醒 |
| Meta Graph API | IG / FB 私訊與貼文回傳 |
| Buffer API | 多平台貼文排程 |
| Yamato / 7‑Eleven API | 出貨單與物流通知 |
| Google Calendar | 美業預約排程整合 |

---

## 🔁 七、系統流程（Workflow）

1️⃣ 顧客透過 LINE 私訊下單  
2️⃣ AI 分析語意 → 建立訂單（狀態：pending）  
3️⃣ 顧客上傳轉帳圖 → AI OCR 判斷 → 若成功 → 狀態改為「paid」  
4️⃣ 系統自動排程取貨提醒  
5️⃣ 每日自動生成營收報表與 AI 建議  

---

## 🔐 八、安全與權限（Security）

- 所有資料表啟用 **RLS**（Row Level Security）  
- JWT 內包含 `org_id` 與角色資訊（owner、admin、staff）  
- 所有檔案上傳採用 **Signed URL**，有效期限 10 分鐘  
- 敏感金流資料加密儲存於 Supabase Storage  

---

## 🚀 九、部署與 CI/CD

| 項目 | 工具 |
|------|------|
| 前端 | Vercel 自動部署 |
| 後端 | Supabase Edge Function / NestJS 部署於 Render 或 Railway |
| CI | ESLint、tsc、Vitest、自動遷移 DB |
| Secrets | Vercel / Supabase secrets 管理 |

---

## 🧪 十、測試與監控

- **單元測試**：Intent Parser、OCR 模組、金額比對  
- **整合測試**：Webhook → DB 狀態驗證  
- **E2E 測試**：模擬 LINE 下單流程（Cypress）  
- **監控**：Sentry + Supabase Logflare + Cron Job 錯誤警報  

---

## 📎 附錄

### DTO 範例
```ts
type CreateOrderDto = {
  customerId: string;
  deliveryMethod: 'pickup' | 'delivery';
  items: { catalogItemId: string; quantity: number; options?: any }[];
  notes?: string;
  suborders?: { scheduleAt: string; quantity?: number }[];
};
```

### AI 顧問回傳格式
```json
{
  "date": "2025-10-17",
  "summary": "週五下午訂單量最高 (+22%)",
  "actions": [
    {"title": "下週五 14:00 發促銷貼文", "type": "marketing.post.schedule"},
    {"title": "提醒 3 筆未取單", "type": "notify.customer.remind"}
  ]
}
```

---
📘 **文件結尾**  
此文件可用於專案初始化、API 設計或開發人員上手參考。
