# 📱 OFlow 智慧訂單中心 — 技術文件 (App + Supabase 版本)

## 💡 產品定位

OFlow 是一款讓商家透過 LINE 對話就能自動生成訂單的 AI 智慧營運 App。
專為甜點、美業、個人品牌打造，讓聊天＝接單。

App 是商家的營運中樞：

* 自動從 LINE 對話中生成訂單
* 自動提醒訂單時程
* 可查看所有客戶、營收摘要與訂單進度

---

## 🏗️ 系統架構

```
顧客 (LINE 聊天)
   ↓
LINE 官方帳號（OFlow Bot）
   ↓
OFlow Server (Webhook)
   ↓
AI Parser Service (OpenAI / LangChain)
   ↓
Supabase (PostgreSQL + Auth + Storage)
   ↓
OFlow App (React Native / Expo)
```

---

## ⚙️ 技術棧 (Tech Stack)

| 分層               | 技術                                  | 用途                              |
| ---------------- | ----------------------------------- | ------------------------------- |
| **行動 App (商家端)** | React Native (Expo)                 | 核心前端框架                          |
|                  | TypeScript                          | 型別安全開發                          |
|                  | Zustand / Redux Toolkit             | 全域狀態管理                          |
|                  | React Navigation                    | 分頁導覽（訂單、客戶、設定）                  |
|                  | Reanimated / Moti                   | 動畫與互動體驗                         |
|                  | Expo Notifications                  | 推播提醒（例如3天內訂單）                   |
| **後端伺服器**        | NestJS + RESTful API                | 提供業務邏輯、Webhook、與 Supabase 溝通    |
|                  | Supabase Edge Functions             | 處理 Webhook 事件與即時訂單通知            |
| **資料庫與驗證**       | Supabase (PostgreSQL + Auth)        | 儲存訂單、商家、訊息、顧客資料                 |
| **AI 模組**        | OpenAI GPT / LangChain              | 對話理解與意圖判斷                       |
| **LINE 串接層**     | LINE Messaging API                  | 接收客人訊息、發送自動回覆                   |
|                  | LINE Login                          | 商家登入授權與資料綁定                     |
| **即時同步**         | Supabase Realtime                   | App 即時更新訂單狀態                    |
| **部署架構**         | Cloud Run + Supabase Edge Functions | 高可用、Serverless 架構               |
| **監控與除錯**        | Sentry / Supabase Logs              | 錯誤與行為追蹤                         |
| **CI/CD**        | EAS (Expo) + GitHub Actions         | 自動打包與部署至 App Store / Play Store |

---

## 🌐 API 設計策略

* 採用 **RESTful API** 為主（與 App、Webhook 溝通）
* 以 **GraphQL Gateway** 為未來擴充預留（方便報表、聚合查詢）

### RESTful API 範例

| Method  | Endpoint                    | 功能            |
| ------- | --------------------------- | ------------- |
| `POST`  | `/api/line/webhook`         | 接收 LINE 訊息事件  |
| `POST`  | `/api/orders`               | 建立訂單（AI 生成）   |
| `GET`   | `/api/orders`               | 查詢商家所有訂單      |
| `PATCH` | `/api/orders/:id`           | 更新訂單狀態        |
| `POST`  | `/api/notifications/remind` | 發送提醒推播        |
| `GET`   | `/api/summary`              | 查詢營收摘要        |
| `GET`   | `/api/settings`             | 查詢商家設定（自動化模式） |
| `PATCH` | `/api/settings`             | 更新商家設定        |

### GraphQL（未來可選擇性啟用）

* 用於複雜查詢（如「依商品分類查詢銷售金額」、「顧客重複訂單率」）
* 搭配 Apollo Server 或 Yoga GraphQL

---

## 🧩 核心模組

### 1️⃣ LINE Webhook Listener

* 使用 Supabase Edge Functions 接收 LINE 事件
* 驗證來源簽章（HMAC SHA256）
* 呼叫 AI Parser 進行訊息理解與訂單生成

### 2️⃣ AI Parser Service

* 使用 GPT + LangChain Pipeline：

  * 解析顧客訊息中的商品、數量、時間等資訊
  * 偵測商家是否回覆「ok」「可以」等關鍵詞
* 輸出結構化訂單 JSON：

```json
{
  "customer": "陳小姐",
  "item": "巴斯克6吋",
  "quantity": 1,
  "date": "2025-10-21",
  "time": "14:00",
  "status": "accepted"
}
```

### 3️⃣ OFlow Core API

* 提供 App 與 AI Service 間的溝通介面
* 以 NestJS Controller 實作 RESTful 架構

### 4️⃣ App 功能模組

| 模組               | 功能             |
| ---------------- | -------------- |
| **首頁 Dashboard** | 顯示今日營收與提醒      |
| **訂單管理**         | 查詢、修改訂單狀態      |
| **顧客名單**         | 顯示顧客與歷史訂單      |
| **提醒中心**         | 自動推播訂單提醒       |
| **設定頁**          | 商家設定自動化模式與登入登出 |

### 5️⃣ 推播與提醒系統

* 使用 Expo Notifications + Supabase Realtime Trigger
* 透過 Edge Function 定時發送每日提醒

---

## 🧰 專案結構

```
/oflow-app
 ┣ src/
 ┃ ┣ components/
 ┃ ┣ screens/
 ┃ ┣ hooks/
 ┃ ┣ store/
 ┃ ┣ services/
 ┃ ┗ utils/
 ┣ app.config.ts
 ┗ package.json

/oflow-server
 ┣ src/
 ┃ ┣ modules/
 ┃ ┣ controllers/
 ┃ ┣ services/
 ┃ ┗ main.ts
 ┣ prisma/schema.prisma
 ┗ package.json
```

---

## 🔐 安全與權限

| 項目     | 技術                         | 功能              |
| ------ | -------------------------- | --------------- |
| 登入驗證   | LINE Login / Supabase Auth | 商家登入與綁定 LINE ID |
| API 授權 | JWT Token                  | App 與 API 授權溝通  |
| 資料權限   | Row Level Security (RLS)   | 限定商家僅能讀寫自身訂單    |
| 傳輸安全   | HTTPS / TLS                | 保護傳輸過程          |

---

## 🧭 資料庫 Schema (概要)

### `users`

| 欄位         | 型別        | 說明         |
| ---------- | --------- | ---------- |
| id         | uuid      | 使用者 ID     |
| line_id    | text      | LINE 綁定 ID |
| name       | text      | 商家名稱       |
| auto_mode  | boolean   | 是否為全自動接單模式 |
| created_at | timestamp | 建立時間       |

### `orders`

| 欄位            | 型別        | 說明                                |
| ------------- | --------- | --------------------------------- |
| id            | uuid      | 訂單 ID                             |
| user_id       | uuid      | 關聯商家                              |
| customer_name | text      | 顧客名稱                              |
| item          | text      | 商品名稱                              |
| quantity      | integer   | 數量                                |
| date          | date      | 預約日期                              |
| time          | time      | 預約時間                              |
| status        | text      | 訂單狀態 (pending/accepted/completed) |
| created_at    | timestamp | 建立時間                              |

### `reminders`

| 欄位          | 型別        | 說明                  |
| ----------- | --------- | ------------------- |
| id          | uuid      | 提醒 ID               |
| order_id    | uuid      | 關聯訂單                |
| remind_type | text      | 7day / 3day / today |
| sent        | boolean   | 是否已發送               |
| created_at  | timestamp | 建立時間                |

---

## 🚀 發布與部署流程

1️⃣ 開發階段 → GitHub Commit
2️⃣ 自動化測試 (Jest / Vitest)
3️⃣ 部署至：

* Server → Cloud Run / Supabase Edge Functions
* App → EAS Build → App Store / Play Store

---

## ✨ 總結

> OFlow 是一個結合 LINE、AI、與 Supabase 的全自動智慧營運 App。
> 讓商家用聊天完成接單，App 自動提醒、紀錄與分析，
> 形成完整的 AI 接單生態系統。
