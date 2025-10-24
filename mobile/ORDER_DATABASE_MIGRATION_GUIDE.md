# 訂單資料庫遷移指南

## 📋 概述

此次更新將訂單管理從假資料（mock data）遷移至 Supabase 資料庫，採用與 Team 功能相同的三層架構：
- **Edge Function Layer**: 處理訂單 CRUD 操作
- **Service Layer**: 封裝 API 呼叫
- **React Query Layer**: 管理 server state 和 cache

## 🎯 主要變更

### 1. 新建 Edge Function
- **檔案**: `supabase/functions/order-operations/index.ts`
- **功能**: 
  - `list`: 查詢訂單列表（支援篩選）
  - `detail`: 查詢訂單詳情
  - `update-status`: 更新訂單狀態
  - `update`: 更新訂單資料

### 2. 新建 Service Layer
- **檔案**: `mobile/services/orderService.ts`
- **函數**:
  - `getOrders(teamId, filters)`: 查詢訂單列表
  - `getOrderById(orderId)`: 查詢訂單詳情
  - `updateOrderStatus(params)`: 更新訂單狀態
  - `updateOrder(params)`: 更新訂單資料

### 3. 新建 React Query Hooks
- **檔案**: `mobile/hooks/queries/useOrders.ts`
- **Hooks**:
  - `useOrders`: 查詢訂單列表
  - `useOrderDetail`: 查詢訂單詳情
  - `useUpdateOrderStatus`: 更新訂單狀態 mutation
  - `useUpdateOrder`: 更新訂單資料 mutation

### 4. 更新的頁面
- `mobile/app/(main)/(tabs)/orders.tsx`: 訂單列表頁
- `mobile/app/(main)/order/[id].tsx`: 訂單詳情頁
- `mobile/app/(main)/(tabs)/index.tsx`: 首頁（今日概覽）

### 5. 型別更新
- **檔案**: `mobile/types/order.ts`
- 新增欄位：`orderNumber`, `customerId`, `confirmedAt`, `completedAt`, `updatedAt`
- 新增 status: `confirmed`
- 更新 source: `auto`, `semi-auto`, `manual`

### 6. 組件更新
- **檔案**: `mobile/components/StatusBadge.tsx`
- 支援新的訂單狀態和來源類型
- AI 自動訂單使用綠色標記
- AI 輔助訂單使用黃色標記

### 7. Mock 資料處理
- `mobile/data/mockOrders.ts` → `mobile/data/mockOrders.mock.ts`
- `mobile/stores/useOrderStore.ts`: 標記為 @deprecated

## 🚀 部署步驟

### 1. 部署 Edge Function
```bash
cd supabase

# 部署 order-operations function
supabase functions deploy order-operations
```

### 2. 測試 Edge Function
```bash
# 測試訂單列表查詢
curl -X GET \
  'YOUR_SUPABASE_URL/functions/v1/order-operations?action=list&team_id=TEAM_ID' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. 確認資料庫 Schema
確保以下 migration 已執行：
- `001_initial_schema.sql`: 包含 orders table
- `007_order_functions.sql`: 包含訂單相關函數

### 4. 測試 Mobile App

#### 前置條件
1. 確保用戶已登入
2. 確保用戶已選擇團隊（`currentTeamId` 存在）
3. 確保資料庫中有測試訂單資料

#### 測試步驟
1. **訂單列表頁**
   - 打開訂單列表頁
   - 檢查訂單是否正確載入
   - 測試篩選功能（狀態、日期、搜尋）
   - 測試下拉重新整理
   - 點擊訂單進入詳情頁

2. **訂單詳情頁**
   - 檢查訂單資訊是否正確顯示
   - 測試「標記為完成」按鈕
   - 測試「改回待處理」按鈕
   - 檢查 loading 狀態

3. **首頁（今日概覽）**
   - 檢查今日訂單是否正確顯示
   - 測試訂單完成切換
   - 測試下拉重新整理

## 📝 注意事項

### Cache 策略
- **訂單列表**: `staleTime: 1 分鐘`
- **訂單詳情**: `staleTime: 2 分鐘`
- 更新訂單後自動 invalidate 相關 queries

### 錯誤處理
所有 API 呼叫都已加入錯誤處理：
- 網路錯誤會顯示友善的錯誤訊息
- 權限錯誤會被攔截
- Loading 狀態會正確顯示

### 權限檢查
Edge Function 會檢查：
1. 使用者是否已登入（JWT 驗證）
2. 使用者是否為團隊成員
3. 使用者是否有管理訂單的權限

## 🔍 除錯指南

### Edge Function 無法連線
1. 檢查 Edge Function 是否已部署
   ```bash
   supabase functions list
   ```
2. 檢查環境變數是否正確設定
3. 檢查網路連線

### 訂單列表空白
1. 檢查是否已選擇團隊（`currentTeamId`）
2. 檢查資料庫中是否有訂單資料
3. 檢查 console 是否有錯誤訊息

### 權限錯誤
1. 確認使用者是該團隊的成員
2. 確認使用者有 `can_manage_orders` 權限
3. 檢查 RLS policies 是否正確設定

## 📊 效能優化

### React Query Cache
- 利用 React Query 的智能 cache 減少 API 呼叫
- 支援 prefetch 提升使用者體驗
- 自動 background refetch 保持資料新鮮度

### 資料庫查詢
- 使用索引優化查詢效能
- 支援分頁（未來可擴展）
- 支援篩選和搜尋

## 🎉 完成！

現在訂單功能已完全連接到資料庫，可以進行以下操作：
- ✅ 從資料庫載入真實訂單
- ✅ 更新訂單狀態
- ✅ 支援多團隊切換
- ✅ 智能 cache 管理
- ✅ 完整的錯誤處理
- ✅ Loading 狀態顯示

## 🔗 相關文件
- [React Query 使用指南](./REACT_QUERY_GUIDE.md)
- [後端實作指南](../BACKEND_IMPLEMENTATION_GUIDE.md)
- [部署指南](../DEPLOYMENT_GUIDE_LINE_WEBHOOK.md)

