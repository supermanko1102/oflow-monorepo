# OFlow 資料庫架構文件

> **版本**: v1.1  
> **最後更新**: 2025-10-29  
> **架構設計**: Team-Centric  
> **資料表數量**: 11 （新增：products）  
> **Database Functions**: 15+  
> **Triggers**: 8  
> **RLS 政策**: 全表啟用

---

## 📋 目錄

1. [架構總覽](#架構總覽)
2. [核心資料表](#核心資料表)
3. [資料庫函數](#資料庫函數)
4. [觸發器](#觸發器)
5. [RLS 安全策略](#rls-安全策略)
6. [Edge Functions](#edge-functions)
7. [設計亮點](#設計亮點)
8. [常見查詢範例](#常見查詢範例)

---

## 架構總覽

### 🎯 設計理念：Team-Centric Architecture

OFlow 採用 **以團隊為核心** 的架構設計，確保多人協作、資料隔離、訂閱管理的完整性。

```
Team (團隊 = 商家)
├─ 擁有：LINE 官方帳號 (1:1)
├─ 擁有：訂閱狀態（RevenueCat 整合）
├─ 擁有：訂單資料（完全隔離）
├─ 擁有：顧客資料（團隊內唯一）
└─ 包含：多個成員（Users, N:M）

User (用戶 = 登入身份)
├─ LINE Login 個人帳號
├─ 個人資料（名稱、頭像）
├─ 可加入多個團隊（跨團隊協作）
└─ 在不同團隊有不同角色與權限
```

### 🏗️ 核心實體關係

```
┌─────────────────────────────────────────────────────────────────┐
│                         核心架構                                  │
└─────────────────────────────────────────────────────────────────┘

teams (團隊核心)
  ├─ 1:N → orders (訂單)
  ├─ 1:N → products (商品/服務) ⭐ NEW
  ├─ 1:N → customers (顧客)
  ├─ 1:N → line_messages (LINE 對話)
  ├─ 1:N → conversations (對話追蹤)
  ├─ 1:N → reminders (提醒通知)
  ├─ 1:1 → team_settings (進階設定)
  ├─ 1:N → team_members (成員關聯)
  ├─ 1:N → team_invites (邀請碼)
  └─ 1:N → subscription_transactions (訂閱交易)

users (用戶身份)
  └─ N:M ← team_members → teams

orders (訂單)
  ├─ N:1 → customers (顧客)
  ├─ 1:N → reminders (提醒)
  └─ 1:1 → conversations (關聯對話)

conversations (對話追蹤)
  ├─ 1:N → line_messages (訊息記錄)
  └─ 1:1 → orders (建單後關聯)
```

### 🔐 資料隔離與安全模型

- **團隊間完全隔離**：每個團隊的資料互不可見
- **基於 RLS 的權限控制**：所有表格啟用 Row Level Security
- **角色權限系統**：owner > admin > member，細粒度權限控制
- **多租戶安全**：透過 `team_id` 確保資料隔離

### 🌐 多行業支援

| 行業類型 | business_type | 特色欄位                              |
| -------- | ------------- | ------------------------------------- |
| 烘焙業   | `bakery`      | `requires_frozen`, `store_info`       |
| 美容美髮 | `beauty`      | `service_duration`, `service_notes`   |
| 按摩 SPA | `massage`     | `service_duration`, `service_notes`   |
| 美甲美睫 | `nail`        | `service_duration`, `service_notes`   |
| 花店     | `flower`      | `shipping_address`, `delivery_method` |
| 手工藝   | `craft`       | 通用欄位                              |
| 寵物美容 | `pet`         | `service_duration`, `service_notes`   |
| 其他     | `other`       | 彈性擴展                              |

---

## 核心資料表

### 1. `teams` - 團隊（核心主體）⭐

**用途**：團隊是 OFlow 的核心實體，擁有訂閱、LINE 官方帳號、訂單等所有業務資料。

#### 欄位清單

| 欄位名稱                          | 類型          | 約束                  | 說明                                            |
| --------------------------------- | ------------- | --------------------- | ----------------------------------------------- |
| `id`                              | UUID          | PRIMARY KEY           | 團隊唯一識別碼                                  |
| `name`                            | TEXT          | NOT NULL              | 團隊名稱（如：OCake 麵包店）                    |
| `slug`                            | TEXT          | UNIQUE                | URL 友善識別碼（如：ocake）                     |
| `description`                     | TEXT          | -                     | 團隊描述                                        |
| `logo_url`                        | TEXT          | -                     | 團隊 Logo URL                                   |
| **LINE 官方帳號（屬於團隊）**     |
| `line_channel_id`                 | TEXT          | UNIQUE                | LINE Channel ID（純數字）                       |
| `line_channel_secret`             | TEXT          | -                     | LINE Channel Secret                             |
| `line_channel_access_token`       | TEXT          | -                     | LINE Channel Access Token                       |
| `line_channel_name`               | TEXT          | -                     | LINE 官方帳號名稱（如：@ocake）                 |
| `line_bot_user_id`                | TEXT          | INDEXED               | LINE Bot User ID（U 開頭，用於 Webhook）        |
| `line_webhook_verified`           | BOOLEAN       | DEFAULT false         | Webhook 是否已驗證                              |
| `line_connected_at`               | TIMESTAMPTZ   | -                     | LINE 連接時間                                   |
| **訂閱狀態（屬於團隊）**          |
| `subscription_status`             | TEXT          | DEFAULT 'trial'       | 訂閱狀態：trial / active / expired / cancelled  |
| `subscription_plan`               | TEXT          | DEFAULT 'pro'         | 訂閱方案（pro）                                 |
| `trial_started_at`                | TIMESTAMPTZ   | -                     | 試用開始時間                                    |
| `trial_ends_at`                   | TIMESTAMPTZ   | -                     | 試用結束時間                                    |
| `subscription_started_at`         | TIMESTAMPTZ   | -                     | 付費訂閱開始時間                                |
| `subscription_current_period_end` | TIMESTAMPTZ   | -                     | 當前訂閱週期結束時間                            |
| **RevenueCat 整合（團隊層級）**   |
| `revenuecat_customer_id`          | TEXT          | -                     | RevenueCat Customer ID（格式：team\_{team_id}） |
| `subscription_product_id`         | TEXT          | -                     | 訂閱產品 ID（如：oflow_pro_monthly）            |
| `subscription_platform`           | TEXT          | -                     | 訂閱平台：ios / android                         |
| **團隊設定**                      |
| `auto_mode`                       | BOOLEAN       | DEFAULT false         | 是否啟用自動模式                                |
| `ai_enabled`                      | BOOLEAN       | DEFAULT true          | 是否啟用 AI                                     |
| `notification_enabled`            | BOOLEAN       | DEFAULT true          | 是否啟用通知                                    |
| `timezone`                        | TEXT          | DEFAULT 'Asia/Taipei' | 時區                                            |
| `business_type`                   | TEXT          | DEFAULT 'bakery'      | 業務類別（bakery, beauty, massage 等）          |
| **統計資訊（快取）**              |
| `total_orders`                    | INT           | DEFAULT 0             | 總訂單數（快取）                                |
| `total_revenue`                   | DECIMAL(10,2) | DEFAULT 0             | 總營收（快取）                                  |
| `member_count`                    | INT           | DEFAULT 1             | 成員數量（快取）                                |
| **時間戳記**                      |
| `created_at`                      | TIMESTAMPTZ   | DEFAULT NOW()         | 建立時間                                        |
| `updated_at`                      | TIMESTAMPTZ   | DEFAULT NOW()         | 更新時間（自動）                                |
| `deleted_at`                      | TIMESTAMPTZ   | -                     | 軟刪除時間                                      |

#### 索引設計

```sql
CREATE INDEX idx_teams_line_channel_id ON teams(line_channel_id);
CREATE INDEX idx_teams_line_bot_user_id ON teams(line_bot_user_id);
CREATE INDEX idx_teams_subscription_status ON teams(subscription_status);
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at);
CREATE INDEX idx_teams_business_type ON teams(business_type);
```

#### 業務規則

- 一個團隊對應一個 LINE 官方帳號（1:1）
- 新團隊自動啟動 3 天試用期
- 訂閱狀態影響功能可用性（透過 `check_subscription_valid()` 函數檢查）
- 軟刪除機制（`deleted_at IS NULL` 表示有效）

---

### 2. `users` - 用戶（登入身份）

**用途**：只存個人登入資訊，不包含業務資料。用戶透過 LINE Login 登入，可加入多個團隊。

#### 欄位清單

| 欄位名稱             | 類型        | 約束               | 說明                           |
| -------------------- | ----------- | ------------------ | ------------------------------ |
| `id`                 | UUID        | PRIMARY KEY        | 用戶唯一識別碼                 |
| **LINE 登入資訊**    |
| `line_user_id`       | TEXT        | UNIQUE, NOT NULL   | LINE Login User ID（個人帳號） |
| `line_display_name`  | TEXT        | -                  | LINE 顯示名稱                  |
| `line_picture_url`   | TEXT        | -                  | LINE 頭像 URL                  |
| `line_email`         | TEXT        | -                  | LINE 電子郵件                  |
| `auth_user_id`       | UUID        | FK: auth.users(id) | Supabase Auth User ID          |
| **偏好設定**         |
| `preferred_language` | TEXT        | DEFAULT 'zh-TW'    | 偏好語言                       |
| `current_team_id`    | UUID        | FK: teams(id)      | 最後使用的團隊（用於自動選擇） |
| **時間戳記**         |
| `created_at`         | TIMESTAMPTZ | DEFAULT NOW()      | 建立時間                       |
| `updated_at`         | TIMESTAMPTZ | DEFAULT NOW()      | 更新時間（自動）               |
| `last_login_at`      | TIMESTAMPTZ | -                  | 最後登入時間                   |

#### 索引設計

```sql
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_users_current_team_id ON users(current_team_id);
```

#### 業務規則

- LINE Login 為唯一登入方式
- `line_user_id` 與 Supabase Auth 的 `auth.uid()` 對應
- 一個 LINE 帳號 = 一個用戶
- 用戶可以加入多個團隊（透過 `team_members` 表）

---

### 3. `team_members` - 團隊成員關聯（多對多）

**用途**：連接用戶與團隊的多對多關係，定義角色與權限。

#### 欄位清單

| 欄位名稱               | 類型        | 約束                    | 說明                         |
| ---------------------- | ----------- | ----------------------- | ---------------------------- |
| `id`                   | UUID        | PRIMARY KEY             | 成員記錄 ID                  |
| `team_id`              | UUID        | FK: teams(id), NOT NULL | 團隊 ID                      |
| `user_id`              | UUID        | FK: users(id), NOT NULL | 用戶 ID                      |
| **角色與權限**         |
| `role`                 | TEXT        | DEFAULT 'member'        | 角色：owner / admin / member |
| `can_manage_orders`    | BOOLEAN     | DEFAULT true            | 可管理訂單                   |
| `can_manage_customers` | BOOLEAN     | DEFAULT true            | 可管理顧客                   |
| `can_manage_settings`  | BOOLEAN     | DEFAULT false           | 可管理設定                   |
| `can_view_analytics`   | BOOLEAN     | DEFAULT true            | 可檢視分析                   |
| `can_invite_members`   | BOOLEAN     | DEFAULT false           | 可邀請成員                   |
| **加入資訊**           |
| `invited_by`           | UUID        | FK: users(id)           | 邀請人                       |
| `invite_accepted_at`   | TIMESTAMPTZ | -                       | 接受邀請時間                 |
| `joined_at`            | TIMESTAMPTZ | DEFAULT NOW()           | 加入時間                     |
| `created_at`           | TIMESTAMPTZ | DEFAULT NOW()           | 建立時間                     |

#### 索引設計

```sql
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE UNIQUE INDEX idx_team_members_unique ON team_members(team_id, user_id);
```

#### 業務規則

- 同一個團隊不能重複加入（UNIQUE 約束）
- `owner` 擁有所有權限
- `admin` 擁有大部分管理權限
- `member` 基本權限可自訂
- 至少要有一個 `owner`（`leave_team()` 函數會檢查）

---

### 4. `team_invites` - 團隊邀請碼

**用途**：管理團隊邀請碼，支援限次數、限時間的邀請。

#### 欄位清單

| 欄位名稱      | 類型        | 約束                    | 說明                            |
| ------------- | ----------- | ----------------------- | ------------------------------- |
| `id`          | UUID        | PRIMARY KEY             | 邀請記錄 ID                     |
| `team_id`     | UUID        | FK: teams(id), NOT NULL | 團隊 ID                         |
| **邀請資訊**  |
| `invite_code` | TEXT        | UNIQUE, NOT NULL        | 邀請碼（格式：TEAMSLUG-XXXXXX） |
| `invited_by`  | UUID        | FK: users(id)           | 邀請人                          |
| **邀請設定**  |
| `role`        | TEXT        | DEFAULT 'member'        | 被邀請者的角色                  |
| `max_uses`    | INT         | -                       | 最大使用次數（NULL = 無限次）   |
| `uses_count`  | INT         | DEFAULT 0               | 已使用次數                      |
| `expires_at`  | TIMESTAMPTZ | -                       | 過期時間（NULL = 永久有效）     |
| **狀態**      |
| `is_active`   | BOOLEAN     | DEFAULT true            | 是否啟用                        |
| `created_at`  | TIMESTAMPTZ | DEFAULT NOW()           | 建立時間                        |

#### 索引設計

```sql
CREATE INDEX idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);
```

#### 業務規則

- 邀請碼格式由 `generate_invite_code()` 函數生成
- 驗證邀請碼時檢查：`is_active`, `expires_at`, `max_uses`
- 使用後自動增加 `uses_count`

---

### 5. `team_settings` - 團隊進階設定

**用途**：存放團隊的進階設定（基本設定在 `teams` 表）。

#### 欄位清單

| 欄位名稱                  | 類型         | 約束                  | 說明                               |
| ------------------------- | ------------ | --------------------- | ---------------------------------- |
| `id`                      | UUID         | PRIMARY KEY           | 設定記錄 ID                        |
| `team_id`                 | UUID         | FK: teams(id), UNIQUE | 團隊 ID（1:1）                     |
| **營業設定**              |
| `business_hours`          | JSONB        | -                     | 營業時間（JSON 格式）              |
| `holidays`                | DATE[]       | -                     | 公休日陣列                         |
| **訂單設定**              |
| `order_lead_time_days`    | INT          | DEFAULT 3             | 訂單提前天數                       |
| `max_daily_orders`        | INT          | DEFAULT 20            | 每日最大接單數                     |
| **通知設定**              |
| `reminder_days`           | INT[]        | DEFAULT [7,3,1]       | 提醒天數（7 天前、3 天前、1 天前） |
| `notification_time`       | TIME         | DEFAULT '09:00'       | 通知時間                           |
| **AI 設定**               |
| `ai_auto_confirm`         | BOOLEAN      | DEFAULT false         | AI 自動確認訂單                    |
| `ai_confidence_threshold` | DECIMAL(3,2) | DEFAULT 0.8           | AI 信心度門檻                      |
| **其他設定**              |
| `custom_fields`           | JSONB        | -                     | 自訂欄位（彈性擴展）               |
| **時間戳記**              |
| `created_at`              | TIMESTAMPTZ  | DEFAULT NOW()         | 建立時間                           |
| `updated_at`              | TIMESTAMPTZ  | DEFAULT NOW()         | 更新時間（自動）                   |

#### 索引設計

```sql
CREATE INDEX idx_team_settings_team_id ON team_settings(team_id);
```

#### 業務規則

- 新團隊建立時自動建立預設設定（透過 Trigger）
- `business_hours` JSON 格式範例：
  ```json
  {
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    ...
  }
  ```

---

### 6. `customers` - 顧客資料

**用途**：存放團隊的顧客資料，每個團隊獨立管理自己的顧客。

#### 欄位清單

| 欄位名稱             | 類型          | 約束                    | 說明                            |
| -------------------- | ------------- | ----------------------- | ------------------------------- |
| `id`                 | UUID          | PRIMARY KEY             | 顧客 ID                         |
| `team_id`            | UUID          | FK: teams(id), NOT NULL | 所屬團隊 ID ⭐                  |
| **顧客資訊**         |
| `name`               | TEXT          | NOT NULL                | 顧客名稱                        |
| `phone`              | TEXT          | -                       | 電話號碼                        |
| `line_user_id`       | TEXT          | -                       | LINE User ID（顧客的個人 LINE） |
| `email`              | TEXT          | -                       | 電子郵件                        |
| **統計資訊（快取）** |
| `total_orders`       | INT           | DEFAULT 0               | 總訂單數                        |
| `total_spent`        | DECIMAL(10,2) | DEFAULT 0               | 總消費金額                      |
| **備註與標籤**       |
| `notes`              | TEXT          | -                       | 備註                            |
| `tags`               | TEXT[]        | -                       | 標籤陣列（如：['VIP', '常客']） |
| **時間戳記**         |
| `created_at`         | TIMESTAMPTZ   | DEFAULT NOW()           | 建立時間                        |
| `updated_at`         | TIMESTAMPTZ   | DEFAULT NOW()           | 更新時間（自動）                |
| `last_order_at`      | TIMESTAMPTZ   | -                       | 最後訂單時間                    |

#### 索引設計

```sql
CREATE INDEX idx_customers_team_id ON customers(team_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_line_user_id ON customers(line_user_id);
-- 同一團隊內，電話不能重複
CREATE UNIQUE INDEX idx_customers_team_phone ON customers(team_id, phone) WHERE phone IS NOT NULL;
```

#### 業務規則

- 顧客屬於團隊，不是個人
- 同一團隊內，電話號碼唯一
- `line_user_id` 用於識別 LINE 顧客
- 統計欄位由 Trigger 自動更新

---

### 7. `orders` - 訂單（支援多行業）⭐

**用途**：存放團隊的訂單資料，支援商品型（烘焙、花店）與服務型（美容、按摩）業務。

#### 欄位清單

| 欄位名稱                        | 類型          | 約束                    | 說明                                                  |
| ------------------------------- | ------------- | ----------------------- | ----------------------------------------------------- |
| `id`                            | UUID          | PRIMARY KEY             | 訂單 ID                                               |
| `team_id`                       | UUID          | FK: teams(id), NOT NULL | 所屬團隊 ID ⭐                                        |
| `customer_id`                   | UUID          | FK: customers(id)       | 顧客 ID                                               |
| **訂單基本資訊**                |
| `order_number`                  | TEXT          | UNIQUE, NOT NULL        | 訂單編號（格式：ORD-YYYYMMDD-XXX）                    |
| `customer_name`                 | TEXT          | NOT NULL                | 顧客名稱（冗余）                                      |
| `customer_phone`                | TEXT          | -                       | 顧客電話（冗余）                                      |
| **訂單內容**                    |
| `items`                         | JSONB         | NOT NULL                | 商品/服務列表（JSON）                                 |
| `total_amount`                  | DECIMAL(10,2) | NOT NULL                | 總金額                                                |
| **預約/交付資訊（通用化語意）** |
| `pickup_date`                   | DATE          | NOT NULL                | 預約/交付日期                                         |
| `pickup_time`                   | TIME          | NOT NULL                | 預約/交付時間                                         |
| `delivery_method`               | TEXT          | DEFAULT 'pickup'        | 配送/服務方式                                         |
| **商品型專用欄位**              |
| `requires_frozen`               | BOOLEAN       | DEFAULT false           | 是否需要冷凍配送                                      |
| `store_info`                    | TEXT          | -                       | 超商店號/店名                                         |
| `shipping_address`              | TEXT          | -                       | 寄送地址（宅配）                                      |
| **服務型專用欄位**              |
| `service_duration`              | INT           | -                       | 服務時長（分鐘）                                      |
| `service_notes`                 | TEXT          | -                       | 服務備註（如：頭髮長度）                              |
| **訂單狀態**                    |
| `status`                        | TEXT          | DEFAULT 'pending'       | 訂單狀態：pending / confirmed / completed / cancelled |
| `source`                        | TEXT          | DEFAULT 'auto'          | 訂單來源：auto / semi-auto / manual                   |
| **LINE 對話相關**               |
| `line_conversation_id`          | TEXT          | -                       | LINE 對話 ID（已棄用）                                |
| `conversation_id`               | UUID          | FK: conversations(id)   | 對話追蹤 ID（新）                                     |
| `original_message`              | TEXT          | -                       | 原始訊息                                              |
| **備註**                        |
| `notes`                         | TEXT          | -                       | 商家內部備註                                          |
| `customer_notes`                | TEXT          | -                       | 顧客備註                                              |
| **操作記錄**                    |
| `created_by`                    | UUID          | FK: users(id)           | 建立者（用戶 ID）                                     |
| `updated_by`                    | UUID          | FK: users(id)           | 最後修改者（用戶 ID）                                 |
| **時間戳記**                    |
| `created_at`                    | TIMESTAMPTZ   | DEFAULT NOW()           | 建立時間                                              |
| `updated_at`                    | TIMESTAMPTZ   | DEFAULT NOW()           | 更新時間（自動）                                      |
| `confirmed_at`                  | TIMESTAMPTZ   | -                       | 確認時間                                              |
| `completed_at`                  | TIMESTAMPTZ   | -                       | 完成時間                                              |
| **已棄用欄位**                  |
| `pickup_method`                 | TEXT          | DEFAULT 'store'         | ⚠️ 已棄用，請使用 delivery_method                     |
| `delivery_address`              | TEXT          | -                       | ⚠️ 已棄用，請使用 shipping_address                    |

#### 索引設計

```sql
CREATE INDEX idx_orders_team_id ON orders(team_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_date ON orders(pickup_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX idx_orders_delivery_method ON orders(delivery_method);
-- 複合索引（常見查詢優化）
CREATE INDEX idx_orders_team_status_pickup ON orders(team_id, status, pickup_date);
CREATE INDEX idx_orders_team_delivery ON orders(team_id, delivery_method);
```

#### 業務規則

- `items` JSON 格式範例：
  ```json
  [
    {
      "name": "巴斯克蛋糕 6吋",
      "quantity": 1,
      "price": 450,
      "notes": "少糖"
    }
  ]
  ```
- `delivery_method` 值：`pickup`（自取）、`convenience_store`（超商）、`black_cat`（宅配）、`onsite`（到店服務）
- 訂單編號由 `generate_order_number()` 函數生成，團隊層級唯一
- 訂單確認時（`status = 'confirmed'`）自動建立提醒（透過 Trigger）

---

### 8. `conversations` - 對話追蹤（多輪對話）

**用途**：追蹤 LINE 多輪對話，支援漸進式收集訂單資訊。

#### 欄位清單

| 欄位名稱            | 類型        | 約束                      | 說明                                          |
| ------------------- | ----------- | ------------------------- | --------------------------------------------- |
| `id`                | UUID        | PRIMARY KEY               | 對話 ID                                       |
| `team_id`           | UUID        | FK: teams(id), NOT NULL   | 團隊 ID                                       |
| `line_user_id`      | TEXT        | NOT NULL                  | LINE User ID（顧客）                          |
| **對話狀態**        |
| `status`            | TEXT        | DEFAULT 'collecting_info' | 狀態：collecting_info / completed / abandoned |
| **AI 已收集的資訊** |
| `collected_data`    | JSONB       | DEFAULT '{}'              | 已收集的部分訂單資訊                          |
| `missing_fields`    | TEXT[]      | -                         | 還需要補充的欄位                              |
| **關聯訂單**        |
| `order_id`          | UUID        | FK: orders(id)            | 訂單 ID（建單後才有值）                       |
| **時間戳記**        |
| `last_message_at`   | TIMESTAMPTZ | DEFAULT NOW()             | 最後訊息時間                                  |
| `created_at`        | TIMESTAMPTZ | DEFAULT NOW()             | 建立時間                                      |
| `updated_at`        | TIMESTAMPTZ | DEFAULT NOW()             | 更新時間（自動）                              |

#### 索引設計

```sql
CREATE INDEX idx_conversations_team_id ON conversations(team_id);
CREATE INDEX idx_conversations_line_user_id ON conversations(line_user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_order_id ON conversations(order_id);
-- 唯一約束：每個團隊的每個用戶同時只能有一個進行中的對話
CREATE UNIQUE INDEX idx_conversations_active ON conversations(team_id, line_user_id, status);
```

#### 業務規則

- 同一個 LINE 用戶在同一個團隊只能有一個 `collecting_info` 狀態的對話
- 超過 24 小時無回應自動標記為 `abandoned`（透過 `cleanup_abandoned_conversations()` 函數）
- 建單成功後狀態變為 `completed`
- `collected_data` 格式與訂單 JSON 結構相同

---

### 9. `line_messages` - LINE 訊息記錄

**用途**：存放所有 LINE 訊息，包含客人訊息和 AI 回覆。

#### 欄位清單

| 欄位名稱          | 類型         | 約束                    | 說明                                        |
| ----------------- | ------------ | ----------------------- | ------------------------------------------- |
| `id`              | UUID         | PRIMARY KEY             | 訊息 ID                                     |
| `team_id`         | UUID         | FK: teams(id), NOT NULL | 團隊 ID                                     |
| **LINE 訊息資訊** |
| `line_message_id` | TEXT         | UNIQUE, NOT NULL        | LINE Message ID                             |
| `line_user_id`    | TEXT         | NOT NULL                | 發送者 LINE ID                              |
| `message_type`    | TEXT         | NOT NULL                | 訊息類型：text / image / sticker / location |
| `message_text`    | TEXT         | -                       | 訊息文字內容                                |
| `message_data`    | JSONB        | -                       | 其他訊息資料                                |
| `role`            | TEXT         | DEFAULT 'customer'      | 訊息角色：customer（客人）/ ai（AI 助手）   |
| **AI 解析結果**   |
| `ai_parsed`       | BOOLEAN      | DEFAULT false           | 是否已 AI 解析                              |
| `ai_result`       | JSONB        | -                       | AI 解析結果                                 |
| `ai_confidence`   | DECIMAL(3,2) | -                       | AI 信心度（0.00-1.00）                      |
| **關聯**          |
| `order_id`        | UUID         | FK: orders(id)          | 訂單 ID（建單後關聯）                       |
| `conversation_id` | UUID         | FK: conversations(id)   | 對話 ID                                     |
| **時間戳記**      |
| `created_at`      | TIMESTAMPTZ  | DEFAULT NOW()           | 建立時間                                    |

#### 索引設計

```sql
CREATE INDEX idx_line_messages_team_id ON line_messages(team_id);
CREATE INDEX idx_line_messages_line_user_id ON line_messages(line_user_id);
CREATE INDEX idx_line_messages_created_at ON line_messages(created_at DESC);
CREATE INDEX idx_line_messages_ai_parsed ON line_messages(ai_parsed) WHERE ai_parsed = false;
CREATE INDEX idx_line_messages_conversation ON line_messages(conversation_id, created_at DESC);
CREATE INDEX idx_line_messages_role ON line_messages(role);
```

#### 業務規則

- 每條訊息屬於一個對話（`conversation_id`）
- `role = 'customer'`：客人發送的訊息
- `role = 'ai'`：AI 助手回覆的訊息
- AI 解析後設定 `ai_parsed = true`

---

### 10. `reminders` - 提醒通知

**用途**：存放自動提醒通知，如訂單取件提醒。

#### 欄位清單

| 欄位名稱      | 類型        | 約束                     | 說明                                 |
| ------------- | ----------- | ------------------------ | ------------------------------------ |
| `id`          | UUID        | PRIMARY KEY              | 提醒 ID                              |
| `team_id`     | UUID        | FK: teams(id), NOT NULL  | 團隊 ID                              |
| `order_id`    | UUID        | FK: orders(id), NOT NULL | 訂單 ID                              |
| **提醒類型**  |
| `remind_type` | TEXT        | NOT NULL                 | 提醒類型：7day / 3day / 1day / today |
| `remind_time` | TIMESTAMPTZ | NOT NULL                 | 提醒時間                             |
| **發送狀態**  |
| `sent`        | BOOLEAN     | DEFAULT false            | 是否已發送                           |
| `sent_at`     | TIMESTAMPTZ | -                        | 發送時間                             |
| **推播內容**  |
| `title`       | TEXT        | NOT NULL                 | 標題                                 |
| `message`     | TEXT        | NOT NULL                 | 訊息內容                             |
| **時間戳記**  |
| `created_at`  | TIMESTAMPTZ | DEFAULT NOW()            | 建立時間                             |

#### 索引設計

```sql
CREATE INDEX idx_reminders_team_id ON reminders(team_id);
CREATE INDEX idx_reminders_order_id ON reminders(order_id);
CREATE INDEX idx_reminders_sent ON reminders(sent, remind_time) WHERE sent = false;
```

#### 業務規則

- 訂單確認時自動建立提醒（透過 Trigger）
- 提醒時間基於 `team_settings.reminder_days` 設定
- 未發送的提醒由排程系統（Cron Job）處理

---

### 11. `subscription_transactions` - 訂閱交易記錄

**用途**：記錄 RevenueCat 的訂閱交易事件。

#### 欄位清單

| 欄位名稱                    | 類型          | 約束                    | 說明                                     |
| --------------------------- | ------------- | ----------------------- | ---------------------------------------- |
| `id`                        | UUID          | PRIMARY KEY             | 交易記錄 ID                              |
| `team_id`                   | UUID          | FK: teams(id), NOT NULL | 團隊 ID                                  |
| **RevenueCat 資訊**         |
| `revenuecat_transaction_id` | TEXT          | UNIQUE, NOT NULL        | RevenueCat Transaction ID                |
| `revenuecat_event_type`     | TEXT          | NOT NULL                | 事件類型（INITIAL_PURCHASE, RENEWAL 等） |
| **產品資訊**                |
| `product_id`                | TEXT          | NOT NULL                | 產品 ID（如：oflow_pro_monthly）         |
| `platform`                  | TEXT          | NOT NULL                | 平台：ios / android                      |
| **金額**                    |
| `price`                     | DECIMAL(10,2) | NOT NULL                | 價格                                     |
| `currency`                  | TEXT          | DEFAULT 'TWD'           | 幣別                                     |
| **時間**                    |
| `purchased_at`              | TIMESTAMPTZ   | NOT NULL                | 購買時間                                 |
| `expires_at`                | TIMESTAMPTZ   | -                       | 過期時間                                 |
| **原始資料**                |
| `raw_data`                  | JSONB         | -                       | RevenueCat 原始資料                      |
| **時間戳記**                |
| `created_at`                | TIMESTAMPTZ   | DEFAULT NOW()           | 建立時間                                 |

#### 索引設計

```sql
CREATE INDEX idx_subscription_transactions_team_id ON subscription_transactions(team_id);
CREATE INDEX idx_subscription_transactions_event_type ON subscription_transactions(revenuecat_event_type);
CREATE INDEX idx_subscription_transactions_purchased_at ON subscription_transactions(purchased_at DESC);
```

#### 業務規則

- RevenueCat Webhook 自動插入記錄
- 用於追蹤訂閱歷史和除錯

---

### 11. `products` - 商品/服務項目 ⭐ NEW

**用途**：管理團隊的商品或服務項目，支援多行業通用設計，整合 AI 智能推薦功能。

#### 欄位清單

| 欄位名稱              | 類型          | 約束                    | 說明                                            |
| --------------------- | ------------- | ----------------------- | ----------------------------------------------- |
| `id`                  | UUID          | PRIMARY KEY             | 商品唯一識別碼                                  |
| `team_id`             | UUID          | FK: teams(id), NOT NULL | 所屬團隊 ID ⭐                                  |
| **基本資訊**          |
| `name`                | TEXT          | NOT NULL                | 商品/服務名稱（如：巴斯克蛋糕 6 吋、女生剪髮）  |
| `price`               | DECIMAL(10,2) | NOT NULL                | 價格                                            |
| `description`         | TEXT          | -                       | 商品描述                                        |
| **分類與單位**        |
| `category`            | TEXT          | NOT NULL                | 商品分類（行業自訂：蛋糕/麵包、剪髮/染髮等）    |
| `unit`                | TEXT          | NOT NULL, DEFAULT '個'  | 計量單位（個/份/次/小時/盒/條）                 |
| **庫存管理**          |
| `stock`               | INT           | -                       | 庫存數量（NULL = 不追蹤庫存，適用於服務型行業） |
| `low_stock_threshold` | INT           | -                       | 低庫存警告門檻                                  |
| **狀態**              |
| `is_available`        | BOOLEAN       | DEFAULT true            | 是否上架（AI 只會推薦上架商品）⭐               |
| **行業特定資料**      |
| `metadata`            | JSONB         | DEFAULT '{}'            | 行業特定欄位（彈性擴展）⭐                      |
| **排序與顯示**        |
| `sort_order`          | INT           | DEFAULT 0               | 自訂排序順序（數字越小越前面）                  |
| `image_url`           | TEXT          | -                       | 商品圖片 URL（未來擴展）                        |
| **統計**              |
| `total_sold`          | INT           | DEFAULT 0               | 總銷售數量（快取，未來擴展）                    |
| **時間戳記**          |
| `created_at`          | TIMESTAMPTZ   | DEFAULT NOW()           | 建立時間                                        |
| `updated_at`          | TIMESTAMPTZ   | DEFAULT NOW()           | 更新時間（自動）                                |

#### `metadata` JSONB 範例

**烘焙業範例**：

```json
{
  "allergens": ["蛋", "奶"],
  "storage": "refrigerated",
  "shelf_life_days": 3
}
```

**美容業範例**：

```json
{
  "duration_minutes": 90,
  "stylist_level": "senior",
  "suitable_for": ["長髮", "中髮"]
}
```

**按摩業範例**：

```json
{
  "duration_minutes": 60,
  "massage_type": "oil",
  "suitable_for": ["全身", "局部"]
}
```

#### 索引設計

```sql
-- 基礎索引
CREATE INDEX idx_products_team_id ON products(team_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);

-- 複合索引（常見查詢優化）
CREATE INDEX idx_products_team_available ON products(team_id, is_available);
CREATE INDEX idx_products_team_category ON products(team_id, category);
CREATE INDEX idx_products_team_sort ON products(team_id, sort_order);

-- 部分索引（只索引上架商品，用於 AI 查詢）⭐
CREATE INDEX idx_products_team_available_only ON products(team_id, category, name)
  WHERE is_available = true;
```

#### 業務規則

- **團隊隔離**：商品屬於團隊，RLS 基於 `team_id` 控制存取權限
- **權限控制**：只有 `can_manage_orders` 的成員可以管理商品
- **AI 整合**：AI 只會讀取 `is_available = true` 的商品進行推薦 ⭐
- **通用設計**：支援烘焙、美容、按摩等 8+ 行業，透過 `metadata` JSONB 彈性擴展
- **庫存可選**：服務型行業可不使用庫存功能（`stock = NULL`）

#### 與 AI 整合流程 ⭐

1. **客人詢問商品**：「你們有什麼蛋糕？」
2. **AI 查詢商品**：從 `products` 表查詢該團隊的上架商品
3. **智能推薦**：「我們有巴斯克蛋糕 $450、檸檬塔 $120...」
4. **自動填價**：客人下單時，AI 自動匹配商品並填入價格

#### JSON 範例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "team_id": "7f8e9d0c-1234-5678-90ab-cdef12345678",
  "name": "巴斯克蛋糕 6吋",
  "price": 450.0,
  "description": "經典巴斯克蛋糕，濃郁香醇",
  "category": "蛋糕",
  "unit": "個",
  "stock": 5,
  "low_stock_threshold": 2,
  "is_available": true,
  "metadata": {
    "allergens": ["蛋", "奶"],
    "storage": "refrigerated",
    "shelf_life_days": 3
  },
  "sort_order": 1,
  "total_sold": 125,
  "created_at": "2025-10-29T10:00:00Z",
  "updated_at": "2025-10-29T10:00:00Z"
}
```

---

## 資料庫函數

### 訂單相關函數

#### 1. `generate_order_number(p_team_id UUID)`

**用途**：生成團隊層級的訂單編號。

**參數**：

- `p_team_id`：團隊 ID

**返回值**：`TEXT`（格式：`ORD-YYYYMMDD-XXX`）

**邏輯**：

1. 計算該團隊今天的訂單數
2. 生成編號：`ORD-{今天日期}-{流水號}`
3. 流水號補零至 3 位（001, 002...）

**使用場景**：

- 建立訂單時自動生成編號
- 確保團隊內訂單編號唯一

---

#### 2. `create_order(...)`

**用途**：建立訂單（手動/半自動模式）。

**參數**：

- `p_team_id`：團隊 ID
- `p_created_by`：建立者用戶 ID
- `p_customer_name`：顧客名稱
- `p_customer_phone`：顧客電話
- `p_items`：商品列表（JSONB）
- `p_total_amount`：總金額
- `p_pickup_date`：取件日期
- `p_pickup_time`：取件時間
- `p_source`：訂單來源（auto / semi-auto / manual）
- `p_notes`：備註（可選）

**返回值**：`UUID`（訂單 ID）

**邏輯**：

1. 生成訂單編號
2. 查找或建立顧客（基於電話）
3. 插入訂單記錄
4. 更新顧客統計（total_orders, total_spent）
5. 更新團隊統計（total_orders, total_revenue）

---

#### 3. `create_order_from_ai(...)`

**用途**：從 AI 解析結果建立訂單（全自動模式）。

**參數**：

- `p_team_id`：團隊 ID
- `p_customer_name`：顧客名稱
- `p_customer_phone`：顧客電話
- `p_items`：商品列表（JSONB）
- `p_total_amount`：總金額
- `p_pickup_date`：取件日期
- `p_pickup_time`：取件時間
- `p_line_message_id`：LINE 訊息 ID
- `p_original_message`：原始訊息文字
- `p_customer_notes`：顧客備註（可選）
- `p_conversation_id`：對話 ID（可選）

**返回值**：`UUID`（訂單 ID）

**邏輯**：

1. 生成訂單編號
2. 從 LINE 訊息取得顧客的 LINE ID
3. 查找或建立顧客（優先電話，其次 LINE ID）
4. 更新現有顧客資訊
5. 插入訂單記錄（`source = 'auto'`, `status = 'pending'`）
6. 關聯 LINE 訊息與訂單
7. 更新顧客統計
8. 更新團隊統計
9. 自動建立提醒（7 天、3 天、1 天前、當天）

---

#### 4. `get_daily_summary(p_team_id UUID, p_date DATE)`

**用途**：取得團隊指定日期的訂單摘要統計。

**參數**：

- `p_team_id`：團隊 ID
- `p_date`：查詢日期

**返回值**：`JSONB`

**返回格式**：

```json
{
  "total_orders": 10,
  "total_amount": 5000.0,
  "pending_orders": 3,
  "confirmed_orders": 5,
  "completed_orders": 2
}
```

---

### 對話相關函數

#### 5. `get_or_create_conversation(p_team_id UUID, p_line_user_id TEXT)`

**用途**：取得或建立對話記錄（同一用戶只保持一個進行中的對話）。

**參數**：

- `p_team_id`：團隊 ID
- `p_line_user_id`：LINE User ID

**返回值**：`TABLE`（對話記錄）

**邏輯**：

1. 查找進行中的對話（`status = 'collecting_info'`）
2. 如果找到，更新 `last_message_at`
3. 如果沒有，建立新對話
4. 回傳對話記錄

---

#### 6. `get_conversation_history(p_conversation_id UUID, p_limit INT)`

**用途**：取得對話的最近 N 條訊息。

**參數**：

- `p_conversation_id`：對話 ID
- `p_limit`：限制數量（預設 5）

**返回值**：`TABLE(role TEXT, message TEXT, created_at TIMESTAMPTZ)`

---

#### 7. `update_conversation_data(p_conversation_id UUID, p_collected_data JSONB, p_missing_fields TEXT[])`

**用途**：更新對話中 AI 已收集的資訊和缺少的欄位。

**參數**：

- `p_conversation_id`：對話 ID
- `p_collected_data`：已收集的資料
- `p_missing_fields`：缺少的欄位列表

---

#### 8. `complete_conversation(p_conversation_id UUID, p_order_id UUID)`

**用途**：標記對話完成並建立雙向關聯（對話 ↔ 訂單）。

**參數**：

- `p_conversation_id`：對話 ID
- `p_order_id`：訂單 ID

**邏輯**：

1. 更新對話狀態為 `completed`
2. 設定對話的 `order_id`
3. 更新訂單的 `conversation_id`

---

#### 9. `get_order_conversation(p_order_id UUID)`

**用途**：取得訂單的完整對話記錄（用於前端顯示）。

**參數**：

- `p_order_id`：訂單 ID

**返回值**：`TABLE(role TEXT, message TEXT, message_timestamp TIMESTAMPTZ)`

---

#### 10. `cleanup_abandoned_conversations()`

**用途**：清理超過 24 小時無回應的對話（標記為 `abandoned`）。

**返回值**：`INTEGER`（清理數量）

**使用場景**：定時任務（Cron Job）每天執行

---

### 訂閱相關函數

#### 11. `check_subscription_valid(p_team_id UUID)`

**用途**：檢查團隊訂閱是否有效（試用期或付費中）。

**參數**：

- `p_team_id`：團隊 ID

**返回值**：`BOOLEAN`

**邏輯**：

1. 試用期內且未過期 → `true`
2. 付費中且未過期 → `true`
3. 其他情況 → `false`

---

#### 12. `update_expired_subscriptions()`

**用途**：自動更新過期的訂閱狀態。

**返回值**：`VOID`

**邏輯**：

1. 標記試用期過期的團隊為 `expired`
2. 標記付費訂閱過期的團隊為 `expired`

**使用場景**：定時任務（Cron Job）每天執行

---

#### 13. `initialize_trial(p_team_id UUID)`

**用途**：初始化新團隊的 3 天免費試用期。

**參數**：

- `p_team_id`：團隊 ID

**邏輯**：

1. 設定 `subscription_status = 'trial'`
2. 設定 `trial_started_at = NOW()`
3. 設定 `trial_ends_at = NOW() + 3 days`

---

### 團隊協作相關函數

#### 14. `create_team_with_owner(...)`

**用途**：建立團隊並自動加入擁有者。

**參數**：

- `p_user_id`：用戶 ID
- `p_team_name`：團隊名稱
- `p_line_channel_id`：LINE Channel ID（可選）
- `p_business_type`：業務類別（預設 'bakery'）

**返回值**：`TABLE(team_id UUID, team_name TEXT, team_slug TEXT, invite_code TEXT)`

**邏輯**：

1. 生成唯一的 `slug`
2. 建立團隊並啟動 3 天試用期
3. 將建立者加入為 `owner`（所有權限）
4. 生成預設邀請碼
5. 回傳團隊資訊

---

#### 15. `get_user_teams(p_user_id UUID)`

**用途**：取得用戶加入的所有團隊及相關資訊。

**參數**：

- `p_user_id`：用戶 ID

**返回值**：`TABLE`（團隊列表）

**返回欄位**：

- `team_id`：團隊 ID
- `team_name`：團隊名稱
- `team_slug`：團隊 Slug
- `role`：用戶在該團隊的角色
- `member_count`：成員數量
- `order_count`：訂單數量
- `subscription_status`：訂閱狀態
- `line_channel_name`：LINE 官方帳號名稱

---

#### 16. `accept_team_invite(p_invite_code TEXT, p_user_id UUID)`

**用途**：驗證邀請碼並加入團隊。

**參數**：

- `p_invite_code`：邀請碼
- `p_user_id`：用戶 ID

**返回值**：`UUID`（團隊 ID）

**邏輯**：

1. 驗證邀請碼（is_active, expires_at, max_uses）
2. 檢查用戶是否已加入該團隊
3. 加入團隊（插入 `team_members`）
4. 增加邀請碼使用次數
5. 更新團隊成員數

---

#### 17. `leave_team(p_team_id UUID, p_user_id UUID)`

**用途**：離開團隊。

**參數**：

- `p_team_id`：團隊 ID
- `p_user_id`：用戶 ID

**返回值**：`BOOLEAN`

**邏輯**：

1. 檢查成員是否存在
2. 如果是 `owner`，檢查是否還有其他 owner
3. 如果是唯一 owner，拒絕離開（拋出異常）
4. 移除成員記錄
5. 更新團隊成員數

---

#### 18. `get_team_members(p_team_id UUID)`

**用途**：取得團隊的所有成員列表。

**參數**：

- `p_team_id`：團隊 ID

**返回值**：`TABLE`（成員列表）

**返回欄位**：

- `member_id`：成員記錄 ID
- `user_id`：用戶 ID
- `user_name`：用戶名稱
- `user_picture_url`：用戶頭像
- `role`：角色
- `joined_at`：加入時間
- 各項權限（can_manage_orders, can_manage_customers 等）

---

#### 19. `get_or_create_invite_code(p_team_id UUID, p_user_id UUID)`

**用途**：取得或建立團隊邀請碼（需要權限）。

**參數**：

- `p_team_id`：團隊 ID
- `p_user_id`：用戶 ID（需要有邀請權限）

**返回值**：`TEXT`（邀請碼）

**邏輯**：

1. 檢查用戶是否有邀請權限
2. 查找現有的活躍邀請碼
3. 如果沒有，建立新的邀請碼
4. 回傳邀請碼

---

#### 20. `generate_invite_code(p_team_slug TEXT)`

**用途**：生成團隊邀請碼。

**參數**：

- `p_team_slug`：團隊 Slug

**返回值**：`TEXT`（格式：`TEAMSLUG-XXXXXX`）

**邏輯**：

1. 生成 6 位隨機字串（MD5 hash）
2. 組合為 `{TEAM_SLUG}-{RANDOM}`（全大寫）

---

#### 21. `check_team_line_configured(p_team_id UUID)`

**用途**：檢查團隊是否已完整設定 LINE 官方帳號。

**參數**：

- `p_team_id`：團隊 ID

**返回值**：`BOOLEAN`

**邏輯**：
檢查 `line_channel_id`, `line_channel_secret`, `line_channel_access_token` 是否都已填寫。

---

## 觸發器

### 自動更新時間戳

#### Trigger Function: `update_updated_at_column()`

**用途**：自動更新 `updated_at` 欄位為當前時間。

**套用表格**：

- `users`
- `teams`
- `orders`
- `customers`
- `team_settings`

**觸發時機**：`BEFORE UPDATE`

---

### 業務邏輯觸發器

#### 1. `trigger_create_reminders`

**套用表格**：`orders`

**觸發時機**：`AFTER INSERT OR UPDATE`

**執行函數**：`create_reminders_on_order_confirm()`

**邏輯**：

1. 檢查訂單狀態是否變更為 `confirmed`
2. 從 `team_settings` 讀取提醒設定
3. 根據 `reminder_days`（預設 [7, 3, 1]）建立提醒
4. 只建立未來日期的提醒
5. 特別處理當天提醒（5 分鐘後）

---

#### 2. `trigger_create_default_team_settings`

**套用表格**：`teams`

**觸發時機**：`AFTER INSERT`

**執行函數**：`create_default_team_settings()`

**邏輯**：

1. 新團隊建立時自動觸發
2. 建立預設的 `team_settings` 記錄
3. 預設值：
   - 營業時間：週一至週六 09:00-18:00，週日休息
   - 訂單提前天數：3 天
   - 每日最大接單數：20 單
   - 提醒天數：[7, 3, 1]
   - 通知時間：09:00
   - AI 信心度門檻：0.8

---

## RLS 安全策略

### 權限模型

OFlow 採用 **多層次權限控制**：

```
層級 1：團隊隔離
  └─ 用戶只能存取已加入的團隊資料
      └─ 透過 team_members 表檢查

層級 2：角色權限
  └─ owner > admin > member
      └─ 不同角色有不同操作權限

層級 3：細粒度權限
  └─ can_manage_orders, can_manage_customers, etc.
      └─ 每個成員可自訂權限
```

### RLS 政策矩陣

| 表格                        | SELECT    | INSERT                  | UPDATE                  | DELETE                  | 權限檢查                                           |
| --------------------------- | --------- | ----------------------- | ----------------------- | ----------------------- | -------------------------------------------------- |
| `users`                     | ✅ 自己   | ✅ 自己                 | ✅ 自己                 | ❌                      | `auth.uid() = line_user_id`                        |
| `teams`                     | ✅ 已加入 | ✅ 任何人               | ✅ Owner                | ❌                      | `team_members.user_id = current_user`              |
| `team_members`              | ✅ 已加入 | ✅ 任何人\*             | ✅ Owner/Admin          | ✅ Owner/Admin          | `team_members.user_id = current_user`              |
| `team_invites`              | ✅ 已加入 | ✅ Owner/Admin          | ✅ Owner/Admin          | ❌                      | `role IN ('owner', 'admin') OR can_invite_members` |
| `team_settings`             | ✅ 已加入 | ✅ System               | ✅ can_manage_settings  | ✅ can_manage_settings  | `can_manage_settings = true`                       |
| `orders`                    | ✅ 已加入 | ✅ can_manage_orders    | ✅ can_manage_orders    | ✅ can_manage_orders    | `can_manage_orders = true`                         |
| `products` ⭐               | ✅ 已加入 | ✅ can_manage_orders    | ✅ can_manage_orders    | ✅ can_manage_orders    | `can_manage_orders = true`                         |
| `customers`                 | ✅ 已加入 | ✅ can_manage_customers | ✅ can_manage_customers | ✅ can_manage_customers | `can_manage_customers = true`                      |
| `line_messages`             | ✅ 已加入 | ✅ System               | ❌                      | ❌                      | 用於查看訊息記錄                                   |
| `conversations`             | ✅ 已加入 | ✅ System               | ✅ System               | ❌                      | 用於查看對話記錄                                   |
| `reminders`                 | ✅ 已加入 | ✅ System               | ✅ System               | ✅ System               | 用於查看提醒                                       |
| `subscription_transactions` | ✅ 已加入 | ✅ System               | ❌                      | ❌                      | 用於查看交易記錄                                   |

**註**：

- ✅ System：使用 `service_role` key，不受 RLS 限制
- \*任何人：用於邀請碼加入團隊流程

### 權限檢查範例

**檢查用戶是否為團隊成員**：

```sql
WHERE team_id IN (
  SELECT team_id FROM team_members
  WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
)
```

**檢查特定權限**：

```sql
WHERE team_id IN (
  SELECT tm.team_id FROM team_members tm
  WHERE tm.user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    AND tm.can_manage_orders = true
)
```

---

## Edge Functions

### 1. `line-webhook`

**路徑**：`/functions/v1/line-webhook`

**用途**：接收 LINE Messaging API Webhook 事件，支援多輪對話建立訂單。

**請求方式**：`POST`

**請求標頭**：

- `x-line-signature`：LINE 簽章（必填）

**流程**：

1. 驗證 LINE 簽章
2. 根據 Bot User ID (`destination`) 查找團隊
3. 取得或建立對話記錄
4. 儲存客人訊息到資料庫
5. 取得對話歷史（最近 5 條）
6. 呼叫 AI 解析服務（傳遞歷史和已收集資訊）
7. 根據 AI 結果處理：
   - **資訊完整**：建立訂單 → 標記對話完成 → 回覆確認訊息
   - **資訊不完整**：更新對話狀態 → 回覆詢問訊息
   - **一般詢問**：回覆客服訊息
8. 儲存 AI 回覆到資料庫

**特色**：

- 支援多輪對話（漸進式收集資訊）
- 自動查找或建立顧客
- 自動建立提醒
- 完整的對話記錄追蹤

---

### 2. `ai-parse-message` ⭐ 已整合商品資料

**路徑**：`/functions/v1/ai-parse-message`

**用途**：使用 AI（OpenAI GPT-4）解析 LINE 訊息，判斷意圖並提取訂單資訊。整合商品資料，支援智能推薦與自動填價。

**請求方式**：`POST`

**請求內容**：

```json
{
  "message": "我要訂 2 個巴斯克蛋糕，明天下午 3 點取貨",
  "team_context": {
    "name": "OCake 麵包店",
    "business_type": "bakery"
  },
  "conversation_history": [
    { "role": "customer", "message": "...", "created_at": "..." }
  ],
  "collected_data": {
    "customer_name": "王小明"
  }
}
```

**回應內容**：

```json
{
  "intent": "order",
  "confidence": 0.95,
  "is_continuation": true,
  "is_complete": false,
  "missing_fields": ["customer_phone"],
  "order": {
    "customer_name": "王小明",
    "customer_phone": null,
    "items": [{ "name": "巴斯克蛋糕", "quantity": 2, "price": 450 }],
    "total_amount": 900,
    "pickup_date": "2025-10-30",
    "pickup_time": "15:00"
  },
  "suggested_reply": "請問您的聯絡電話是？"
}
```

**AI Prompt 重點**：

- 多行業支援（根據 `business_type` 調整解析邏輯）
- 多輪對話上下文理解
- 漸進式資訊補充
- 自動計算金額和日期

---

### 3. `order-operations`

**路徑**：`/functions/v1/order-operations`

**用途**：處理所有訂單相關操作（查詢列表、查詢詳情、更新狀態、更新資料）。

**驗證**：需要 JWT token（透過 Authorization header）

**支援操作**：

#### GET 操作

**1. 查詢訂單列表**

```
GET /order-operations?action=list&team_id={team_id}&status={status}&date_from={date}&date_to={date}&search={keyword}
```

**2. 查詢 Dashboard 摘要**

```
GET /order-operations?action=dashboard-summary&team_id={team_id}
```

返回：今日待處理、今日已完成、未來訂單

**3. 查詢單一訂單詳情**

```
GET /order-operations?action=detail&order_id={order_id}
```

包含完整對話記錄（如果有）

#### POST 操作

**1. 更新訂單狀態**

```json
POST /order-operations?action=update-status
{
  "order_id": "...",
  "status": "completed"
}
```

**2. 更新訂單資料**

```json
POST /order-operations?action=update
{
  "order_id": "...",
  "notes": "...",
  "customer_notes": "..."
}
```

**特色**：

- 自動驗證團隊成員身份
- 檢查權限（`can_manage_orders`）
- 自動轉換欄位格式（database ↔ client）
- 支援對話記錄查詢

---

### 4. `team-operations`

**路徑**：`/functions/v1/team-operations`

**用途**：處理團隊相關操作（建立、加入、查詢成員、管理邀請碼）。

**驗證**：需要 JWT token

**支援操作**：

- 建立團隊
- 查詢用戶的所有團隊
- 查詢團隊成員列表
- 生成/取得邀請碼
- 使用邀請碼加入團隊
- 離開團隊
- 綁定 LINE 官方帳號

---

### 5. `product-operations` ⭐ NEW

**路徑**：`/functions/v1/product-operations`

**用途**：處理商品/服務項目的 CRUD 操作，支援 AI 商品推薦整合。

**驗證**：需要 JWT token

**請求方式**：`GET`, `POST`, `PUT`, `DELETE`

#### 支援操作

**1. 查詢商品列表**

```http
GET /product-operations?action=list&team_id={team_id}&category={category}&search={search}&available_only=true
```

**參數**：

- `team_id` (必填)：團隊 ID
- `category` (選填)：商品分類（如：蛋糕、剪髮）
- `search` (選填)：搜尋關鍵字
- `available_only` (選填)：只顯示上架商品

**回應**：

```json
{
  "success": true,
  "products": [
    {
      "id": "...",
      "name": "巴斯克蛋糕 6吋",
      "price": 450.00,
      "category": "蛋糕",
      "is_available": true,
      ...
    }
  ]
}
```

**2. 查詢商品詳情**

```http
GET /product-operations?action=detail&product_id={product_id}
```

**3. 新增商品**

```http
POST /product-operations?action=create
Content-Type: application/json

{
  "team_id": "...",
  "name": "巴斯克蛋糕 6吋",
  "price": 450.00,
  "category": "蛋糕",
  "unit": "個",
  "description": "經典巴斯克蛋糕",
  "stock": 10,
  "is_available": true,
  "metadata": {
    "allergens": ["蛋", "奶"]
  }
}
```

**4. 更新商品**

```http
PUT /product-operations?action=update
Content-Type: application/json

{
  "product_id": "...",
  "name": "巴斯克蛋糕 8吋",
  "price": 650.00,
  "stock": 5
}
```

**5. 切換上架狀態**

```http
PUT /product-operations?action=toggle-availability
Content-Type: application/json

{
  "product_id": "...",
  "is_available": false
}
```

**6. 刪除商品**

```http
DELETE /product-operations?product_id={product_id}
```

#### 權限控制

- 查看商品：團隊成員
- 管理商品：`can_manage_orders = true` 或 role = owner/admin

#### 與 AI 整合 ⭐

`ai-parse-message` 會自動查詢團隊的上架商品（`is_available = true`）並整合進 AI Prompt，實現：

- 商品詢問智能回答
- 下單時自動匹配商品並填入價格
- 根據商品目錄生成推薦

---

### 6. `auth-line-callback`

**路徑**：`/functions/v1/auth-line-callback`

**用途**：處理 LINE Login OAuth 回調。

**流程**：

1. 接收 LINE 授權碼
2. 向 LINE 取得 Access Token
3. 取得用戶 LINE 個人資料
4. 建立或更新 Supabase Auth 用戶
5. 建立或更新 `users` 表記錄
6. 回傳 JWT token

---

## 設計亮點

### 1. Team-Centric 架構

**為什麼選擇 Team-Centric？**

| 架構            | 優點                                         | 缺點                       | 適用場景           |
| --------------- | -------------------------------------------- | -------------------------- | ------------------ |
| User-Centric    | 簡單直觀                                     | 多人協作困難、訂閱管理複雜 | 個人應用           |
| Team-Centric ✅ | 天然支援多人協作、資料隔離清晰、訂閱管理完整 | 查詢需要 JOIN              | B2B SaaS、協作工具 |

**OFlow 的核心需求**：

- ✅ 一個商家多人使用（老闆、員工）
- ✅ 一個 LINE 官方帳號屬於團隊
- ✅ 訂閱以團隊為單位（不是個人）
- ✅ 顧客資料屬於團隊（不是個人）

**結論**：Team-Centric 是最佳選擇。

---

### 2. 多行業支援設計

**通用化策略**：

| 策略       | 實施方式                    | 範例                                                  |
| ---------- | --------------------------- | ----------------------------------------------------- |
| 語意通用化 | 欄位命名使用中性詞彙        | `pickup_date` → 預約/交付日期                         |
| 條件欄位   | 不同行業使用不同欄位        | `requires_frozen`（烘焙）、`service_duration`（美容） |
| JSONB 彈性 | 使用 JSONB 存放非結構化資料 | `items`, `collected_data`, `custom_fields`            |
| 業務類別   | `business_type` 標記行業    | AI 根據行業調整解析邏輯                               |

**擴展性**：

- 新增行業只需更新 `business_type` 列舉
- 不需要修改表結構
- AI Prompt 根據行業動態調整

---

### 3. 對話追蹤系統

**傳統訂單系統 vs OFlow**：

| 特性     | 傳統系統   | OFlow             |
| -------- | ---------- | ----------------- |
| 訂單來源 | 表單、電話 | LINE 對話（多輪） |
| 資訊收集 | 一次性完整 | 漸進式補充        |
| 對話記錄 | 無         | 完整追蹤          |
| AI 輔助  | 無         | 上下文理解        |

**技術實現**：

- `conversations` 表追蹤對話狀態
- `collected_data` 儲存已收集資訊
- `missing_fields` 標記缺少欄位
- `get_conversation_history()` 提供上下文
- 24 小時無回應自動清理

---

### 4. 效能優化

#### 索引設計

**單欄索引**：關鍵欄位（team_id, status, created_at）

**複合索引**：常見查詢組合

```sql
-- 查詢團隊的特定狀態訂單
CREATE INDEX idx_orders_team_status_pickup
ON orders(team_id, status, pickup_date);

-- 查詢團隊的特定配送方式訂單
CREATE INDEX idx_orders_team_delivery
ON orders(team_id, delivery_method);
```

**部分索引**：減少索引大小

```sql
-- 只索引未發送的提醒
CREATE INDEX idx_reminders_sent
ON reminders(sent, remind_time)
WHERE sent = false;

-- 只索引未解析的訊息
CREATE INDEX idx_line_messages_ai_parsed
ON line_messages(ai_parsed)
WHERE ai_parsed = false;
```

#### 統計欄位快取

**問題**：COUNT(\*) 查詢慢

**解決**：快取統計欄位

- `teams.total_orders`：總訂單數
- `teams.total_revenue`：總營收
- `teams.member_count`：成員數
- `customers.total_orders`：顧客訂單數
- `customers.total_spent`：顧客消費金額

**維護**：Database Function 自動更新

---

### 5. 資料一致性

#### 外鍵約束

- 所有關聯都使用外鍵（FK）
- `ON DELETE CASCADE`：團隊刪除時級聯刪除所有資料
- `ON DELETE SET NULL`：訂單刪除時保留顧客資料

#### 唯一性約束

- `teams.slug`：全局唯一
- `teams.line_channel_id`：全局唯一
- `orders.order_number`：全局唯一
- `customers(team_id, phone)`：團隊內唯一

#### Trigger 自動維護

- `updated_at` 自動更新
- 訂單確認時自動建立提醒
- 新團隊自動建立預設設定
- 統計欄位自動更新（透過 Function）

---

### 6. 安全性設計

#### RLS 全面啟用

- 所有表格都啟用 Row Level Security
- 用戶只能存取已加入的團隊資料
- 團隊間資料完全隔離

#### 角色權限系統

- 三層角色：owner > admin > member
- 細粒度權限：can_manage_orders, can_manage_customers 等
- 至少一個 owner 保護機制

#### 簽章驗證

- LINE Webhook 驗證簽章（HMAC-SHA256）
- 防止偽造請求

#### Service Role 隔離

- Edge Functions 使用 `service_role` key
- Webhook、AI 解析等系統操作不受 RLS 限制
- 前端使用 `anon` key，受 RLS 保護

---

## 常見查詢範例

### 1. 查詢團隊的所有訂單

```sql
SELECT
  o.order_number,
  o.customer_name,
  o.status,
  o.pickup_date,
  o.pickup_time,
  o.total_amount,
  o.created_at
FROM orders o
WHERE o.team_id = '{team_id}'
  AND o.status != 'cancelled'
ORDER BY o.pickup_date ASC, o.pickup_time ASC;
```

### 2. 查詢今日待處理訂單

```sql
SELECT *
FROM orders
WHERE team_id = '{team_id}'
  AND status = 'pending'
  AND pickup_date = CURRENT_DATE
ORDER BY pickup_time ASC;
```

### 3. 查詢用戶的所有團隊

```sql
SELECT * FROM get_user_teams('{user_id}');
```

### 4. 查詢訂單的對話記錄

```sql
SELECT * FROM get_order_conversation('{order_id}');
```

### 5. 查詢團隊統計

```sql
SELECT
  name,
  total_orders,
  total_revenue,
  member_count,
  subscription_status,
  trial_ends_at,
  subscription_current_period_end
FROM teams
WHERE id = '{team_id}';
```

### 6. 查詢顧客歷史訂單

```sql
SELECT
  o.order_number,
  o.pickup_date,
  o.total_amount,
  o.status
FROM orders o
WHERE o.customer_id = '{customer_id}'
ORDER BY o.created_at DESC
LIMIT 10;
```

### 7. 查詢未發送的提醒

```sql
SELECT
  r.id,
  r.team_id,
  r.order_id,
  r.remind_type,
  r.remind_time,
  r.message,
  o.order_number,
  o.customer_name
FROM reminders r
JOIN orders o ON o.id = r.order_id
WHERE r.sent = false
  AND r.remind_time <= NOW()
ORDER BY r.remind_time ASC;
```

### 8. 查詢團隊成員列表

```sql
SELECT * FROM get_team_members('{team_id}');
```

### 9. 查詢訂閱狀態

```sql
SELECT check_subscription_valid('{team_id}') AS is_valid;
```

### 10. 查詢對話歷史

```sql
SELECT * FROM get_conversation_history('{conversation_id}', 10);
```

---

## 資料庫版本與遷移

### Migration 檔案清單

| 檔案                                        | 說明               | 執行順序 |
| ------------------------------------------- | ------------------ | -------- |
| `001_initial_schema.sql`                    | 建立所有表格       | 1        |
| `002_rls_policies.sql`                      | 設定 RLS 政策      | 2        |
| `003_database_functions.sql`                | 建立業務邏輯函數   | 3        |
| `004_triggers.sql`                          | 建立自動化觸發器   | 4        |
| `005_link_auth_users.sql`                   | 連接 Supabase Auth | 5        |
| `006_team_creation_function.sql`            | 團隊建立函數       | 6        |
| `007_order_functions.sql`                   | AI 訂單函數        | 7        |
| `008_add_bot_user_id.sql`                   | 新增 Bot User ID   | 8        |
| `009_conversations_system.sql`              | 對話追蹤系統       | 9        |
| `010_conversations_rls.sql`                 | 對話 RLS 政策      | 10       |
| `011_multi_industry_support.sql`            | 多行業支援         | 11       |
| `012_update_order_function.sql`             | 更新訂單函數       | 12       |
| `013_team_delete_function.sql`              | 團隊刪除函數       | 13       |
| `014_add_line_channel_id_to_user_teams.sql` | 用戶團隊查詢優化   | 14       |
| `015_fix_order_function_conflict.sql`       | 修復函數衝突       | 15       |
| `016_diagnose_function.sql`                 | 診斷函數           | 16       |
| `017_fix_function_permissions.sql`          | 修復函數權限       | 17       |

### 執行遷移

**方式 1：Supabase Dashboard**

1. 前往 SQL Editor
2. 依序執行 migration 檔案（按順序）
3. 確認執行成功

**方式 2：Supabase CLI**

```bash
supabase db push
```

---

## 附錄：設計決策文件

### Q1: 為什麼不使用 Supabase Auth 的 User ID 作為主鍵？

**決策**：使用 `public.users` 表的 UUID 作為 `user_id`，而不是 `auth.users` 的 UUID。

**原因**：

1. **解耦合**：`auth.users` 是 Supabase 內部表，未來可能改變
2. **靈活性**：可以存放額外的用戶資訊（LINE 資料）
3. **LINE Login 整合**：`line_user_id` 作為唯一識別碼
4. **多租戶支援**：`public.users` 可以跨越多個 Auth Provider

**實施**：

- `users.auth_user_id` 外鍵連接 `auth.users(id)`
- `users.line_user_id` 與 `auth.uid()` 對應
- RLS 政策使用 `auth.uid()::text = line_user_id` 檢查

---

### Q2: 為什麼顧客資料屬於團隊而不是全局？

**決策**：`customers` 表包含 `team_id`，顧客屬於團隊。

**原因**：

1. **資料隔離**：不同商家的顧客資料不應互通
2. **隱私保護**：避免跨團隊洩漏顧客資訊
3. **業務邏輯**：同一個人在不同商家是不同的顧客身份
4. **統計準確**：每個團隊獨立計算顧客統計

**取捨**：

- ❌ 無法跨團隊查詢同一個顧客
- ✅ 但這正是我們想要的（資料隔離）

---

### Q3: 為什麼使用 JSONB 而不是關聯表？

**決策**：`orders.items` 使用 JSONB 而不是 `order_items` 關聯表。

**原因**：

1. **彈性**：不同行業的商品結構不同
2. **效能**：減少 JOIN 查詢
3. **簡化**：訂單一旦建立，商品列表不再變動
4. **快照性質**：保留當時的商品資訊（即使商品後來改變）

**取捨**：

- ❌ 無法直接查詢「哪些訂單包含商品 X」
- ✅ 但可以使用 JSONB 查詢：`WHERE items @> '[{"name": "巴斯克蛋糕"}]'`

---

### Q4: 為什麼要有 `conversations` 表？

**決策**：新增 `conversations` 表追蹤對話狀態。

**原因**：

1. **多輪對話**：支援漸進式收集資訊
2. **狀態管理**：區分進行中、已完成、已放棄的對話
3. **AI 上下文**：提供對話歷史給 AI
4. **使用者體驗**：客人不需要一次提供所有資訊

**實施**：

- `line_messages.conversation_id`：訊息屬於對話
- `orders.conversation_id`：訂單關聯對話
- 雙向關聯：`conversations.order_id` ↔ `orders.conversation_id`

---

## 結語

這份資料庫架構文件詳細記錄了 OFlow 的資料模型、業務邏輯、安全策略和設計決策。

**核心特色**：

- ✅ Team-Centric 架構支援多人協作
- ✅ 多行業支援（烘焙、美容、按摩等）
- ✅ 多輪對話訂單系統
- ✅ 完整的 RLS 安全策略
- ✅ 豐富的 Database Functions
- ✅ 自動化 Triggers
- ✅ Edge Functions 整合

**適用場景**：

- 🎯 B2B SaaS 多租戶應用
- 🎯 團隊協作工具
- 🎯 LINE 官方帳號整合
- 🎯 AI 驅動的訂單管理

**未來擴展方向**：

- 📈 更多行業支援
- 📈 更複雜的權限控制
- 📈 數據分析與報表
- 📈 第三方整合（Google Calendar, Notion 等）

---

**文件維護者**: OFlow Team  
**聯絡方式**: [請填寫]  
**最後更新**: 2025-10-29
