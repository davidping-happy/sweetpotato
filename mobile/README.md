# 磐石烤地瓜 — 行動 App（Flutter）

將既有網站 [磐石烤地瓜 - 番薯阿嬤](https://davidping-happy.github.io/sweetpotato/docs/) 轉化為 **Android / iOS 雙平台 App**。

核心策略：**沿用既有後端 API（`server/`），不修改後端**；前端介面與行動端體驗以 Flutter 重新打造。

---

## 與既有系統的關係

```
既有後端 (server/，Node + Express)  ← 完全沿用，不更動
        ▲  HTTP / JSON
        │
   Flutter App (mobile/)            ← 本專案，新的行動端前台
```

App 直接呼叫既有 API：

| 功能 | 後端 API | 方法 |
|---|---|---|
| 商品列表 / 詳情 | `/api/products`、`/api/products/:id` | GET |
| 送出訂單 | `/api/orders` | POST |
| 電子報訂閱 | `/api/newsletter/subscribe` | POST |
| 加 LINE 好友 | LINE 官方帳號連結（App 內開啟） | — |

運費規則與後端一致：黃金地瓜滿 20 盒免運，否則 NT$150（金額仍以後端為準重新計算驗證）。

---

## 專案結構

```
mobile/lib/
├── config/app_config.dart      # API 網址、CDN、店家資訊、運費規則
├── models/                     # Product / CartItem / CustomerInfo / OrderResult
├── services/api_service.dart   # 與後端溝通的服務層
├── state/cart_provider.dart    # 購物車狀態（Provider / ChangeNotifier）
├── theme/app_theme.dart        # 品牌主題（暖色大地色系）
├── widgets/product_card.dart   # 商品卡片
├── screens/
│   ├── root_screen.dart        # 底部導覽（商店 / 購物車）
│   ├── home_screen.dart        # Hero + 商品 + 品牌故事 + 電子報 + LINE
│   ├── product_detail_screen.dart
│   ├── cart_screen.dart        # 購物車與金額計算
│   ├── checkout_screen.dart    # 結帳表單 + 通知偏好
│   └── order_success_screen.dart
└── main.dart
```

---

## 設定後端 API 網址（重要）

預設值：
- **Debug（開發）**：Android 模擬器 `http://10.0.2.2:3000`、iOS 模擬器 `http://localhost:3000`
- **Release（正式）**：`https://sweetpotato-api.onrender.com`（請改成你實際的後端網域）

切換方式（任一）：

1. 直接修改 `lib/config/app_config.dart` 的 `_productionApiBaseUrl`。
2. 編譯期覆寫（推薦，最高優先）：

```bash
flutter run   --dart-define=API_BASE_URL=https://你的後端網域
flutter build apk --dart-define=API_BASE_URL=https://你的後端網域
```

> 本機開發若連自架後端，請先啟動 `server/`（`npm install && npm start`，預設埠 3000）。

---

## 執行與建置

```bash
cd mobile
flutter pub get

# 開發執行（接到已連線的裝置 / 模擬器）
flutter run

# Android 安裝檔
flutter build apk --release            # 產出 build/app/outputs/flutter-apk/app-release.apk
flutter build appbundle --release      # 上架 Google Play 用 .aab

# iOS（需 macOS + Xcode）
flutter build ipa --release
```

### 環境需求

- Flutter 3.44+（已驗證 3.44.2 / Dart 3.12）
- **Android 建置**：Android Studio + Android SDK（含 platform-tools、build-tools）
- **iOS 建置**：macOS + Xcode + CocoaPods

> 目前這台 Windows 尚未安裝 Android SDK 與 Visual Studio。要實際打包 Android APK 需先安裝 Android Studio；iOS 打包需在 macOS 上進行。

---

## 驗證

```bash
flutter analyze   # 靜態分析（目前 0 issue）
flutter test      # 購物車邏輯單元測試
```

---

## 尚未涵蓋 / 後續可擴充

- **LINE 登入綁定**：目前提供「加 LINE 好友」連結。完整的 LINE Login（取得 `lineUserId` 帶入訂單）需設定 deep link / `flutter_web_auth_2` 搭配後端 `/api/line/login/start` callback，屬於後續工作。
- **訂單查詢頁**：後端 `/api/orders` 需 admin 驗證，屬店家後台功能，未納入顧客端 App。
- App 圖示與啟動畫面（目前為 Flutter 預設，可用 `flutter_launcher_icons` 套用品牌圖）。
