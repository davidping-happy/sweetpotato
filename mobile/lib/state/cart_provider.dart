import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../models/cart_item.dart';
import '../models/product.dart';

/// 購物車狀態。運費規則與後端一致（黃金地瓜滿 20 盒免運）。
class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  bool get isEmpty => _items.isEmpty;

  int get totalItems => _items.fold(0, (sum, i) => sum + i.qty);

  int get subtotal => _items.fold(0, (sum, i) => sum + i.lineTotal);

  int get sweetPotatoQty => _items
      .where((i) => i.product.name.contains('黃金地瓜'))
      .fold(0, (sum, i) => sum + i.qty);

  int get shipping =>
      sweetPotatoQty >= AppConfig.freeShippingSweetPotatoQty
          ? 0
          : AppConfig.shippingFee;

  int get total => subtotal + shipping;

  bool get qualifiesFreeShipping => shipping == 0;

  void add(Product product) {
    final existing = _indexOf(product.id);
    if (existing >= 0) {
      _items[existing].qty += 1;
    } else {
      _items.add(CartItem(product: product));
    }
    notifyListeners();
  }

  void updateQty(String productId, int delta) {
    final index = _indexOf(productId);
    if (index < 0) return;
    final next = _items[index].qty + delta;
    if (next < 1) {
      _items[index].qty = 1;
    } else {
      _items[index].qty = next;
    }
    notifyListeners();
  }

  void setQty(String productId, int qty) {
    final index = _indexOf(productId);
    if (index < 0) return;
    _items[index].qty = qty < 1 ? 1 : qty;
    notifyListeners();
  }

  void remove(String productId) {
    _items.removeWhere((i) => i.product.id == productId);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  int qtyOf(String productId) {
    final index = _indexOf(productId);
    return index >= 0 ? _items[index].qty : 0;
  }

  int _indexOf(String productId) =>
      _items.indexWhere((i) => i.product.id == productId);
}
