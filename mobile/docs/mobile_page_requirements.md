# OFlow Mobile App – 主要五個頁面功能與需求

以下整理目前 `mobile/app/(main)/(tabs)` 底下五個核心頁面的用途、主要功能區塊與具體需求。內容依據現有 React Native / Expo Router 實作（`overview.tsx`, `orders.tsx`, `inbox.tsx`, `customers.tsx`, `settings.tsx`）與 `MainLayout` 統一框架整理，可做為產品/工程對齊文件。

## 1. 首頁總覽（overview.tsx）

- **定位**：店主與團隊登入後的個人化 Dashboard，需在單一頁面同時顯示營運模式、營收/訂單指標、提醒與最新訂單。
- **主要功能**
  - 營運模式切換：`全自動 / 半自動` pill segmented control，切換後顯示模式描述，並提示對應流程（AI 全自動處理或需人工確認）。
 
## 2. 訂單管理頁（orders.tsx）

- **定位**：整合訂單與商品管理；透過主分頁切換 `訂單` 與 `商品` 情境。

## 3. 對話收件匣（inbox.tsx）

- **定位**：集中檢視 LINE 對話，分流 AI 無法處理的例外與 AI 已自動建單紀錄。
- **主要功能**
  - Header tab：`例外處理 / 自動紀錄` 控制顯示內容並更新 subtitle（例外數或自動紀錄數）。
  - 例外卡：
    - 顧客資訊、最新時間。
    - 問題說明卡（issue、hint）。
    - 缺少欄位 tags；最後訊息 snippet。
    - 行動按鈕：回覆、建單（含 primary 樣式）。
  - 自動紀錄卡：
    - 顧客、訂單編號、建立時間。
    - 取貨資訊、金額、AI 回覆 snippet。
    - 點擊訂單編號的 CTA 可後續串連到訂單詳情。

## 4. 顧客管理頁（customers.tsx）

- **定位**：提供顧客概覽與詳細清單，支援針對 VIP、回訪率、行動建議等經營需求。
- **主要功能**
  - Tab：`概覽 / 清單`，切換視圖。
  - 概覽
    - Summary Cards（顧客總數、本週新增、回訪率、高價值顧客）。
    - 行動建議區：列出建議（icon、標題、detail、執行按鈕），作為行銷任務提示。
  - 清單
    - 顧客卡片：姓名、電話（無資料時提示）、標籤、總訂單、總消費、最後訂單時間、備註與「查看對話」。

## 5. 設定頁（settings.tsx）

- **定位**：集中帳戶、團隊、通知、整合及資料權限設定。
- **主要功能**
  - Section 化管理：帳戶與團隊、通知與提醒、整合服務、資料與支援。
  - 每個 `SettingRow` 含 icon、label、detail、右側 action button（如編輯、管理、設定、訂閱、查看、連結、匯出、開啟）。
  - 危險操作（danger actions）：登出、退出團隊、刪除帳號，透過 `MainLayout` 的 `showDangerTrigger` 彈出表單。

---

### 後續建議
- 以此文檔為基準補齊 API 需求（輸入/輸出結構、錯誤狀態）。
- 製作 Flow 圖說明 tab 切換與 CTA 對應流程，協助設計與工程跨部門理解。
- 將 mock data 逐步替換為 hooks/service 呼叫，並於 PR 中引用本需求書章節，確保開發與需求同步。
