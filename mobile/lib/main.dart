import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/root_screen.dart';
import 'services/api_service.dart';
import 'state/cart_provider.dart';
import 'state/settings_provider.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const SweetPotatoApp());
}

class SweetPotatoApp extends StatefulWidget {
  const SweetPotatoApp({super.key});

  @override
  State<SweetPotatoApp> createState() => _SweetPotatoAppState();
}

class _SweetPotatoAppState extends State<SweetPotatoApp> {
  final ApiService _api = ApiService();
  final CartProvider _cart = CartProvider();
  final SettingsProvider _settings = SettingsProvider();

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  /// 啟動時抓取最新店家設定，並把運費規則套到購物車。
  Future<void> _bootstrap() async {
    final settings = await _settings.load(_api);
    _cart.configureShipping(settings.shipping);
  }

  @override
  void dispose() {
    _api.dispose();
    _cart.dispose();
    _settings.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: _api),
        ChangeNotifierProvider<CartProvider>.value(value: _cart),
        ChangeNotifierProvider<SettingsProvider>.value(value: _settings),
      ],
      child: MaterialApp(
        title: '磐石烤地瓜',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        home: const RootScreen(),
      ),
    );
  }
}
