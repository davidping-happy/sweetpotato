import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/cart_provider.dart';
import '../theme/app_theme.dart';
import 'cart_screen.dart';
import 'home_screen.dart';

/// 底部導覽：首頁 / 購物車。
class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  int _index = 0;

  void _goToTab(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(onViewCart: () => _goToTab(1)),
      CartScreen(onContinueShopping: () => _goToTab(0)),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goToTab,
        backgroundColor: AppTheme.surface,
        indicatorColor: AppTheme.honey.withValues(alpha: 0.25),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: '商店',
          ),
          NavigationDestination(
            icon: _CartIcon(
              count: context.watch<CartProvider>().totalItems,
              filled: false,
            ),
            selectedIcon: _CartIcon(
              count: context.watch<CartProvider>().totalItems,
              filled: true,
            ),
            label: '購物車',
          ),
        ],
      ),
    );
  }
}

class _CartIcon extends StatelessWidget {
  const _CartIcon({required this.count, required this.filled});

  final int count;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Badge(
      isLabelVisible: count > 0,
      label: Text('$count'),
      backgroundColor: AppTheme.ember,
      child: Icon(filled
          ? Icons.shopping_cart
          : Icons.shopping_cart_outlined),
    );
  }
}
