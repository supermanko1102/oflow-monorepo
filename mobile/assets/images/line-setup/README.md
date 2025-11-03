# LINE 設定截圖說明

此資料夾用於存放 LINE Webhook 設定流程中的教學截圖。

## 📸 需要準備的截圖

請準備以下 4 張截圖（建議尺寸：1200x600 px）：

### 1. `channel-id-guide.png`
**用途：** 步驟 3 - 輸入 Channel ID 時顯示

**內容：**
- LINE Developers Console 的 Basic settings 頁面
- 用紅框或箭頭標註 **Channel ID** 位置
- 確保 Channel ID 清晰可見

**範例：**
```
┌────────────────────────────────────┐
│ LINE Developers Console            │
│                                    │
│ Basic settings                     │
│ ┌──────────────────────────────┐  │
│ │ Channel ID  ←── 標註這裡      │  │
│ │ 2008352338                   │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

### 2. `channel-secret-guide.png`
**用途：** 步驟 3 - 輸入 Channel Secret 時顯示

**內容：**
- LINE Developers Console 的 Basic settings 頁面
- 用紅框或箭頭標註 **Channel Secret** 位置
- 顯示「Show」按鈕或已顯示的 Secret

**範例：**
```
┌────────────────────────────────────┐
│ Channel Secret                     │
│ ┌──────────────────────────────┐  │
│ │ abcdef1234... [ Show ]       │  │  ←── 標註這裡
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

### 3. `access-token-guide.png`
**用途：** 步驟 3 - 輸入 Access Token 時顯示

**內容：**
- LINE Developers Console 的 **Messaging API** 分頁
- 用紅框標註 **Channel access token (long-lived)** 區塊
- 特別標註 **Issue** 按鈕（如果 token 為空）
- 或標註已生成的 token

**範例：**
```
┌────────────────────────────────────┐
│ Messaging API                      │
│                                    │
│ Channel access token (long-lived) │
│ ┌──────────────────────────────┐  │
│ │ ABC123... [ Issue ] [ Show ] │  │  ←── 標註這裡
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

### 4. `webhook-manual-guide.png` (**備用**)
**用途：** 步驟 5 - 當自動設定失敗時顯示手動教學

**內容：**
- LINE Developers Console 的 **Messaging API** 分頁
- 用紅框標註 **Webhook settings** 區塊
- 標註 **Webhook URL** 輸入框
- 標註 **Use webhook** 開關
- 標註 **Update** 按鈕

**範例：**
```
┌────────────────────────────────────┐
│ Webhook settings                   │
│ ┌──────────────────────────────┐  │
│ │ Webhook URL                  │  │  ←── 標註 1
│ │ [輸入框]              Update │  │  ←── 標註 2
│ │ Use webhook  [開關]          │  │  ←── 標註 3
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## 📝 截圖要求

1. **格式：** PNG（支援透明背景更好）
2. **尺寸：** 建議 1200x600 px（4:2 比例）或 1000x500 px
3. **檔案大小：** < 500KB（避免載入慢）
4. **標註：** 使用紅色框或箭頭清楚標示重點位置
5. **語言：** 繁體中文或英文介面皆可

---

## 🎨 標註工具推薦

- **macOS：** 截圖後使用內建的標記工具
- **Windows：** Snipping Tool 或 Snagit
- **線上工具：** Photopea, Canva

---

## 🔄 如何替換佔位符

當你準備好截圖後：

1. 將截圖命名為對應的檔案名稱
2. 放入 `/mobile/assets/images/line-setup/` 資料夾
3. 覆蓋現有的佔位符檔案
4. 重新啟動 Expo Dev Server

---

## ⚠️ 注意事項

- 請確保截圖中不包含敏感資訊（如真實的 Access Token）
- 可以使用範例數據或模糊處理敏感部分
- 截圖應該清晰且易於閱讀（避免過度壓縮）

---

**準備好截圖後，將檔案放入此資料夾即可自動生效！**

