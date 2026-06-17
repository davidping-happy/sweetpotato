import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// 全 App 的環境設定集中於此。
///
/// 切換後端網址的方式（優先順序）：
/// 1. 編譯期傳入：`flutter run --dart-define=API_BASE_URL=https://你的網域`
/// 2. 否則使用本檔的預設值（開發 / 正式）。
class AppConfig {
  AppConfig._();

  /// 正式環境後端網址（請改成你實際部署的網域，例如 Render / Railway / VPS）。
  static const String _productionApiBaseUrl =
      'https://sweetpotato-api.onrender.com';

  /// 編譯期覆寫（最高優先）。
  static const String _dartDefineApiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');

  /// 後端 API 根網址（不含結尾斜線）。
  static String get apiBaseUrl {
    if (_dartDefineApiBaseUrl.isNotEmpty) {
      return _stripTrailingSlash(_dartDefineApiBaseUrl);
    }
    if (kReleaseMode) {
      return _stripTrailingSlash(_productionApiBaseUrl);
    }
    return _stripTrailingSlash(_localApiBaseUrl);
  }

  /// 本機開發用網址。
  /// - Android 模擬器要用 10.0.2.2 才能連到主機的 localhost。
  /// - iOS 模擬器 / 桌機可用 localhost。
  static String get _localApiBaseUrl {
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  /// 商品圖片 CDN 基底（與既有前端一致，使用 jsDelivr）。
  static const String imageCdnBase =
      'https://cdn.jsdelivr.net/gh/davidping-happy/sweetpotato@main/';

  /// 店家資訊（送單時帶給後端，並顯示於 App）。
  static const String shopName = '磐石烤地瓜 - 番薯阿嬤';
  static const String shopPhone = '0953830409';
  static const String shopEmail = 'sweetpotatograndmom@gmail.com';
  static const String shopAddress = '高雄市左營區華夏路576號';

  /// LINE 官方帳號。
  static const String lineOfficialId = '@437lnypi';
  static const String lineAddFriendUrl = 'https://line.me/R/ti/p/@437lnypi';

  /// 運費規則（與後端一致：黃金地瓜滿 20 盒免運，否則 NT$150）。
  static const int shippingFee = 150;
  static const int freeShippingSweetPotatoQty = 20;

  /// 將相對路徑的圖片轉成 CDN 絕對網址。
  static String toCdnImageUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return '$imageCdnBase${url.replaceFirst(RegExp(r'^/+'), '')}';
  }

  static String _stripTrailingSlash(String value) {
    return value.replaceFirst(RegExp(r'/+$'), '');
  }
}
