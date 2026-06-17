import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';
import '../models/product.dart';
import '../models/site_settings.dart';

/// 購物車狀態。運費規則由後端設定動態決定（與後端一致），
/// 預設值與後端預設相同；店家於後台調整後，App 會同步套用。
class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];

  ShippingRule _shippingRule = SiteSettings.defaults.shipping;

  ShippingRule get shippingRule => _shippingRule;

  /// 套用最新的運費規則（由 SettingsProvider 載入後呼叫）。
  void configureShipping(ShippingRule rule) {
    _shippingRule = rule;
    notifyListeners();
  }

  List<CartItem> get items => List.unmodifiable(_items);

  bool get isEmpty => _items.isEmpty;

  int get totalItems => _items.fold(0, (sum, i) => sum + i.qty);

  int get subtotal => _items.fold(0, (sum, i) => sum + i.lineTotal);

  int get freeShippingThresholdQty => _shippingRule.freeThresholdQty;

  /// 計入免運門檻的商品數量（名稱包含關鍵字者；關鍵字為空代表全部商品）。
  int get sweetPotatoQty {
    final keyword = _shippingRule.freeThresholdKeyword;
    return _items
        .where((i) => keyword.isEmpty || i.product.name.contains(keyword))
        .fold(0, (sum, i) => sum + i.qty);
  }

  int get shipping {
    final threshold = _shippingRule.freeThresholdQty;
    if (threshold <= 0) return 0;
    return sweetPotatoQty >= threshold ? 0 : _shippingRule.fee;
  }

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
