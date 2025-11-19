# 📊 OFlow 系統分析報告

> **分析日期**: 2025-11-19  
> **分析範圍**: 前端功能、後端 API、資料庫設計  
> **目的**: 識別系統現況、功能缺失與改進建議

---

## 📋 目錄

1. [系統概覽](#1-系統概覽)
2. [前端功能分析](#2-前端功能分析)
3. [後端 API 分析](#3-後端-api-分析)
4. [資料庫設計分析](#4-資料庫設計分析)
5. [功能缺失與問題](#5-功能缺失與問題)
6. [改進建議](#6-改進建議)

---

## 1. 系統概覽

### 1.1 核心架構

```
顧客 (LINE) → LINE Official Account → Webhook → Supabase Functions
                                                        ↓
                                                   PostgreSQL
                                                        ↓
                                              Mobile App (商家端)
```

### 1.2 技術棧

| 層級       | 技術                             | 狀態      |
| ---------- | -------------------------------- | --------- |
| **前端**   | React Native (Expo) + TypeScript | ✅ 已實作 |
| **後端**   | Supabase Edge Functions (Deno)   | ✅ 已實作 |
| **資料庫** | PostgreSQL (Supabase)            | ✅ 已實作 |
| **AI**     | OpenAI GPT-4                     | ✅ 已實作 |
| **通訊**   | LINE Messaging API + LINE Login  | ✅ 已實作 |

### 1.3 核心設計理念

**Team-Centric Architecture（以團隊為核心）**

- ✅ 一個團隊 = 一個商家實體
- ✅ 一個團隊擁有一個 LINE 官方帳號
- ✅ 一個團隊可有多個成員（支援多人協作）
- ✅ 訂閱以團隊為單位（不是個人）

---

## 2. 前端功能分析

### 2.1 Mobile App 頁面結構

#### 📱 已實作頁面

| 頁面          | 路徑                   | 主要功能                          | 實作狀態   |
| ------------- | ---------------------- | --------------------------------- | ---------- |
| **Overview**  | `(tabs)/overview.tsx`  | Dashboard、營收摘要、操作模式切換 | ✅ UI 完成 |
| **Orders**    | `(tabs)/orders.tsx`    | 訂單列表、狀態篩選、商品管理      | ✅ UI 完成 |
| **Inbox**     | `(tabs)/inbox.tsx`     | AI 例外處理、自動建單記錄         | ✅ UI 完成 |
| **Customers** | `(tabs)/customers.tsx` | 顧客列表、統計分析                | ✅ UI 完成 |
| **Settings**  | `(tabs)/settings.tsx`  | 帳戶設定、團隊管理、整合服務      | ✅ UI 完成 |

### 2.2 前端功能詳細分析

#### 2.2.1 Overview (Dashboard) 頁面

**已實作功能：**

- ✅ 營收指標卡片（今日營收、本月營收、訂單數）
- ✅ 操作模式切換器（全自動/半自動）
- ✅ 最近活動列表
- ✅ 登出功能

**缺失功能：**

- ❌ **無實際資料串接**（目前為 Mock 資料）
- ❌ 無即時資料更新（需要 Realtime subscription）
- ❌ 無營收趨勢圖表
- ❌ 無提醒通知列表

#### 2.2.2 Orders (訂單管理) 頁面

**已實作功能：**

- ✅ 雙模式切換（訂單列表 / 商品管理）
- ✅ 訂單狀態篩選（全部、待確認、製作中、待付款、已完成）
- ✅ 訂單卡片 UI（顯示訂單編號、顧客、時間、金額、狀態）
- ✅ 商品列表 UI（顯示商品、價格、庫存、開關）

**缺失功能：**

- ❌ **無實際資料串接**（目前為 Mock 資料）
- ❌ 無訂單詳情頁面
- ❌ 無訂單編輯功能
- ❌ 無訂單狀態更新功能
- ❌ 無商品新增/編輯/刪除功能
- ❌ 無搜尋功能
- ❌ 無日期範圍篩選

#### 2.2.3 Inbox (訊息中心) 頁面

**已實作功能：**

- ✅ 雙模式切換（例外處理 / 自動記錄）
- ✅ AI 例外卡片 UI（顯示顧客、問題、缺失欄位）
- ✅ 自動建單記錄卡片 UI
- ✅ 統計摘要卡片

**缺失功能：**

- ❌ **無實際資料串接**（目前為 Mock 資料）
- ❌ 無例外處理操作（確認、忽略、手動建單）
- ❌ 無對話歷史查看
- ❌ 無 AI 信心度顯示
- ❌ 無篩選功能

#### 2.2.4 Customers (顧客管理) 頁面

**已實作功能：**

- ✅ 顧客列表 UI（顯示姓名、電話、標籤、訂單數、消費金額）
- ✅ 統計摘要卡片（總顧客數、回購率、平均客單價）
- ✅ 分群切換（全部 / VIP / 新客）

**缺失功能：**

- ❌ **無實際資料串接**（目前為 Mock 資料）
- ❌ 無顧客詳情頁面
- ❌ 無顧客編輯功能
- ❌ 無顧客標籤管理
- ❌ 無搜尋功能
- ❌ 無顧客訂單歷史

#### 2.2.5 Settings (設定) 頁面

**已實作功能：**

- ✅ 分組設定 UI（帳戶與團隊、通知與提醒、整合服務、資料與支援）
- ✅ 設定項目列表
- ✅ Danger Zone（登出、刪除帳號）

**缺失功能：**

- ❌ **無實際功能實作**（所有按鈕都是 placeholder）
- ❌ 無 LINE 官方帳號設定頁面
- ❌ 無團隊成員管理頁面
- ❌ 無通知設定頁面
- ❌ 無資料匯出功能

### 2.3 前端 API 呼叫分析

#### 已定義的 Service 層

| Service              | 檔案                           | 功能                          | 實作狀態      |
| -------------------- | ------------------------------ | ----------------------------- | ------------- |
| **orderService**     | `services/orderService.ts`     | 訂單 CRUD、狀態更新、收款確認 | ✅ 已定義 API |
| **teamService**      | `services/teamService.ts`      | 團隊管理、成員管理、LINE 設定 | ✅ 已定義 API |
| **productService**   | `services/productService.ts`   | 商品 CRUD、可用性切換         | ✅ 已定義 API |
| **dashboardService** | `services/dashboardService.ts` | Dashboard 摘要、營收統計      | ✅ 已定義 API |
| **lineService**      | `services/line.ts`             | LINE Login、Channel 驗證      | ✅ 已定義 API |
| **authService**      | `services/auth.ts`             | 登入、登出                    | ✅ 已定義 API |

#### 前端 API 呼叫清單

**Order Operations:**

- `GET /order-operations?action=list` - 查詢訂單列表
- `GET /order-operations?action=detail` - 查詢訂單詳情
- `POST /order-operations?action=update-status` - 更新訂單狀態
- `POST /order-operations?action=update` - 更新訂單資料
- `POST /order-operations?action=confirm-payment` - 確認收款

**Team Operations:**

- `GET /team-operations?action=list` - 查詢使用者團隊
- `GET /team-operations?action=members` - 查詢團隊成員
- `GET /team-operations?action=invite` - 取得邀請碼
- `POST /team-operations?action=create` - 建立團隊
- `POST /team-operations?action=join` - 加入團隊
- `POST /team-operations?action=leave` - 離開團隊
- `POST /team-operations?action=update-line-settings` - 更新 LINE 設定
- `POST /team-operations?action=test-webhook` - 測試 Webhook
- `POST /team-operations?action=delete` - 刪除團隊
- `POST /team-operations?action=update-auto-mode` - 更新自動模式

**Product Operations:**

- `GET /product-operations?action=list` - 查詢商品列表
- `GET /product-operations?action=detail` - 查詢商品詳情
- `POST /product-operations?action=create` - 建立商品
- `PUT /product-operations?action=update` - 更新商品
- `DELETE /product-operations?action=delete` - 刪除商品
- `PUT /product-operations?action=toggle-availability` - 切換商品可用性

**Dashboard:**

- `GET /dashboard-summary?action=dashboard-summary` - 查詢 Dashboard 摘要
- `GET /dashboard-summary?action=revenue-stats` - 查詢營收統計

> ⚠️ **重要發現**: 前端已定義完整的 Service 層，但**頁面 UI 尚未串接這些 API**，目前都是使用 Mock 資料。

---

## 3. 後端 API 分析

### 3.1 Supabase Functions 結構

| Function                      | 路徑                                   | 功能                                 | 實作狀態    |
| ----------------------------- | -------------------------------------- | ------------------------------------ | ----------- |
| **line-webhook**              | `functions/line-webhook/`              | 接收 LINE Webhook、AI 解析、自動建單 | ✅ 完整實作 |
| **order-operations**          | `functions/order-operations/`          | 訂單 CRUD 操作                       | ✅ 完整實作 |
| **team-operations**           | `functions/team-operations/`           | 團隊管理操作                         | ✅ 完整實作 |
| **product-operations**        | `functions/product-operations/`        | 商品管理操作                         | ✅ 完整實作 |
| **ai-parse-message-goods**    | `functions/ai-parse-message-goods/`    | AI 解析商品型訂單                    | ✅ 完整實作 |
| **ai-parse-message-services** | `functions/ai-parse-message-services/` | AI 解析服務型訂單                    | ✅ 完整實作 |
| **auth-line-callback**        | `functions/auth-line-callback/`        | LINE Login 回調                      | ✅ 完整實作 |
| **auth-apple-callback**       | `functions/auth-apple-callback/`       | Apple Sign In 回調                   | ✅ 完整實作 |
| **delete-account**            | `functions/delete-account/`            | 刪除帳號                             | ✅ 完整實作 |

### 3.2 LINE Webhook 功能分析

**核心功能（已實作）：**

1. **Webhook 驗證**

   - ✅ LINE 簽章驗證（HMAC SHA256）
   - ✅ 根據 Bot User ID 查找對應團隊

2. **多輪對話支援**

   - ✅ 對話建立與管理（`conversations` 表）
   - ✅ 對話歷史查詢（`get_conversation_history` RPC）
   - ✅ 已收集資料累積（`collected_data` JSONB）
   - ✅ 對話狀態管理（`active`, `awaiting_merchant_confirmation`, `completed`）

3. **全自動模式**

   - ✅ AI 自動解析訂單資訊
   - ✅ 資訊完整時自動建單
   - ✅ 自動回覆客人確認訊息
   - ✅ 標記對話完成

4. **半自動模式**

   - ✅ AI 監聽並累積資訊
   - ✅ 資訊完整時標記為「待商家確認」
   - ✅ 商家觸發關鍵字建單（`/訂單確認`, `/建單`, `/order`）
   - ✅ 不自動回覆客人（等待商家在 App 中確認）

5. **多行業支援**

   - ✅ 商品型業務（bakery, flower, craft, other）→ `ai-parse-message-goods`
   - ✅ 服務型業務（beauty, massage, nail, pet）→ `ai-parse-message-services`

6. **訂單建立**
   - ✅ 呼叫 `create_order_from_ai` RPC
   - ✅ 支援多種配送方式（店取、面交、超商、宅配）
   - ✅ 支援服務型訂單欄位（服務時長、服務備註）

**缺失功能：**

- ❌ 無圖片訊息處理（目前只處理文字）
- ❌ 無 Rich Menu 互動
- ❌ 無 Flex Message 回覆
- ❌ 無對話逾時機制
- ❌ 無錯誤重試機制

### 3.3 後端 API 端點分析

#### 3.3.1 Order Operations

**已實作端點：**

- ✅ `GET ?action=list` - 查詢訂單列表（支援篩選：status, date_from, date_to, search）
- ✅ `GET ?action=detail` - 查詢訂單詳情
- ✅ `POST ?action=update-status` - 更新訂單狀態
- ✅ `POST ?action=update` - 更新訂單資料
- ✅ `POST ?action=confirm-payment` - 確認收款

**缺失端點：**

- ❌ `POST ?action=create` - 手動建立訂單（前端需要）
- ❌ `DELETE ?action=delete` - 刪除訂單
- ❌ `POST ?action=cancel` - 取消訂單
- ❌ `GET ?action=statistics` - 訂單統計（按日期、狀態分組）

#### 3.3.2 Team Operations

**已實作端點：**

- ✅ `GET ?action=list` - 查詢使用者團隊
- ✅ `GET ?action=members` - 查詢團隊成員
- ✅ `GET ?action=invite` - 取得邀請碼
- ✅ `POST ?action=create` - 建立團隊
- ✅ `POST ?action=join` - 加入團隊
- ✅ `POST ?action=leave` - 離開團隊
- ✅ `POST ?action=update-line-settings` - 更新 LINE 設定
- ✅ `POST ?action=test-webhook` - 測試 Webhook
- ✅ `POST ?action=delete` - 刪除團隊
- ✅ `POST ?action=update-auto-mode` - 更新自動模式

**缺失端點：**

- ❌ `POST ?action=update-member-role` - 更新成員角色
- ❌ `POST ?action=remove-member` - 移除成員
- ❌ `POST ?action=update-settings` - 更新團隊設定（營業時間、提醒設定等）

#### 3.3.3 Product Operations

**已實作端點：**

- ✅ `GET ?action=list` - 查詢商品列表（支援篩選：category, search, available_only）
- ✅ `GET ?action=detail` - 查詢商品詳情
- ✅ `POST ?action=create` - 建立商品
- ✅ `PUT ?action=update` - 更新商品
- ✅ `DELETE ?action=delete` - 刪除商品
- ✅ `PUT ?action=toggle-availability` - 切換商品可用性

**缺失端點：**

- ❌ `POST ?action=batch-update` - 批次更新商品（例如批次上下架）

#### 3.3.4 Dashboard

**已實作端點：**

- ✅ `GET ?action=dashboard-summary` - Dashboard 摘要（今日待處理、今日已完成、未來訂單）
- ✅ `GET ?action=revenue-stats` - 營收統計（支援時間範圍：day, week, month, year）

**缺失端點：**

- ❌ `GET ?action=customer-stats` - 顧客統計（總數、新客、回購率）
- ❌ `GET ?action=product-stats` - 商品銷售統計
- ❌ `GET ?action=ai-stats` - AI 解析統計（成功率、信心度分布）

#### 3.3.5 Customers

**缺失整個 Customer Operations Function：**

- ❌ `GET ?action=list` - 查詢顧客列表
- ❌ `GET ?action=detail` - 查詢顧客詳情
- ❌ `POST ?action=create` - 建立顧客
- ❌ `PUT ?action=update` - 更新顧客資料
- ❌ `DELETE ?action=delete` - 刪除顧客
- ❌ `POST ?action=add-tag` - 新增標籤
- ❌ `POST ?action=remove-tag` - 移除標籤

#### 3.3.6 Conversations (Inbox)

**缺失整個 Conversation Operations Function：**

- ❌ `GET ?action=list` - 查詢對話列表（例外處理、自動記錄）
- ❌ `GET ?action=detail` - 查詢對話詳情（含訊息歷史）
- ❌ `POST ?action=confirm` - 確認建單（半自動模式）
- ❌ `POST ?action=ignore` - 忽略對話
- ❌ `POST ?action=manual-create` - 手動建單

#### 3.3.7 Notifications

**缺失整個 Notification Function：**

- ❌ `GET ?action=list` - 查詢提醒列表
- ❌ `POST ?action=create` - 建立提醒
- ❌ `POST ?action=send` - 發送提醒
- ❌ `DELETE ?action=delete` - 刪除提醒

---

## 4. 資料庫設計分析

### 4.1 資料表結構

#### 已實作資料表（10 個核心表）

| 表名                          | 用途             | 關鍵欄位                                                            | 狀態    |
| ----------------------------- | ---------------- | ------------------------------------------------------------------- | ------- |
| **teams**                     | 團隊（商家）     | `id`, `name`, `line_channel_id`, `subscription_status`, `auto_mode` | ✅ 完整 |
| **users**                     | 用戶（登入身份） | `id`, `line_user_id`, `current_team_id`                             | ✅ 完整 |
| **team_members**              | 團隊成員關聯     | `team_id`, `user_id`, `role`, 權限欄位                              | ✅ 完整 |
| **team_invites**              | 團隊邀請碼       | `team_id`, `invite_code`, `expires_at`                              | ✅ 完整 |
| **customers**                 | 顧客資料         | `team_id`, `name`, `phone`, `line_user_id`, `tags`                  | ✅ 完整 |
| **orders**                    | 訂單             | `team_id`, `customer_id`, `items`, `status`, `pickup_date`          | ✅ 完整 |
| **line_messages**             | LINE 對話記錄    | `team_id`, `conversation_id`, `role`, `ai_result`                   | ✅ 完整 |
| **reminders**                 | 提醒通知         | `team_id`, `order_id`, `remind_type`, `sent`                        | ✅ 完整 |
| **team_settings**             | 團隊進階設定     | `team_id`, `business_hours`, `reminder_days`                        | ✅ 完整 |
| **subscription_transactions** | 訂閱交易記錄     | `team_id`, `revenuecat_transaction_id`                              | ✅ 完整 |

#### 新增資料表（Migration 009 之後）

| 表名              | 用途     | 關鍵欄位                                                            | 狀態    |
| ----------------- | -------- | ------------------------------------------------------------------- | ------- |
| **conversations** | 對話管理 | `team_id`, `line_user_id`, `status`, `collected_data`, `turn_count` | ✅ 完整 |
| **products**      | 商品管理 | `team_id`, `name`, `price`, `category`, `is_available`              | ✅ 完整 |

### 4.2 資料表關聯分析

**核心關聯：**

```
teams (1) ←→ (N) team_members ←→ (N) users
  ↓
  ├─ (1) ←→ (N) customers
  ├─ (1) ←→ (N) orders
  ├─ (1) ←→ (N) conversations
  ├─ (1) ←→ (N) line_messages
  ├─ (1) ←→ (N) products
  ├─ (1) ←→ (N) reminders
  └─ (1) ←→ (1) team_settings

conversations (1) ←→ (N) line_messages
conversations (1) ←→ (1) orders (optional)

customers (1) ←→ (N) orders
orders (1) ←→ (N) reminders
```

**關聯完整性：**

- ✅ 所有業務資料都正確關聯到 `teams`
- ✅ 使用 `ON DELETE CASCADE` 確保資料一致性
- ✅ 外鍵約束完整

### 4.3 索引與效能分析

**已建立索引：**

✅ **teams 表**

- `idx_teams_line_channel_id` - LINE Channel ID 查詢
- `idx_teams_subscription_status` - 訂閱狀態篩選
- `idx_teams_slug` - URL slug 查詢
- `idx_teams_deleted_at` - 軟刪除篩選

✅ **orders 表**

- `idx_orders_team_id` - 團隊訂單查詢
- `idx_orders_customer_id` - 顧客訂單查詢
- `idx_orders_status` - 狀態篩選
- `idx_orders_pickup_date` - 日期排序
- `idx_orders_created_at` - 建立時間排序
- `idx_orders_team_status_pickup` - 複合索引（常見查詢）

✅ **customers 表**

- `idx_customers_team_id` - 團隊顧客查詢
- `idx_customers_phone` - 電話查詢
- `idx_customers_line_user_id` - LINE ID 查詢
- `idx_customers_team_phone` - 唯一約束（團隊內電話不重複）

✅ **line_messages 表**

- `idx_line_messages_team_id` - 團隊訊息查詢
- `idx_line_messages_line_user_id` - 使用者訊息查詢
- `idx_line_messages_created_at` - 時間排序
- `idx_line_messages_ai_parsed` - 未解析訊息篩選

**缺失索引：**

- ❌ `conversations.status` - 對話狀態篩選（Inbox 頁面需要）
- ❌ `products.team_id, is_available` - 可用商品查詢
- ❌ `customers.tags` - GIN 索引（標籤搜尋）

### 4.4 RLS (Row Level Security) 分析

**已實作 RLS 政策：**

✅ **基於團隊成員的權限控制**

- 用戶只能存取自己所屬團隊的資料
- 使用 `team_members` 表驗證成員身份
- 支援角色權限（owner, admin, member）

✅ **已啟用 RLS 的表**

- `users`, `teams`, `team_members`
- `customers`, `orders`, `line_messages`, `reminders`
- `team_settings`

**缺失 RLS 政策：**

- ❌ `conversations` 表未啟用 RLS
- ❌ `products` 表未啟用 RLS
- ❌ `team_invites` 表未啟用 RLS

### 4.5 Database Functions (RPC)

**已實作 RPC Functions：**

✅ **對話管理**

- `get_or_create_conversation` - 取得或建立對話
- `get_conversation_history` - 查詢對話歷史
- `update_conversation_data` - 更新已收集資料
- `complete_conversation` - 標記對話完成

✅ **訂單管理**

- `create_order_from_ai` - AI 建立訂單
- `update_order_status` - 更新訂單狀態
- `get_order_statistics` - 訂單統計

✅ **團隊管理**

- `create_team_with_owner` - 建立團隊（含擁有者）
- `get_user_teams` - 查詢使用者團隊
- `delete_team_cascade` - 刪除團隊（級聯）

✅ **認證管理**

- `link_auth_user_to_app_user` - 連結 Auth User 與 App User
- `delete_user_account` - 刪除使用者帳號

**缺失 RPC Functions：**

- ❌ `get_customer_statistics` - 顧客統計
- ❌ `get_product_statistics` - 商品統計
- ❌ `get_ai_statistics` - AI 解析統計
- ❌ `batch_update_products` - 批次更新商品

### 4.6 Triggers

**已實作 Triggers：**

✅ **自動更新 `updated_at`**

- `teams`, `users`, `customers`, `orders`, `team_settings`

✅ **自動更新統計資訊**

- `update_customer_stats_on_order` - 訂單建立時更新顧客統計
- `update_team_stats_on_order` - 訂單建立時更新團隊統計

✅ **自動建立提醒**

- `create_reminders_on_order` - 訂單建立時自動建立提醒

**缺失 Triggers：**

- ❌ 訂單刪除時更新統計
- ❌ 商品刪除時檢查訂單關聯

---

## 5. 功能缺失與問題

### 5.1 前端問題

#### 🔴 嚴重問題

1. **所有頁面都未串接實際 API**

   - 影響：無法使用真實資料
   - 範圍：Overview, Orders, Inbox, Customers 所有頁面
   - 原因：Service 層已定義，但頁面未使用

2. **無資料查詢 Hook**

   - 影響：無法進行資料查詢
   - 缺失：未使用 `@tanstack/react-query` 或類似方案
   - 建議：實作 `useOrders`, `useCustomers`, `useConversations` 等 Hook

3. **無即時資料更新**
   - 影響：資料變更不會即時反映
   - 缺失：未使用 Supabase Realtime
   - 建議：訂閱 `orders`, `conversations` 表的變更

#### 🟡 中等問題

4. **無錯誤處理機制**

   - 影響：API 錯誤時無提示
   - 缺失：無 Toast/Alert 元件
   - 建議：整合錯誤處理 UI

5. **無載入狀態**

   - 影響：使用者體驗不佳
   - 缺失：無 Loading Spinner
   - 建議：使用 React Query 的 `isLoading` 狀態

6. **無分頁功能**
   - 影響：大量資料時效能問題
   - 範圍：Orders, Customers, Inbox 列表
   - 建議：實作無限滾動或分頁

#### 🟢 次要問題

7. **無搜尋功能**

   - 影響：難以找到特定資料
   - 範圍：Orders, Customers 頁面

8. **無日期範圍篩選**

   - 影響：無法查看特定時間範圍的訂單
   - 範圍：Orders 頁面

9. **無訂單詳情頁面**

   - 影響：無法查看完整訂單資訊
   - 建議：新增 `order/[id].tsx` 頁面

10. **無顧客詳情頁面**
    - 影響：無法查看顧客訂單歷史
    - 建議：新增 `customer/[id].tsx` 頁面

### 5.2 後端問題

#### 🔴 嚴重問題

1. **缺少 Customer Operations Function**

   - 影響：前端無法管理顧客資料
   - 需要：完整的 CRUD API

2. **缺少 Conversation Operations Function**

   - 影響：Inbox 頁面無法運作
   - 需要：查詢對話列表、確認建單、忽略對話等 API

3. **缺少 Dashboard Summary Function**
   - 影響：Overview 頁面無法顯示統計資料
   - 狀態：前端已定義 `dashboardService`，但後端 Function 不存在

#### 🟡 中等問題

4. **Order Operations 缺少手動建單 API**

   - 影響：商家無法在 App 中手動建立訂單
   - 需要：`POST ?action=create` 端點

5. **缺少統計 API**

   - 影響：無法顯示各種統計圖表
   - 需要：顧客統計、商品統計、AI 統計

6. **缺少批次操作 API**
   - 影響：無法批次更新資料
   - 需要：批次更新商品、批次更新訂單狀態

#### 🟢 次要問題

7. **LINE Webhook 不支援圖片**

   - 影響：無法處理客人傳送的商品圖片
   - 建議：新增圖片訊息處理邏輯

8. **無 Flex Message 回覆**

   - 影響：回覆訊息較單調
   - 建議：使用 Flex Message 美化訂單確認訊息

9. **無對話逾時機制**
   - 影響：對話可能永久保持 `active` 狀態
   - 建議：新增定時任務，自動關閉逾時對話

### 5.3 資料庫問題

#### 🔴 嚴重問題

1. **`conversations` 和 `products` 表未啟用 RLS**
   - 影響：資料安全風險
   - 建議：立即新增 RLS 政策

#### 🟡 中等問題

2. **缺少部分索引**

   - 影響：查詢效能可能不佳
   - 需要：`conversations.status`, `products.is_available`, `customers.tags` (GIN)

3. **缺少統計 RPC Functions**
   - 影響：前端需要自行計算統計資料
   - 需要：顧客統計、商品統計、AI 統計

#### 🟢 次要問題

4. **缺少部分 Triggers**
   - 影響：統計資料可能不準確
   - 需要：訂單刪除時更新統計

---

## 6. 改進建議

### 6.1 短期改進（1-2 週）

#### 優先級 P0（必須完成）

1. **前端串接 API**

   ```typescript
   // 實作資料查詢 Hook
   -hooks / queries / useOrders.ts -
     hooks / queries / useCustomers.ts -
     hooks / queries / useConversations.ts -
     hooks / queries / useDashboard.ts;
   ```

2. **實作缺失的後端 Function**

   ```
   - customer-operations (完整 CRUD)
   - conversation-operations (Inbox 功能)
   - dashboard-summary (統計資料)
   ```

3. **啟用資料表 RLS**
   ```sql
   - ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
   - ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   - 新增對應的 RLS 政策
   ```

#### 優先級 P1（重要）

4. **新增訂單手動建立功能**

   - 後端：`POST /order-operations?action=create`
   - 前端：新增建單表單頁面

5. **實作錯誤處理與載入狀態**

   - 整合 Toast 元件
   - 使用 React Query 的 `isLoading`, `isError` 狀態

6. **新增缺失索引**
   ```sql
   CREATE INDEX idx_conversations_status ON conversations(status);
   CREATE INDEX idx_products_available ON products(team_id, is_available);
   CREATE INDEX idx_customers_tags ON customers USING GIN(tags);
   ```

### 6.2 中期改進（3-4 週）

#### 優先級 P2（建議）

7. **實作即時資料更新**

   ```typescript
   // 使用 Supabase Realtime
   - 訂閱 orders 表變更
   - 訂閱 conversations 表變更
   - 自動更新 UI
   ```

8. **新增詳情頁面**

   - `app/(main)/order/[id].tsx` - 訂單詳情
   - `app/(main)/customer/[id].tsx` - 顧客詳情
   - `app/(main)/conversation/[id].tsx` - 對話詳情

9. **實作搜尋與篩選**

   - 訂單搜尋（顧客名稱、訂單編號）
   - 顧客搜尋（姓名、電話）
   - 日期範圍篩選

10. **新增統計 API**
    ```
    - GET /dashboard-summary?action=customer-stats
    - GET /dashboard-summary?action=product-stats
    - GET /dashboard-summary?action=ai-stats
    ```

### 6.3 長期改進（1-2 月）

#### 優先級 P3（未來）

11. **LINE Webhook 增強**

    - 支援圖片訊息處理
    - 使用 Flex Message 回覆
    - 新增對話逾時機制
    - 新增錯誤重試機制

12. **批次操作功能**

    - 批次更新訂單狀態
    - 批次上下架商品
    - 批次匯出資料

13. **進階分析功能**

    - 營收趨勢圖表
    - 商品銷售排行
    - 顧客 RFM 分析
    - AI 解析成功率追蹤

14. **通知系統**
    - 實作 Expo Notifications
    - 新增提醒管理頁面
    - 自動發送訂單提醒

### 6.4 架構優化建議

#### 前端架構

```typescript
// 建議的資料夾結構
mobile/
├── app/                    # 頁面
├── components/             # UI 元件
├── hooks/
│   ├── queries/           # React Query Hooks
│   │   ├── useOrders.ts
│   │   ├── useCustomers.ts
│   │   └── useConversations.ts
│   └── mutations/         # Mutation Hooks
│       ├── useCreateOrder.ts
│       └── useUpdateOrder.ts
├── services/              # API 呼叫層（已存在）
├── stores/                # 全域狀態（Zustand）
└── types/                 # TypeScript 型別
```

#### 後端架構

```
supabase/functions/
├── _shared/              # 共用工具（已存在）
├── line-webhook/         # LINE Webhook（已存在）
├── order-operations/     # 訂單操作（已存在）
├── team-operations/      # 團隊操作（已存在）
├── product-operations/   # 商品操作（已存在）
├── customer-operations/  # ❌ 需新增
├── conversation-operations/ # ❌ 需新增
├── dashboard-summary/    # ❌ 需新增
└── notification-operations/ # ❌ 需新增
```

#### 資料庫優化

```sql
-- 新增缺失索引
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_team_status ON conversations(team_id, status);
CREATE INDEX idx_products_available ON products(team_id, is_available);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

-- 啟用 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- 新增 RLS 政策（範例）
CREATE POLICY "Team members can view conversations"
  ON conversations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = (SELECT id FROM users WHERE line_user_id = auth.uid()::text)
    )
  );
```

---

## 7. 總結

### 7.1 系統現況評估

| 項目                 | 完成度 | 評分       |
| -------------------- | ------ | ---------- |
| **資料庫設計**       | 90%    | ⭐⭐⭐⭐⭐ |
| **後端 API（核心）** | 70%    | ⭐⭐⭐⭐   |
| **後端 API（完整）** | 50%    | ⭐⭐⭐     |
| **前端 UI**          | 95%    | ⭐⭐⭐⭐⭐ |
| **前端資料串接**     | 5%     | ⭐         |
| **LINE Webhook**     | 85%    | ⭐⭐⭐⭐   |
| **AI 解析**          | 80%    | ⭐⭐⭐⭐   |

### 7.2 關鍵發現

✅ **優勢：**

1. 資料庫設計完整且架構清晰（Team-Centric）
2. LINE Webhook 功能強大（支援多輪對話、全/半自動模式）
3. 前端 UI 設計精美且完整
4. Service 層已定義完整的 API 介面

❌ **主要問題：**

1. **前端與後端嚴重脫節**：UI 完成但未串接 API
2. **缺少關鍵後端 Function**：Customer、Conversation、Dashboard
3. **無資料查詢機制**：未使用 React Query 或類似方案
4. **資料安全問題**：部分表未啟用 RLS

### 7.3 建議優先順序

**第一階段（2 週內）：**

1. 實作缺失的後端 Function（Customer、Conversation、Dashboard）
2. 前端串接 API（使用 React Query）
3. 啟用所有表的 RLS

**第二階段（4 週內）：** 4. 新增訂單手動建立功能 5. 實作即時資料更新（Realtime） 6. 新增詳情頁面（訂單、顧客、對話）

**第三階段（2 月內）：** 7. 實作搜尋與篩選功能 8. 新增統計與分析功能 9. 優化 LINE Webhook（圖片、Flex Message）

---

## 附錄

### A. 前端 API 呼叫對照表

| 前端 Service                             | 後端 Function                                | 狀態      |
| ---------------------------------------- | -------------------------------------------- | --------- |
| `orderService.getOrders()`               | `order-operations?action=list`               | ✅ 已實作 |
| `orderService.getOrderById()`            | `order-operations?action=detail`             | ✅ 已實作 |
| `orderService.updateOrderStatus()`       | `order-operations?action=update-status`      | ✅ 已實作 |
| `orderService.updateOrder()`             | `order-operations?action=update`             | ✅ 已實作 |
| `orderService.confirmPayment()`          | `order-operations?action=confirm-payment`    | ✅ 已實作 |
| `teamService.getUserTeams()`             | `team-operations?action=list`                | ✅ 已實作 |
| `teamService.getTeamMembers()`           | `team-operations?action=members`             | ✅ 已實作 |
| `teamService.createTeam()`               | `team-operations?action=create`              | ✅ 已實作 |
| `productService.getProducts()`           | `product-operations?action=list`             | ✅ 已實作 |
| `productService.createProduct()`         | `product-operations?action=create`           | ✅ 已實作 |
| `dashboardService.getDashboardSummary()` | `dashboard-summary?action=dashboard-summary` | ❌ 未實作 |
| `dashboardService.getRevenueStats()`     | `dashboard-summary?action=revenue-stats`     | ❌ 未實作 |
| **缺失：Customer Service**               | `customer-operations`                        | ❌ 未實作 |
| **缺失：Conversation Service**           | `conversation-operations`                    | ❌ 未實作 |

### B. 資料庫 Migration 歷史

| Migration | 功能                              | 日期 |
| --------- | --------------------------------- | ---- |
| 001       | 初始 Schema（10 個核心表）        | -    |
| 002       | RLS 政策                          | -    |
| 003       | Database Functions                | -    |
| 004       | Triggers                          | -    |
| 005       | Link Auth Users                   | -    |
| 006       | Team Creation Function            | -    |
| 007       | Order Functions                   | -    |
| 008       | Add Bot User ID                   | -    |
| 009       | Conversations System              | -    |
| 010       | Conversations RLS                 | -    |
| 011       | Multi-Industry Support            | -    |
| 012       | Update Order Function             | -    |
| 013       | Team Delete Function              | -    |
| 014       | Add LINE Channel ID to User Teams | -    |
| 015       | Fix Order Function Conflict       | -    |
| 016       | Diagnose Function                 | -    |
| 017       | Fix Function Permissions          | -    |
| 018       | Products Table                    | -    |
| 019       | Add Apple Sign In Support         | -    |
| 020       | Add Auto Mode to Get User Teams   | -    |
| 021       | Delete User Account               | -    |
| 022       | Add Payment Method                | -    |
| 023       | Add Paid At & Turn Count          | -    |
| 024       | Pickup Settings                   | -    |
| 025       | Update Order Function Pickup Type | -    |

---

**文件結束**
