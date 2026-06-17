import '../config/app_config.dart';

/// 對應後端 `/api/products` 回傳的商品資料。
class Product {
  final String id;
  final String name;
  final String description;
  final int price;
  final String category;
  final bool inStock;
  final String imageUrl;

  /// 前端額外標籤（例如「熱銷首選」），非後端欄位。
  final String? badge;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.inStock,
    required this.imageUrl,
    this.badge,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    const badgeMap = <String, String>{'台農57號黃金地瓜': '熱銷首選'};
    final name = (json['name'] ?? '').toString();
    return Product(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: name,
      description: (json['description'] ?? '').toString(),
      price: _toInt(json['price']),
      category: (json['category'] ?? '').toString(),
      inStock: json['inStock'] == null ? true : json['inStock'] == true,
      imageUrl: AppConfig.toCdnImageUrl(json['imageUrl']?.toString()),
      badge: badgeMap[name],
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
