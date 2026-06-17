import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../state/cart_provider.dart';
import '../theme/app_theme.dart';

/// 商品詳細頁。
class ProductDetailScreen extends StatelessWidget {
  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.onViewCart,
  });

  final Product product;
  final VoidCallback onViewCart;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: AppTheme.charcoal,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: product.imageUrl.isEmpty
                  ? Container(color: AppTheme.emberDark)
                  : CachedNetworkImage(
                      imageUrl: product.imageUrl,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) =>
                          Container(color: AppTheme.emberDark),
                    ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ),
                      Chip(label: Text(product.category)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'NT\$${product.price}',
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.emberDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    product.description,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.7,
                      color: AppTheme.clay,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (!product.inStock)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text('目前無庫存',
                          style: TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ElevatedButton.icon(
            onPressed: product.inStock
                ? () {
                    context.read<CartProvider>().add(product);
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(
                          content: Text('已將「${product.name}」加入購物車'),
                          duration: const Duration(milliseconds: 1400),
                          action: SnackBarAction(
                            label: '查看購物車',
                            textColor: AppTheme.honey,
                            onPressed: () {
                              Navigator.of(context).pop();
                              onViewCart();
                            },
                          ),
                        ),
                      );
                  }
                : null,
            icon: const Icon(Icons.add_shopping_cart),
            label: Text(product.inStock ? '加入購物車' : '暫時售完'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
            ),
          ),
        ),
      ),
    );
  }
}
