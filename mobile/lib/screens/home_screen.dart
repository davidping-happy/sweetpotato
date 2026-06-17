import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../state/cart_provider.dart';
import '../state/settings_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

/// 沿用既有網站的版面：Hero → 精選商品 → 品牌故事 → 電子報 → LINE → 聯絡資訊。
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onViewCart});

  final VoidCallback onViewCart;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Product>> _productsFuture;

  /// API 無法連線時的備援商品（與後端 seed 一致）。
  static const List<Product> _fallbackProducts = [
    Product(
      id: 'local-1',
      name: '台農57號黃金地瓜',
      description: '嚴選在地優質地瓜，炭火慢烤，糖蜜流溢，肉質鬆軟綿密。',
      price: 100,
      category: '烤地瓜',
      inStock: true,
      imageUrl: '${AppConfig.imageCdnBase}photo/002.jpg',
      badge: '熱銷首選',
    ),
    Product(
      id: 'local-2',
      name: '手作地瓜糖（小盒）',
      description: '酥脆地瓜片與蜜地瓜，把家鄉的溫暖帶走，追劇旅遊的最佳良伴。',
      price: 45,
      category: '零食',
      inStock: true,
      imageUrl: '${AppConfig.imageCdnBase}photo/005.png',
    ),
    Product(
      id: 'local-3',
      name: '手作地瓜糖（大盒）',
      description: '酥脆地瓜片與蜜地瓜，把家鄉的溫暖帶走，追劇旅遊的最佳良伴。',
      price: 65,
      category: '零食',
      inStock: true,
      imageUrl: '${AppConfig.imageCdnBase}photo/005.png',
    ),
    Product(
      id: 'local-4',
      name: '古早味茶葉蛋（1粒）',
      description: '慢熬24小時，五香漢方藥材入味，每一口都透著溫潤香氣。',
      price: 13,
      category: '蛋',
      inStock: true,
      imageUrl: '${AppConfig.imageCdnBase}photo/004.png',
    ),
    Product(
      id: 'local-5',
      name: '古早味茶葉蛋（2粒）',
      description: '慢熬24小時，五香漢方藥材入味，每一口都透著溫潤香氣。',
      price: 25,
      category: '蛋',
      inStock: true,
      imageUrl: '${AppConfig.imageCdnBase}photo/004.png',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _productsFuture = _loadProducts();
  }

  Future<List<Product>> _loadProducts() async {
    try {
      final products = await context.read<ApiService>().fetchProducts();
      if (products.isEmpty) return _fallbackProducts;
      return products;
    } catch (_) {
      return _fallbackProducts;
    }
  }

  Future<void> _refresh() async {
    final future = _loadProducts();
    setState(() => _productsFuture = future);
    await future;
  }

  void _addToCart(Product product) {
    context.read<CartProvider>().add(product);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('已將「${product.name}」加入購物車'),
          duration: const Duration(milliseconds: 1400),
          action: SnackBarAction(
            label: '查看',
            textColor: AppTheme.honey,
            onPressed: widget.onViewCart,
          ),
        ),
      );
  }

  void _openDetail(Product product) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          product: product,
          onViewCart: widget.onViewCart,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppTheme.ember,
        child: FutureBuilder<List<Product>>(
          future: _productsFuture,
          builder: (context, snapshot) {
            final products = snapshot.data ?? const <Product>[];
            final loading =
                snapshot.connectionState == ConnectionState.waiting;
            return CustomScrollView(
              slivers: [
                _HeroSliverAppBar(),
                const SliverToBoxAdapter(child: _SectionHeader(
                  label: 'Our Selection',
                  title: '阿嬤的手工精選',
                )),
                if (loading)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 48),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  )
                else
                  _ProductSliverGrid(
                    products: products,
                    onAdd: _addToCart,
                    onTap: _openDetail,
                  ),
                SliverToBoxAdapter(child: _BrandStory()),
                SliverToBoxAdapter(
                  child: _NewsletterSection(),
                ),
                SliverToBoxAdapter(child: _LineSection()),
                SliverToBoxAdapter(child: _ContactFooter()),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _HeroSliverAppBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>().settings;
    final content = settings.content;
    return SliverAppBar(
      expandedHeight: 320,
      pinned: true,
      backgroundColor: AppTheme.charcoal,
      foregroundColor: Colors.white,
      title: const Text(
        '磐石烤地瓜',
        style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: '${AppConfig.imageCdnBase}photo/001.webp',
              fit: BoxFit.cover,
              errorWidget: (_, _, _) =>
                  Container(color: AppTheme.emberDark),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black54, Colors.black87],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 26),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.honey.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      content.heroTag,
                      style: const TextStyle(
                        color: AppTheme.charcoal,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    content.heroTitle,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      height: 1.2,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    content.heroSubtitle,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                    ),
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

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label, required this.title});

  final String label;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: AppTheme.ember,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductSliverGrid extends StatelessWidget {
  const _ProductSliverGrid({
    required this.products,
    required this.onAdd,
    required this.onTap,
  });

  final List<Product> products;
  final void Function(Product) onAdd;
  final void Function(Product) onTap;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final crossAxisCount = width >= 720 ? 3 : 2;

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          mainAxisExtent: 300,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            return ProductCard(
              product: product,
              onAddToCart: () => onAdd(product),
              onTap: () => onTap(product),
            );
          },
          childCount: products.length,
        ),
      ),
    );
  }
}

class _BrandStory extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final content = context.watch<SettingsProvider>().settings.content;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.charcoal,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: CachedNetworkImage(
                imageUrl: '${AppConfig.imageCdnBase}photo/003.png',
                fit: BoxFit.cover,
                errorWidget: (_, _, _) =>
                    Container(color: AppTheme.emberDark),
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'OUR STORY',
            style: TextStyle(
              color: AppTheme.honey,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            content.storyTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            content.storyBody,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              height: 1.6,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: const [
              Expanded(
                child: _StoryStat(label: '阿嬤精神', value: '無添加、真材實料'),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _StoryStat(label: '產地直送', value: '雲林水林優質契作'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StoryStat extends StatelessWidget {
  const _StoryStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppTheme.honey.withValues(alpha: 0.9),
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _NewsletterSection extends StatefulWidget {
  @override
  State<_NewsletterSection> createState() => _NewsletterSectionState();
}

class _NewsletterSectionState extends State<_NewsletterSection> {
  final _controller = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _subscribe() async {
    FocusScope.of(context).unfocus();
    final email = _controller.text.trim();
    if (email.isEmpty) {
      _showSnack('請先輸入 Email');
      return;
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      _showSnack('Email 格式不正確，請重新輸入');
      return;
    }
    setState(() => _submitting = true);
    try {
      final message =
          await context.read<ApiService>().subscribeNewsletter(email);
      if (!mounted) return;
      _controller.clear();
      _showSnack(message);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnack(e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.honey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '接收阿嬤的溫暖報',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '訂閱電子報，第一時間獲得季節新品與專屬會員優惠。',
            style: TextStyle(color: AppTheme.clay, height: 1.5),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _controller,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(hintText: '輸入你的 Email'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting ? null : _subscribe,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('立即訂閱'),
            ),
          ),
        ],
      ),
    );
  }
}

class _LineSection extends StatelessWidget {
  Future<void> _openLine(BuildContext context, String addFriendUrl,
      String officialId) async {
    final messenger = ScaffoldMessenger.of(context);
    final uri = Uri.parse(addFriendUrl);

    // 不使用 canLaunchUrl（在 Android 受套件可見性限制常誤回 false），
    // 直接嘗試開啟，並提供退路。
    for (final mode in [
      LaunchMode.externalApplication,
      LaunchMode.platformDefault,
    ]) {
      try {
        if (await launchUrl(uri, mode: mode)) return;
      } catch (_) {
        // 試下一種模式
      }
    }

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text('無法自動開啟 LINE，請在 LINE 搜尋好友 ID：$officialId'),
        duration: const Duration(seconds: 4),
      ));
  }

  @override
  Widget build(BuildContext context) {
    final line = context.watch<SettingsProvider>().settings.line;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF06C755).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '加入好友，線上訂購更方便',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '加入「磐石烤地瓜」LINE 好友（${line.officialId}），優惠通知一手掌握！',
            style: const TextStyle(color: AppTheme.clay, height: 1.5),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () =>
                  _openLine(context, line.addFriendUrl, line.officialId),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF06C755),
              ),
              icon: const Icon(Icons.chat_bubble, color: Colors.white),
              label: const Text('加入 LINE 好友'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactFooter extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final shop = context.watch<SettingsProvider>().settings.shop;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '聯絡我們',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 12),
          _ContactRow(icon: Icons.phone, text: shop.phone),
          _ContactRow(icon: Icons.email_outlined, text: shop.email),
          _ContactRow(
              icon: Icons.location_on_outlined, text: shop.address),
          const SizedBox(height: 16),
          Text(
            '© 2026 ${shop.name} 版權所有',
            style: const TextStyle(color: AppTheme.clay, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.ember),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text,
                style: const TextStyle(color: AppTheme.clay, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
