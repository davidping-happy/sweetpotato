# 磐石烤地瓜 App — 內部測試安裝說明

> 給測試者的操作小抄。照著步驟就能把測試版安裝到 Android 手機。

## 重要觀念（先看這個）

- 這是**內部測試版**，只有**被加入名單的 Gmail** 才裝得到。
- 你手機 Google Play 登入的帳號，**必須是提供給店家、已加入測試名單的那個 Gmail**。
- 剛發布的新版本需要**幾分鐘～1~2 小時**散佈，若一開始顯示「找不到項目」屬正常，稍後再試即可。

---

## 安裝步驟

### 步驟 1：確認手機 Play 帳號
1. 打開手機的 **Google Play 商店** App
2. 右上角點頭像 → 確認顯示的 Gmail，就是**已加入測試名單**的那個
3. 若不是 → 切換／新增成正確的 Gmail

### 步驟 2：成為測試者
1. 用手機開啟測試連結（見下方「下載連結」）
2. 點 **Become a tester / 成為測試人員**
3. 看到 **「You're a tester for com.panshi.sweetpotato_app」** 即成功

### 步驟 3：下載安裝
1. 在同一頁點 **Download test app / 在 Google Play 下載**
2. 進到 App 頁面後按 **安裝 / Install**
3. 裝好按 **開啟 / Open**

---

## 下載連結

**測試者加入連結（成為測試者用）：**

```
https://play.google.com/apps/internaltest/4700252716227484748
```

**App 直接連結（成為測試者後可用）：**

```
https://play.google.com/store/apps/details?id=com.panshi.sweetpotato_app
```

---

## 常見問題

| 狀況 | 解法 |
|------|------|
| App not available / 尚未受邀 | 手機登入的 Gmail 不在名單，或名單未套用。確認帳號正確，並請店家在 Testers 分頁「打勾套用 + Save changes」 |
| 找不到項目 / Item not found | 新版本散佈中，等 15~60 分鐘再點「Download test app」或重新整理 |
| 名稱顯示 `com.panshi.sweetpotato_app (unreviewed)` | 正常，商店資訊完成審核後會顯示「磐石烤地瓜」 |
| 想改看正式版 | 先移除測試版，再安裝公開版（若已上架） |

---

## 給店家：如何新增測試者

1. Play Console → **Test and release → Testing → Internal testing → Testers 分頁**
2. 點清單 **磐石測試群** → **Add email addresses** 貼上對方 Gmail（可多行，逗號分隔）→ 儲存
3. 回 Testers 分頁確認清單**已打勾** → 按 **Save changes**
4. 把上方「測試者加入連結」傳給對方

- 內部測試上限 **100 人**，**無天數限制**。
- 內部測試**不計入**正式公開所需的「12 人 × 14 天封閉測試」門檻。
