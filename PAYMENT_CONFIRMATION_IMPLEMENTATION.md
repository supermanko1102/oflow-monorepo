# 訂單付款確認流程 - 實施完成摘要

## 概述

成功實施了訂單付款確認流程，將原本的「標記為已完成」改為更符合實際業務的三階段流程：

```
pending（待付款）→ paid（已付款）→ completed（已完成）
```

## 核心變更

### 業務邏輯

**改進前**：

- AI 建立訂單 → pending
- 商家點「標記為已完成」→ completed

**改進後**：

- AI 建立訂單 → pending（待付款）
- 商家確認收款（選擇付款方式）→ paid（已付款）
- 商家交付商品 → completed（已完成）

**關鍵優勢**：

- 符合真實業務流程（收到款項才算訂單成立）
- 記錄付款方式和時間
- 更好的財務管理和數據分析

## 實施細節

### 1. 資料庫 Migration

**檔案**：`supabase/migrations/023_add_paid_at.sql`

- 新增 `paid_at TIMESTAMP` 欄位
- 為現有訂單設定 paid_at 時間
- 建立索引優化查詢效能

### 2. 後端 API

**檔案**：`supabase/functions/order-operations/index.ts`

新增 `confirm-payment` API 端點：

- POST `/functions/v1/order-operations?action=confirm-payment`
- 接收參數：`order_id`, `payment_method`（cash/transfer/other）
- 驗證：用戶權限、訂單狀態
- 更新：`status = 'paid'`, `payment_method`, `paid_at = NOW()`
- 權限控制：只有 owner/admin/can_manage_orders 可操作
- 狀態檢查：只有 pending 訂單可確認收款

更新 `transformOrderToClient` 函數：

- 新增 `paidAt` 欄位映射

### 3. 前端 Service Layer

**檔案**：`mobile/services/orderService.ts`

新增函數：

```typescript
export async function confirmPayment(
  orderId: string,
  paymentMethod: "cash" | "transfer" | "other"
): Promise<void>;
```

### 4. React Query Hook

**檔案**：`mobile/hooks/queries/useOrders.ts`

新增 `useConfirmPayment` hook：

- 自動 invalidate 訂單詳情
- 自動 invalidate 訂單列表
- 自動 invalidate Dashboard

### 5. 類型定義

**檔案**：`mobile/types/order.ts`

更新：

- `OrderStatus` 新增 `"paid"` 狀態
- `Order` 介面新增 `paidAt?: string`
- `OrderFilters` 支援 `"paid"` 篩選
- `UpdateOrderStatusParams` 支援 `"paid"` 狀態

### 6. UI 組件

#### StatusBadge 組件

**檔案**：`mobile/components/StatusBadge.tsx`

- 新增 `paid` 狀態顯示
- 使用藍色系：背景 `#DBEAFE`，文字 `#2563EB`
- `pending` 狀態改名為「待付款」

#### 訂單詳情頁

**檔案**：`mobile/app/(main)/order/[id].tsx`

**根據訂單狀態顯示不同內容**：

**Pending 狀態**：

```
確認收款
[現金] [轉帳]
[其他]
```

- 2x2 Grid 排列，現金和轉帳在第一行
- 點擊後確認收款並更新狀態為 paid

**Paid 狀態**：

```
付款資訊 Card
- 付款方式：現金
- 付款時間：2024/11/10 18:44

[標記為已完成] 按鈕
```

**Completed 狀態**：

```
付款資訊 Card
- 付款方式：現金
- 付款時間：2024/11/10 18:44

[改回待處理] 按鈕（原有功能保留）
```

## 技術架構

### 資料流程

```
前端 UI (付款按鈕)
    ↓
useConfirmPayment Hook
    ↓
orderService.confirmPayment()
    ↓
order-operations API
    ↓
Database Update
    ↓
React Query Invalidation
    ↓
UI 自動更新
```

### 付款方式選項

- **現金**（cash）
- **轉帳**（transfer）
- **其他**（other）

原本的「LINE Pay」已移除，改為更通用的「其他」選項。

## 測試建議

### 功能測試

- [ ] pending 訂單顯示三個付款按鈕
- [ ] 點擊「現金」成功更新為 paid
- [ ] 點擊「轉帳」成功更新為 paid
- [ ] 點擊「其他」成功更新為 paid
- [ ] paid 訂單顯示付款資訊和「標記為已完成」按鈕
- [ ] completed 訂單顯示付款資訊
- [ ] StatusBadge 正確顯示 paid 狀態（藍色）
- [ ] 訂單列表正確顯示 paid 狀態

### 權限測試

- [ ] 非團隊成員無法確認收款
- [ ] 普通成員（無權限）無法確認收款
- [ ] admin/owner 可以確認收款

### 邊界測試

- [ ] paid 狀態訂單無法再次確認收款
- [ ] completed 狀態訂單無法確認收款
- [ ] 舊訂單（無 paid_at）仍可正常顯示
- [ ] 快速連續點擊付款按鈕（防抖處理）

## 部署步驟

1. **資料庫 Migration**：

   ```bash
   # 在 Supabase Dashboard 執行
   supabase/migrations/023_add_paid_at.sql
   ```

2. **後端部署**：

   ```bash
   supabase functions deploy order-operations
   ```

3. **前端部署**：
   - 前端程式碼已更新，無需額外部署步驟

## 後續優化建議

1. **統計功能**：

   - Dashboard 顯示各付款方式的統計（已有 `payment_stats`）
   - 月報表顯示現金 vs 轉帳比例

2. **訂單列表篩選**：

   - 支援按 paid 狀態篩選
   - 支援按付款方式篩選

3. **通知優化**：

   - 收到款項後自動通知客戶「已確認收款」
   - 提醒商家未付款訂單

4. **付款憑證**：
   - 允許上傳轉帳憑證截圖
   - 記錄付款備註

## 檔案清單

### 新增檔案

- `supabase/migrations/023_add_paid_at.sql`
- `PAYMENT_CONFIRMATION_IMPLEMENTATION.md`（本文檔）

### 修改檔案

- `supabase/functions/order-operations/index.ts`
- `mobile/services/orderService.ts`
- `mobile/hooks/queries/useOrders.ts`
- `mobile/types/order.ts`
- `mobile/components/StatusBadge.tsx`
- `mobile/app/(main)/order/[id].tsx`

## 營收統計修正（重要）

### 問題

原本營收統計只計算 `completed` 狀態的訂單，但新流程中 `paid` 狀態就代表已收款。

### 解決方案

修改兩處查詢邏輯，將 `paid` 和 `completed` 都計入營收：

1. **營收統計 API**（`revenue-stats`）：

```typescript
// 修改前
.eq("status", "completed")

// 修改後
.in("status", ["paid", "completed"])
```

2. **Dashboard 摘要**（`dashboard-summary`）的今日已完成：

```typescript
// 修改前
.eq("status", "completed")

// 修改後
.in("status", ["paid", "completed"])
```

### 影響

- ✅ 確認收款後，營收立即顯示
- ✅ Dashboard 的「今日已完成」包含已付款訂單
- ✅ 符合業務邏輯（收到錢 = 營收成立）

## 總結

✅ **完整實施三階段訂單流程**
✅ **符合實際業務場景**（收款才算成立）
✅ **完整的權限控制**
✅ **清晰的 UI/UX**（垂直排列，顏色區分）
✅ **記錄付款方式和時間**
✅ **營收統計包含 paid 狀態**
✅ **遵循專案 coding style**

付款確認流程已成功實施，商家現在可以：

1. 收到訂單後先確認收款（選擇現金/轉帳/其他）
2. 確認收款後營收立即顯示
3. 準備商品
4. 交付商品後標記為已完成

這個流程更貼近真實的商業操作，也為未來的財務管理和數據分析打下基礎。
