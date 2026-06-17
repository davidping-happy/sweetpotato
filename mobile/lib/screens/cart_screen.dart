import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../models/cart_item.dart';
import '../state/cart_provider.dart';
import '../theme/app_theme.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key, required this.onContinueShopping});

  final VoidCallback onContinueShopping;

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('購物車',
            style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          if (!cart.isEmpty)
            TextButton(
              onPressed: () => _confirmClear(context),
              child: const Text('清空'),
            ),
        ],
      ),
      body: cart.isEmpty
          ? _EmptyCart(onContinueShopping: onContinueShopping)
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              children: [
                for (final item in cart.items)
                  _CartItemTile(item: item, key: ValueKey(item.product.id)),
              ],
            ),
      bottomNavigationBar:
          cart.isEmpty ? null : _CartSummaryBar(cart: cart),
    );
  }

  void _confirmClear(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('清空購物車？'),
        content: const Text('將移除購物車內所有商品。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () {
              context.read<CartProvider>().clear();
              Navigator.of(dialogContext).pop();
            },
            child: const Text('清空'),
          ),
        ],
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart({required this.onContinueShopping});

  final VoidCallback onContinueShopping;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shopping_bag_outlined,
              size: 72, color: AppTheme.clay.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          const Text('購物車是空的',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.charcoal)),
          const SizedBox(height: 6),
          const Text('快去挑選阿嬤的好料吧！',
              style: TextStyle(color: AppTheme.clay)),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: onContinueShopping,
            icon: const Icon(Icons.storefront),
            label: const Text('前往商店'),
          ),
        ],
      ),
    );
  }
}

class _CartItemTile extends StatelessWidget {
  const _CartItemTile({required this.item, super.key});

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 72,
                height: 72,
                child: item.product.imageUrl.isEmpty
                    ? Container(color: AppTheme.honey.withValues(alpha: 0.15))
                    : CachedNetworkImage(
                        imageUrl: item.product.imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (_, _, _) => Container(
                            color: AppTheme.honey.withValues(alpha: 0.15)),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.product.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.charcoal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      InkWell(
                        onTap: () => cart.remove(item.product.id),
                        borderRadius: BorderRadius.circular(20),
                        child: const Padding(
                          padding: EdgeInsets.all(4),
                          child: Icon(Icons.delete_outline,
                              size: 20, color: AppTheme.clay),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _QtyControl(item: item),
                      Text(
                        'NT\$${item.lineTotal}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.emberDark,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyControl extends StatelessWidget {
  const _QtyControl({required this.item});

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cream,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.charcoal.withValues(alpha: 0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _QtyButton(
            icon: Icons.remove,
            onTap: () => cart.updateQty(item.product.id, -1),
          ),
          SizedBox(
            width: 32,
            child: Text(
              '${item.qty}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          _QtyButton(
            icon: Icons.add,
            onTap: () => cart.updateQty(item.product.id, 1),
          ),
        ],
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, size: 16, color: AppTheme.emberDark),
      ),
    );
  }
}

class _CartSummaryBar extends StatelessWidget {
  const _CartSummaryBar({required this.cart});

  final CartProvider cart;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          border: Border(
            top: BorderSide(color: AppTheme.charcoal.withValues(alpha: 0.08)),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _SummaryRow(label: '商品小計', value: 'NT\$${cart.subtotal}'),
            const SizedBox(height: 4),
            _SummaryRow(
              label: '運費',
              value: cart.shipping == 0 ? '免運費 🎉' : 'NT\$${cart.shipping}',
              highlight: cart.shipping == 0,
            ),
            if (cart.shipping > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '黃金地瓜滿 ${AppConfig.freeShippingSweetPotatoQty} 盒享免運優惠',
                    style: const TextStyle(
                        color: AppTheme.clay, fontSize: 12),
                  ),
                ),
              ),
            const Divider(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('總計',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700)),
                Text(
                  'NT\$${cart.total}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.emberDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const CheckoutScreen()),
                  );
                },
                icon: const Icon(Icons.arrow_forward),
                label: const Text('前往結帳'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.clay)),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: highlight ? AppTheme.success : AppTheme.charcoal,
          ),
        ),
      ],
    );
  }
}
