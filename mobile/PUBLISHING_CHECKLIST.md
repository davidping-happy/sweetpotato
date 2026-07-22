# 磐石烤地瓜 — Google Play 上架設定對照表

> Dashboard →「Finish setting up your app」逐項填寫用。每項填完會打勾，全部完成後
> 封閉測試的「送審」與正式版才會解鎖。答案已依本 App 實際情況備好。

---

## A. App content（內容宣告）

### 1. Set privacy policy（隱私政策）
貼上網址：
```
https://davidping-happy.github.io/sweetpotato/docs/privacy.html
```

### 2. App access / Sign in details（存取權限）
- 選 **「All functionality is available without special access」**
  （App 不需登入即可瀏覽商品、下單，無隱藏功能）

### 3. Ads（廣告）
- 選 **「No, my app does not contain ads」**（本 App 無廣告）

### 4. Content rating（內容分級）— 問卷
- 聯絡 Email：`sweetpotatograndmom@gmail.com`
- 類別：選 **「Utility, Productivity, Communication, or Other」**（非遊戲）
- 所有「暴力／性／不當語言／管制物品／賭博」等問題 → **全部 No**
- 結果：分級為 **「所有人 / Everyone」**

### 5. Target audience and content（目標對象）
- 目標年齡層：勾選 **18 歲以上（18 and over）**
- 「Is your app appealing to children?（是否吸引兒童）」 → **No**
  （避免觸發兒童政策 Families Policy）

### 6. Data safety（資料安全）⭐最重要，據實填
**Does your app collect or share user data? → Yes（有收集）**

收集的資料類型（每項：Collected = Yes、Shared = No、加密傳輸 = Yes）：
| 資料 | 收集 | 分享給第三方 | 必填/選填 | 目的 |
|------|:---:|:---:|------|------|
| Name 姓名 | ✅ | ❌ | 必填 | App functionality（處理訂單） |
| Phone number 電話 | ✅ | ❌ | 必填 | App functionality（處理訂單／聯絡） |
| Email address | ✅ | ❌ | 選填 | App functionality（訂單確認信） |
| Address 地址 | ✅ | ❌ | 必填 | App functionality（宅配出貨） |

安全性問題：
- **Is all user data encrypted in transit? → Yes**（走 HTTPS）
- **Do you provide a way for users to request data deletion? → Yes**
  - 刪除方式：來信 `sweetpotatograndmom@gmail.com` 提出

### 7. Government apps → **No**（不是政府 App）

### 8. Financial features → **My app doesn't provide any financial features**
（App 不含銀行／貸款／投資／加密貨幣等金融功能）

### 9. Health → **No**（無健康相關功能）

---

## B. 商店呈現

### 10. Select an app category and provide contact details
- **App category（類別）**：`Food & Drink（飲食）`
- **Contact email**：`sweetpotatograndmom@gmail.com`
- **Phone（選填）**：`0953830409`
- **Website**：`https://davidping-happy.github.io/sweetpotato/docs/`

### 11. Set up your store listing（商店資訊）
- **App name**：`磐石烤地瓜`
- **簡短說明（80 字內）**：見 `store-listing.md`
- **完整說明（4000 字內）**：見 `store-listing.md`
- **App icon（512×512）**：`store/play-icon-512.png`
- **Feature graphic（1024×500）**：`store/feature-graphic.png`
- **Phone screenshots**：`store/screenshots/01~04.png`（4 張）

---

## C. 封閉測試軌道（Closed testing - Alpha）

### 12. Select countries and regions（國家/地區）
- 至少加入 **台灣（Taiwan）**；想更廣可加其他國家或全選。

### 13. Testers（測試者）
- 已設定清單 `磐石測試群`（確認裡面有 **12~15 位** Gmail，且清單已打勾套用）。

### 14. Create a new release → 送審
- App bundle 沿用已上傳的 `1.0.0 (1)`（若要求新版本號，改打包 version +1）。
- Review release → **Send the release to Google for review**。

---

## D. 之後（滿足條件才會出現）
- 12 位測試者實際 opt-in、連續 **14 天** → Dashboard 出現 **Apply for production access**
- 申請正式版 → Google 審核 → 對所有人公開。

> 注意：14 天內測試人數不能低於 12，建議多找 2~3 人緩衝。
