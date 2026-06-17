import 'product.dart';

/// 購物車內單一品項（商品 + 數量）。
class CartItem {
  final Product product;
  int qty;

  CartItem({required this.product, this.qty = 1});

  int get lineTotal => product.price * qty;

  Map<String, dynamic> toOrderItemJson() {
    return {
      'id': product.id,
      'name': product.name,
      'price': product.price,
      'quantity': qty,
    };
  }
}
