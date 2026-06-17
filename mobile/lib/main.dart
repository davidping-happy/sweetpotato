import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/root_screen.dart';
import 'services/api_service.dart';
import 'state/cart_provider.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const SweetPotatoApp());
}

class SweetPotatoApp extends StatelessWidget {
  const SweetPotatoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(
          create: (_) => ApiService(),
          dispose: (_, service) => service.dispose(),
        ),
        ChangeNotifierProvider<CartProvider>(create: (_) => CartProvider()),
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
