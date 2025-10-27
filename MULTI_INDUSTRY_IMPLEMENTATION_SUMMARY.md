# 多行業支援系統實施總結

## 📋 概述

成功將 OFlow 從烘焙業專用工具升級為**跨行業通用預約接單系統**，支援商品型（烘焙、花店、手工藝）和服務型（美容美髮、按摩 SPA、美甲美睫、寵物美容）業務。

實施日期：2025-10-27

---

## ✅ 完成項目

### 1. Database Schema 更新

**新增 Migration：**

- `011_multi_industry_support.sql` - 多行業支援系統
- `012_update_order_function.sql` - 更新訂單建立函數

**新增欄位：**
| 欄位名稱 | 類型 | 說明 | 適用業務 |
|---------|------|------|----------|
| `delivery_method` | TEXT | 配送/服務方式 (pickup/convenience_store/black_cat/onsite) | 通用 |
| `requires_frozen` | BOOLEAN | 是否需要冷凍配送 | 商品型 |
| `store_info` | TEXT | 超商店號/店名 | 商品型 |
| `shipping_address` | TEXT | 寄送地址 | 商品型 |
| `service_duration` | INTEGER | 服務時長（分鐘） | 服務型 |
| `service_notes` | TEXT | 服務備註 | 服務型 |

**語意更新：**

- `pickup_date` → 語意改為「預約/交付日期」
- `pickup_time` → 語意改為「預約/交付時間」

**新增索引：**

- `idx_orders_delivery_method`
- `idx_teams_business_type`
- `idx_orders_team_delivery`

---

### 2. TypeScript 型別定義

**新增檔案：**

- `mobile/types/team.ts` - 業務類別型別和常數

**新增型別：**

```typescript
// 業務類別
export type BusinessType =
  | "bakery"
  | "beauty"
  | "massage"
  | "nail"
  | "flower"
  | "craft"
  | "pet"
  | "other";

// 配送/服務方式
export type DeliveryMethod =
  | "pickup"
  | "convenience_store"
  | "black_cat"
  | "onsite";
```

**更新檔案：**

- `mobile/types/order.ts` - 新增配送方式、服務型欄位

**業務類別選項：**
8 種業務類別，每種都配有對應的 Material Community Icons：

- 🍰 烘焙甜點 (`cake-variant`)
- 💇 美容美髮 (`content-cut`)
- 💆 按摩 SPA (`spa`)
- 💅 美甲美睫 (`hand-heart`)
- 🌸 花店 (`flower-tulip`)
- 🐶 寵物美容 (`dog`)
- 🎨 手工藝品 (`palette`)
- 📦 其他 (`package-variant`)

---

### 3. 前端 UI 更新

**更新檔案：**

- `mobile/app/(auth)/team-create.tsx`

**新增功能：**

- ✅ 業務類別選擇器（8 種業務類型）
- ✅ 使用 MaterialCommunityIcons 顯示 icon
- ✅ 視覺化選擇介面（卡片式）
- ✅ 建立團隊時傳遞 `business_type` 參數

---

### 4. AI 智能適應系統

**更新檔案：**

- `supabase/functions/ai-parse-message/index.ts`

**核心變更：**

1. **新增兩套 System Prompt：**

   - `generateProductBasedPrompt()` - 商品型業務（烘焙、花店等）
   - `generateServiceBasedPrompt()` - 服務型業務（美容美髮、按摩等）

2. **根據業務類別自動切換：**

   ```typescript
   const isProductBased = ['bakery', 'flower', 'craft', 'other'].includes(businessType);
   const systemPrompt = isProductBased
     ? generateProductBasedPrompt(...)
     : generateServiceBasedPrompt(...);
   ```

3. **商品型業務 AI 行為：**

   - 詢問：商品 → 時間 → 配送方式（自取/超商/黑貓）→ 冷凍需求
   - 必填：items, delivery_date, delivery_time, delivery_method
   - 超商需要：store_info
   - 宅配需要：shipping_address

4. **服務型業務 AI 行為：**

   - 詢問：服務項目 → 預約時間 → 特殊需求
   - 必填：items, delivery_date, delivery_time
   - `delivery_method` 自動設為 "onsite"
   - 不詢問配送方式

5. **更新 AI 解析結果介面：**
   - 新增 `delivery_method`, `requires_frozen`, `store_info`, `shipping_address`
   - 新增 `service_duration`, `service_notes`
   - 改用 `delivery_date/time`（保留 `pickup_date/time` 作為向後兼容）

---

### 5. Database Function 更新

**更新函數：**

- `create_order_from_ai()` - 升級至 v2.0

**新增參數：**

```sql
p_appointment_date DATE,              -- 通用：預約/交付日期
p_appointment_time TIME,              -- 通用：預約/交付時間
p_delivery_method TEXT DEFAULT 'pickup',
p_requires_frozen BOOLEAN DEFAULT false,
p_store_info TEXT DEFAULT NULL,
p_shipping_address TEXT DEFAULT NULL,
p_service_duration INTEGER DEFAULT NULL,
p_service_notes TEXT DEFAULT NULL
```

**向後兼容：**

- 參數名稱改為 `appointment_date/time`，但 DB 欄位名保持 `pickup_date/time`
- 所有新欄位都有預設值

---

### 6. Edge Functions 更新

**更新檔案：**

- `supabase/functions/line-webhook/index.ts`
- `supabase/functions/order-operations/index.ts`

**line-webhook 變更：**

- 更新 `create_order_from_ai` RPC 呼叫
- 傳遞新欄位：`p_delivery_method`, `p_requires_frozen`, 等
- 支援新舊欄位名稱（`delivery_date` 或 `pickup_date`）

**order-operations 變更：**

- 更新 `transformOrderToClient()` 函數
- 將 DB 的 snake_case 轉換為前端的 camelCase
- 同時回傳新欄位和舊欄位（向後兼容）

---

## 🔄 向後兼容性

### 資料庫層級

- ✅ 保留 `pickup_date/time` 欄位名稱
- ✅ 只更新欄位註解（語意改變）
- ✅ 新欄位都有預設值
- ✅ 現有訂單不受影響

### TypeScript 層級

- ✅ 新增 `appointmentDate/Time` 欄位
- ✅ 保留 `pickupDate/Time` 標記為 `@deprecated`
- ✅ 前端元件可繼續使用舊欄位名稱

### API 層級

- ✅ `transformOrderToClient()` 同時回傳新舊欄位
- ✅ AI 解析支援新舊欄位名稱
- ✅ RPC 呼叫處理新舊欄位轉換

---

## 🎯 使用場景範例

### 商品型業務（烘焙業）

**場景 1：自取訂單**

```
客人：我要 6 吋巴斯克，明天下午 2 點自取
AI 解析：
  - items: [{ name: "6吋巴斯克", quantity: 1 }]
  - delivery_date: 2025-10-28
  - delivery_time: 14:00
  - delivery_method: pickup
  - is_complete: true
```

**場景 2：超商取貨**

```
客人：我要 8 吋蛋糕，後天超商取貨
AI：請問超商店號或店名？
客人：台北市民店
AI 解析：
  - delivery_method: convenience_store
  - store_info: 台北市民店
```

**場景 3：黑貓宅配 + 冷凍**

```
客人：我要生乳酪蛋糕，下週三宅配到台中
AI：需要冷凍配送嗎？
客人：要冷凍
AI：請提供完整地址
AI 解析：
  - delivery_method: black_cat
  - requires_frozen: true
  - shipping_address: [待補]
```

---

### 服務型業務（美髮業）

**場景 1：基本預約**

```
客人：我要剪頭髮
AI：請問您方便的預約時間？
客人：明天下午 3 點
AI 解析：
  - items: [{ name: "剪頭髮", quantity: 1 }]
  - delivery_date: 2025-10-28
  - delivery_time: 15:00
  - delivery_method: onsite (自動設定)
  - is_complete: true
```

**場景 2：複合服務 + 特殊需求**

```
客人：我要染髮加護髮，我對阿摩尼亞過敏
AI：染髮+護髮約需 2-3 小時，請問預約時間？
客人：這週五早上 10 點
AI 解析：
  - items: [
      { name: "染髮", quantity: 1 },
      { name: "護髮", quantity: 1 }
    ]
  - delivery_date: 2025-10-31
  - delivery_time: 10:00
  - service_duration: 150
  - service_notes: "對阿摩尼亞過敏"
  - delivery_method: onsite
```

---

## 📊 資料庫 Migration 執行順序

1. `011_multi_industry_support.sql` - 新增欄位和索引
2. `012_update_order_function.sql` - 更新 create_order_from_ai 函數

**執行方式：**

```bash
# 本地開發
supabase migration up

# 生產環境
supabase db push
```

---

## 🧪 測試建議

### 前端測試

- [ ] 建立團隊時能選擇 8 種業務類別
- [ ] 業務類別 icon 正確顯示
- [ ] 訂單列表正確顯示配送方式標籤
- [ ] 向後兼容：舊訂單仍能正常顯示

### AI 測試

- [ ] 商品型業務：AI 會詢問配送方式
- [ ] 服務型業務：AI 不詢問配送方式，自動設為 onsite
- [ ] 超商取貨：AI 會追問店號
- [ ] 宅配：AI 會追問地址
- [ ] 冷凍需求：AI 能識別並詢問

### Database 測試

- [ ] 新訂單包含新欄位
- [ ] 舊訂單仍能查詢（新欄位為 NULL 或預設值）
- [ ] 索引正常運作
- [ ] RPC 函數正常執行

---

## 📝 後續工作建議

### 短期（1-2 週）

1. 更新前端元件逐步改用 `appointmentDate/Time`
2. 新增配送方式篩選功能
3. 訂單詳情頁顯示配送相關資訊

### 中期（1 個月）

1. 商品目錄系統（可選功能）
2. 服務時段管理（服務型業務專用）
3. 配送狀態追蹤

### 長期（3 個月）

1. 多規格商品支援
2. 庫存管理（商品型）
3. 預約時段衝突檢測（服務型）

---

## 📚 相關文件

- [專案架構說明](./ARCHITECTURE_MIGRATION_GUIDE.md)
- [Backend 實作指南](./BACKEND_IMPLEMENTATION_GUIDE.md)
- [AI 多輪對話實作](./LINE_MULTI_TURN_SUMMARY.md)

---

## 👥 貢獻者

- **實施者：** Claude (AI Assistant)
- **產品設計：** Alex
- **實施日期：** 2025-10-27

---

## 🎉 總結

成功將 OFlow 從單一行業工具升級為跨行業通用系統，同時保持完整的向後兼容性。新系統支援 8 種業務類別，AI 能根據業務類型智能調整對話流程，為不同行業提供量身定制的用戶體驗。

**關鍵成就：**

- ✅ 零破壞性變更
- ✅ 完整向後兼容
- ✅ AI 智能適應
- ✅ 清晰的型別定義
- ✅ 詳細的文件記錄
