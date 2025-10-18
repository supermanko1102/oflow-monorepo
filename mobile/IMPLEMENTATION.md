# OFlow 訂單中心 - 實作說明

## 📱 專案概述

基於 React Native Expo 建立的 OFlow 智慧訂單管理系統，使用 NativeWind (Tailwind CSS) 和 react-native-paper UI 組件庫。

## 🎨 技術棧

- **框架**: React Native + Expo Router
- **樣式**: NativeWind (Tailwind CSS)
- **UI 組件庫**: react-native-paper (Material Design)
- **導航**: Expo Router (File-based routing)
- **語言**: TypeScript

## 📂 專案結構

```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab 導航配置
│   │   ├── index.tsx             # 首頁/登入頁
│   │   ├── orders.tsx            # 訂單列表頁
│   │   ├── reminders.tsx         # 提醒通知頁
│   │   └── settings.tsx          # 設置頁
│   ├── order/
│   │   ├── _layout.tsx           # 訂單 Stack 導航
│   │   └── [id].tsx              # 訂單詳情頁（動態路由）
│   └── _layout.tsx               # 根布局（Paper Provider）
├── components/
│   ├── OrderCard.tsx             # 訂單卡片組件
│   ├── ReminderCard.tsx          # 提醒卡片組件
│   ├── StatusBadge.tsx           # 狀態標籤組件
│   └── EmptyState.tsx            # 空狀態組件
├── types/
│   └── order.ts                  # TypeScript 類型定義
├── data/
│   ├── mockOrders.ts             # 假訂單數據
│   └── mockReminders.ts          # 假提醒數據
├── global.css                    # Tailwind CSS 入口
├── tailwind.config.js            # Tailwind 配置
├── metro.config.js               # Metro 配置（支援 NativeWind）
└── babel.config.js               # Babel 配置
```

## 🎯 功能實作

### 1. 登入頁面 (`app/(tabs)/index.tsx`)
- ✅ LINE 登入 CTA 按鈕（品牌綠色 #00B900）
- ✅ 產品特色介紹（自動讀取對話、智慧提醒、模式切換）
- ✅ 假登入邏輯（點擊後跳轉到訂單頁）

### 2. 訂單列表頁 (`app/(tabs)/orders.tsx`)
- ✅ 訂單篩選器（全部/待處理/已完成）
- ✅ 訂單卡片顯示（客戶名稱、品項、時間、金額）
- ✅ 狀態標籤（全自動/半自動、訂單狀態）
- ✅ 點擊進入訂單詳情

### 3. 訂單詳情頁 (`app/order/[id].tsx`)
- ✅ 完整訂單資訊（客戶、取貨、明細）
- ✅ LINE 對話記錄顯示
- ✅ 訂單備註
- ✅ 操作按鈕（標記完成、聯絡客戶）

### 4. 提醒通知頁 (`app/(tabs)/reminders.tsx`)
- ✅ 按時間分組（今天/3天內/7天內）
- ✅ 未讀提醒計數
- ✅ 提醒卡片（顯示訂單摘要）
- ✅ 點擊跳轉到對應訂單

### 5. 設置頁面 (`app/(tabs)/settings.tsx`)
- ✅ 帳號資訊（LINE 連接狀態）
- ✅ 接單模式切換（全自動/半自動）
- ✅ 排班設定入口
- ✅ 通知偏好設定（當天/3天/7天提醒）
- ✅ 關於資訊
- ✅ 登出功能

## 🎨 設計特色

### 顏色系統
- **品牌主色**: LINE 綠色 `#00B900`
- **狀態標籤**:
  - 全自動: 藍色
  - 半自動: 紫色
  - 待處理: 橘色
  - 已完成: 綠色
  - 已取消: 紅色

### 深色模式支援
- ✅ 完整的深色模式支援
- ✅ react-native-paper 主題整合
- ✅ NativeWind dark: 前綴支援

### 假數據設計
- **6 筆訂單**：包含全自動和半自動訂單範例
- **4 筆提醒**：涵蓋不同時間範圍
- **LINE 對話記錄**：展示 AI 如何處理訂單

## 🚀 啟動應用

```bash
cd mobile
npm start
```

選擇平台：
- `i` - iOS 模擬器
- `a` - Android 模擬器
- `w` - 網頁瀏覽器

## 📝 注意事項

### 目前為假數據 UI
- LINE 登入僅為 UI，實際需要整合 LINE Login SDK
- 所有訂單和提醒數據為靜態假數據
- 操作按鈕（標記完成、聯絡客戶）僅為 UI

### 後續需要實作
1. **LINE Login SDK 整合**
   - 實際 OAuth 流程
   - Token 管理
   
2. **API 整合**
   - 後端 API 連接
   - 訂單資料獲取
   - 狀態更新

3. **通知功能**
   - Expo Notifications
   - 推播通知設定
   - 本地提醒

4. **狀態管理**
   - 考慮使用 Zustand 或 React Query
   - 訂單快取和同步

## ✅ 實作檢查清單

- [x] 環境設置（NativeWind + react-native-paper）
- [x] 類型定義和假數據
- [x] 共用組件
- [x] 登入頁面
- [x] 訂單列表頁和詳情頁
- [x] 提醒頁面
- [x] 設置頁面
- [x] 導航結構
- [x] 主題配置
- [x] 深色模式支援

## 🎓 技術亮點

1. **NativeWind 整合**：使用 Tailwind CSS 語法，開發效率高
2. **Material Design**：react-native-paper 提供完整的 Material 組件
3. **類型安全**：完整的 TypeScript 類型定義
4. **符合產品需求**：基於產品文件設計的真實場景假數據
5. **可擴展架構**：清晰的目錄結構，易於後續擴展

## 🤝 符合產品文件

基於 `OFlow_Order_Center_ShortDoc_v1.md` 實作：
- ✅ 全自動/半自動訂單模式
- ✅ LINE 對話自動生成訂單
- ✅ 7天/3天/當天提醒功能
- ✅ 訂單管理和追蹤
- ✅ 直覺的使用者介面

