# LINE 連動設定指南（在 LINE 內瀏覽 + 商品卡片 + 圖文選單）

本專案已內建三大功能，本文件說明在 LINE Developers / 後端需要做的設定。

| 功能 | 使用者體驗 | 需要的設定 |
|---|---|---|
| **A. LIFF 商店** | 在 LINE 內建瀏覽器直接逛網頁商店，自動帶入身分 | `LINE_LIFF_ID` |
| **B. 促銷大圖（魚中魚版型）** | 在聊天室輸入「菜單／商品／優惠」自動回覆一張可點擊的促銷大海報，點圖即在 LINE 內開商店 | `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、Webhook URL |
| **C. 圖文選單 Rich Menu** | 聊天室下方固定選單：逛商店 / 看菜單 / 聯絡我們 | 同 B + 執行安裝腳本 |

---

## 前置：兩種頻道

LINE Developers Console 需要兩個 Channel（同一個 Provider 底下）：

1. **Messaging API Channel**（官方帳號）→ 提供 `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`（功能 B、C）
2. **LINE Login Channel** → 在其中新增 **LIFF**，提供 `LINE_LIFF_ID`（功能 A）

> 後端環境變數請設定在你的部署平台（Render / Railway / VPS）。本機則寫在 `server/.env`。

---

## A. LIFF 商店（在 LINE 內瀏覽網頁）

1. LINE Developers → 你的 **LINE Login** 頻道 → 分頁 **LIFF** → **Add**。
2. 設定：
   - **Endpoint URL**：`https://davidping-happy.github.io/sweetpotato/docs/index.html`
   - **Size**：`Full`
   - 開啟 **Scope**：`profile`、`openid`
3. 建立後會得到 **LIFF ID**（格式如 `1234567890-AbCdEfGh`）。
4. 後端設定 `LINE_LIFF_ID=<剛剛的 LIFF ID>`。

完成後：
- 網頁在 LINE 內開啟時會自動取得使用者身分（免再按「綁定 LINE」）。
- 商品卡片與圖文選單的「逛商店」按鈕會用 `https://liff.line.me/<LIFF_ID>`，在 LINE 內開啟。

---

## B. 促銷大圖（魚中魚版型，webhook）

1. **Messaging API** 頻道 → 取得 **Channel access token（long-lived）**填入 `LINE_CHANNEL_ACCESS_TOKEN`。
2. 同頁的 **Channel secret** 填入 `LINE_CHANNEL_SECRET`（用於 webhook 簽章驗證）。
3. **Messaging API** 設定頁：
   - **Webhook URL** 設為：`https://<你的後端網域>/api/line/webhook`
     （例：`https://sweetpotato-api.onrender.com/api/line/webhook`）
   - 開啟 **Use webhook**。
   - 關閉 **自動回應訊息**（Auto-reply），避免蓋掉我們的回覆。
4. 促銷大圖：預設使用 `photo/promo-banner.jpg`（已內附），透過 jsDelivr CDN 提供，
   **記得把此圖 commit 並 push 到 GitHub** CDN 才讀得到；或在 `LINE_PROMO_IMAGE_URL` 自訂公開 HTTPS 圖片網址。
5. 用手機加官方帳號好友，在聊天室輸入「菜單／商品／優惠」→ 會收到可點擊的促銷大海報，點圖即在 LINE 內開商店。

> 關鍵字：
> - 大圖海報：菜單 / 商品 / 產品 / 購買 / 訂購 / 地瓜 / 優惠 / 活動 / menu / shop…
> - 商品列表卡片（輪播）：列表 / 清單 / 全部商品 / list
> - 歡迎導引：你好 / 客服 / help

---

## C. 圖文選單（Rich Menu）

確認 `server/.env` 已有 `LINE_CHANNEL_ACCESS_TOKEN`（建議也設好 `LINE_LIFF_ID`），然後執行：

```bash
node scripts/setup-line-richmenu.js
```

- 預設使用 `scripts/richmenu.jpg`（已內附，2500x843）。
- 要換圖：`node scripts/setup-line-richmenu.js 你的圖片.jpg`
- 三個按鈕：**逛商店**（開 LIFF）、**看菜單**（傳「菜單」）、**聯絡我們**（傳「客服」）。

---

## 主動推播促銷大圖（選用，魚中魚版型）

```bash
node scripts/push-line-products.js            # 廣播促銷大圖給所有好友
node scripts/push-line-products.js <userId>   # 只推給單一使用者
```

> broadcast 有每月免費則數上限，請斟酌使用。

---

## 驗證

- `GET https://<後端>/api/line/webhook` → 回傳 `{ status: "ok", messagingConfigured: true }`。
- `GET https://<後端>/api/config` → 應包含 `lineLiffId`、`lineLiffIdValid: true`。
