# 配送設定前端重構說明

## 概述

根據專案的 coding style，重新設計了配送設定的前端架構，遵循以下原則：
- 使用 **React Query** 管理 server state
- 使用 **Services Layer** 封裝 API 調用
- 使用 **NativeWind (TailwindCSS)** 進行樣式設計
- 使用 **React Native Paper** 組件
- 統一的 Query Keys 管理

## 檔案結構

### 1. Services Layer
**檔案**: `mobile/services/deliverySettingsService.ts`

封裝所有配送設定相關的 API 調用，使用統一的 `ApiClient`：

```typescript
// Queries
export async function getDeliverySettings(teamId: string): Promise<DeliverySettings | null>

// Mutations
export async function updateDeliverySettings(
  teamId: string, 
  settings: Partial<DeliverySettings>
): Promise<boolean>
```

**特點**：
- 使用 `ApiClient` 統一管理 API 調用
- 完整的錯誤處理
- 符合專案的 service 層設計模式

### 2. React Query Hooks
**檔案**: `mobile/hooks/queries/useDeliverySettings.ts`

提供 React Query hooks 管理 server state：

```typescript
// Query Hook
export function useDeliverySettings(teamId: string, enabled?: boolean)

// Mutation Hook
export function useUpdateDeliverySettings()
```

**Cache 策略**：
- `staleTime`: 5 分鐘（配送設定不常變動）
- 自動 invalidate 相關 queries

### 3. Query Keys
**檔案**: `mobile/hooks/queries/queryKeys.ts`

新增配送設定的 query keys：

```typescript
deliverySettings: {
  all: () => ["delivery-settings"],
  detail: (teamId: string) => ["delivery-settings", "detail", teamId],
}
```

### 4. 前端頁面
**檔案**: `mobile/app/(main)/delivery-settings.tsx`

配送設定管理頁面，符合專案 UI 風格：

**使用技術**：
- NativeWind (`className`) 進行樣式設計
- React Native Paper 的 `Card`, `Button` 組件
- `useRouter` 進行導航
- `useToast` 進行提示
- `useAuthStore` 取得當前團隊
- `useDeliverySettings` 和 `useUpdateDeliverySettings` hooks

**功能**：
- 啟用/停用到店取貨（店面地址、營業時間）
- 啟用/停用約定地點面交（可面交區域、備註）
- 啟用/停用超商取貨
- 啟用/停用宅配（黑貓）
- 表單驗證（開啟店取時，地址為必填）
- 自動載入和儲存設定

### 5. 設定頁面入口
**檔案**: `mobile/app/(main)/(tabs)/settings.tsx`

在設定頁面中新增「配送設定」入口：

```tsx
{/* Delivery Settings Section */}
{canManageTeam && (
  <View className="bg-white mt-4">
    <List.Section>
      <List.Subheader>配送設定</List.Subheader>
      <List.Item
        title="配送方式管理"
        description="設定店取、面交、超商、宅配等選項"
        left={(props) => <List.Icon {...props} icon="truck-delivery" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push("/(main)/delivery-settings")}
      />
    </List.Section>
  </View>
)}
```

**權限控制**：只有 `owner` 或 `admin` 可以看到此入口

## 後端 API 端點

### 檔案：`supabase/functions/team-operations/index.ts`

新增兩個 API 端點：

#### 1. 查詢配送設定
```
GET /functions/v1/team-operations?action=delivery-settings&team_id={teamId}
```

**回應**：
```json
{
  "success": true,
  "settings": {
    "pickup_settings": {
      "store_pickup": {
        "enabled": false,
        "address": null,
        "business_hours": null
      },
      "meetup": {
        "enabled": false,
        "available_areas": [],
        "note": null
      }
    },
    "enable_convenience_store": true,
    "enable_black_cat": true
  }
}
```

#### 2. 更新配送設定
```
POST /functions/v1/team-operations?action=delivery-settings/update
```

**請求 Body**：
```json
{
  "team_id": "xxx",
  "pickup_settings": { ... },
  "enable_convenience_store": true,
  "enable_black_cat": true
}
```

**權限檢查**：
- 驗證用戶是否為團隊成員
- 驗證用戶是否為 `owner` 或 `admin`

## 資料流程

```
┌─────────────────────────────────────────────────────────────┐
│  用戶操作 (delivery-settings.tsx)                           │
│  - 修改配送設定                                              │
│  - 點擊儲存                                                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  React Query Hook (useUpdateDeliverySettings)               │
│  - 調用 mutation                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (deliverySettingsService)                    │
│  - 封裝 API 調用                                             │
│  - 使用 ApiClient                                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function (team-operations)                            │
│  - 驗證權限                                                  │
│  - 更新資料庫                                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Database (team_settings)                          │
│  - pickup_settings (JSONB)                                   │
│  - enable_convenience_store (BOOLEAN)                        │
│  - enable_black_cat (BOOLEAN)                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  React Query (自動 invalidate & refetch)                     │
│  - 更新 cache                                                │
│  - UI 自動更新                                               │
└─────────────────────────────────────────────────────────────┘
```

## 與專案 Coding Style 的對齊

### ✅ 遵循的設計模式

1. **Services Layer Pattern**
   - 所有 API 調用封裝在 service 檔案中
   - 使用 `ApiClient` 統一管理請求

2. **React Query Pattern**
   - Server state 使用 React Query 管理
   - Client state 使用 Zustand 管理（`useAuthStore`）
   - 清楚區分不同類型的 state

3. **Query Keys Management**
   - 集中管理在 `queryKeys.ts`
   - 支援 hierarchical invalidation

4. **UI 組件使用**
   - NativeWind 進行樣式設計
   - React Native Paper 組件
   - 統一的 toast 提示

5. **權限控制**
   - 前端：`canManageTeam` 控制 UI 顯示
   - 後端：驗證 `role` 和 `can_manage_settings`

### ✅ 命名規範

- Hook: `useDeliverySettings`, `useUpdateDeliverySettings`
- Service: `getDeliverySettings`, `updateDeliverySettings`
- 組件: `DeliverySettingsScreen`
- 檔案: kebab-case (`delivery-settings.tsx`)

### ✅ 錯誤處理

- Service layer 捕獲並 log 錯誤
- Hook mutation 透過 `toast` 提示用戶
- 表單驗證在前端進行

## 測試建議

### 1. 前端測試
- [ ] 頁面正確載入現有設定
- [ ] 開啟/關閉各個配送方式
- [ ] 表單驗證（開啟店取時，地址必填）
- [ ] 儲存成功後顯示 toast 並返回
- [ ] 權限控制（非 admin 看不到入口）

### 2. 後端測試
- [ ] 查詢配送設定 API
- [ ] 更新配送設定 API
- [ ] 權限驗證（非成員/非 admin 無法操作）
- [ ] 資料庫正確更新

### 3. 整合測試
- [ ] 前端更新後，AI webhook 能正確取得新設定
- [ ] 配送設定變更後，AI 回覆行為正確調整

## 相關檔案清單

### 新增檔案
- `mobile/services/deliverySettingsService.ts`
- `mobile/hooks/queries/useDeliverySettings.ts`
- `mobile/app/(main)/delivery-settings.tsx`
- `mobile/types/delivery-settings.ts` (已存在)

### 修改檔案
- `mobile/hooks/queries/queryKeys.ts`
- `mobile/app/(main)/(tabs)/settings.tsx`
- `supabase/functions/team-operations/index.ts`

### 刪除檔案
- `mobile/lib/api/delivery-settings.ts` (舊的實作)

## 下一步

1. **測試驗證**
   - 在開發環境測試所有功能
   - 確認 API 端點正常運作

2. **部署**
   - 部署後端 Edge Function
   - 發佈前端更新

3. **文檔更新**
   - 更新 API 文檔
   - 更新使用者手冊

## 總結

此次重構完全遵循專案的 coding style，採用：
- ✅ React Query 管理 server state
- ✅ Services Layer 封裝 API
- ✅ 統一的 Query Keys 管理
- ✅ NativeWind + React Native Paper UI
- ✅ 完整的權限控制
- ✅ 清晰的資料流程

所有程式碼都符合專案規範，並通過 linter 檢查。

