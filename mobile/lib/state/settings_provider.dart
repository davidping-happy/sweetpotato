import 'package:flutter/foundation.dart';

import '../models/site_settings.dart';
import '../services/api_service.dart';

/// 持有目前的店家設定。App 啟動時向後端抓取最新值，
/// 抓取前 / 失敗時都使用內建預設值，確保畫面永遠有內容。
class SettingsProvider extends ChangeNotifier {
  SiteSettings _settings = SiteSettings.defaults;
  bool _loaded = false;

  SiteSettings get settings => _settings;
  bool get loaded => _loaded;

  Future<SiteSettings> load(ApiService api) async {
    final fresh = await api.fetchSiteSettings();
    _settings = fresh;
    _loaded = true;
    notifyListeners();
    return fresh;
  }
}
