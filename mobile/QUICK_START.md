# 🚀 OFlow 訂單中心 - 快速開始

## 安裝依賴（如果尚未安裝）

```bash
cd mobile
npm install
```

## 啟動應用

### Web 版本（最快）
```bash
npm start -- --web
```

### iOS 模擬器
```bash
npm run ios
```

### Android 模擬器
```bash
npm run android
```

## 📱 功能導覽

### 1. 首頁（登入）
- 點擊「使用 LINE 登入」按鈕
- 假登入會自動跳轉到訂單頁面

### 2. 訂單列表
- 查看所有訂單
- 使用篩選器（全部/待處理/已完成）
- 點擊任一訂單查看詳情

### 3. 訂單詳情
- 查看完整訂單資訊
- 查看 LINE 對話記錄
- 使用操作按鈕（UI only）

### 4. 提醒通知
- 查看按時間分組的提醒
- 紅點表示未讀提醒
- 點擊跳轉到對應訂單

### 5. 設置
- 切換接單模式（全自動/半自動）
- 調整通知偏好
- 查看帳號資訊

## 🎨 UI 特色

- **Material Design**：使用 react-native-paper 組件庫
- **Tailwind CSS**：透過 NativeWind 使用 Tailwind 語法
- **深色模式**：完整支援深色模式
- **品牌色彩**：LINE 綠色主題 (#00B900)

## 🗂️ 假數據說明

### 訂單數據 (`data/mockOrders.ts`)
- 6 筆訂單：4 筆待處理、2 筆已完成
- 包含全自動和半自動訂單範例
- 包含 LINE 對話記錄

### 提醒數據 (`data/mockReminders.ts`)
- 4 筆提醒：今天、3天內、7天內
- 包含已讀/未讀狀態

## 🔧 技術架構

```
技術棧：
├── React Native 0.81.4
├── Expo SDK 54
├── React 19.1.0
├── TypeScript 5.9.2
├── NativeWind (Tailwind CSS)
└── react-native-paper (Material Design)

路由架構：
├── Expo Router (File-based)
├── Tab Navigation (4 個主頁面)
└── Stack Navigation (訂單詳情)
```

## 💡 下一步

1. **整合 LINE Login SDK**
   - 實作真實的 OAuth 流程
   - Token 存儲和管理

2. **連接後端 API**
   - 訂單 CRUD 操作
   - 即時同步

3. **推播通知**
   - Expo Notifications
   - 排程提醒

4. **狀態管理**
   - 加入 React Query 或 Zustand
   - 優化資料快取

## 📚 相關文件

- `IMPLEMENTATION.md` - 完整實作說明
- `OFlow_Order_Center_ShortDoc_v1.md` - 產品需求文件
- [Expo Router 文檔](https://docs.expo.dev/router/introduction/)
- [NativeWind 文檔](https://www.nativewind.dev/)
- [react-native-paper 文檔](https://callstack.github.io/react-native-paper/)

## ❓ 常見問題

### Q: 為什麼使用 NativeWind 而不是原生 StyleSheet？
A: NativeWind 提供 Tailwind CSS 的開發體驗，開發速度更快，且易於維護。

### Q: 為什麼選擇 react-native-paper？
A: 它是 2025 年最受歡迎的 React Native UI 庫之一，提供完整的 Material Design 組件，類似 Web 開發中的 shadcn/ui。

### Q: 如何修改品牌顏色？
A: 修改 `tailwind.config.js` 中的 `colors.line` 和 `app/_layout.tsx` 中的主題配置。

### Q: 如何新增頁面？
A: 在 `app/` 目錄下創建新的 `.tsx` 文件，Expo Router 會自動識別並創建路由。

## 🎉 開始探索

現在你可以開始探索 OFlow 訂單中心的 UI 了！所有功能都是假數據驅動的，可以自由測試各種互動。

