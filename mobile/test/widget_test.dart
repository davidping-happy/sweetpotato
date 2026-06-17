import 'package:flutter_test/flutter_test.dart';

import 'package:sweetpotato_app/models/product.dart';
import 'package:sweetpotato_app/state/cart_provider.dart';

Product _product({
  required String id,
  required String name,
  required int price,
}) {
  return Product(
    id: id,
    name: name,
    description: '',
    price: price,
    category: '烤地瓜',
    inStock: true,
    imageUrl: '',
  );
}

void main() {
  group('CartProvider', () {
    test('加入商品會累加數量並計算小計', () {
      final cart = CartProvider();
      final potato = _product(id: '1', name: '台農57號黃金地瓜', price: 100);

      cart.add(potato);
      cart.add(potato);

      expect(cart.totalItems, 2);
      expect(cart.subtotal, 200);
      expect(cart.qtyOf('1'), 2);
    });

    test('未達門檻時運費為 150', () {
      final cart = CartProvider();
      cart.add(_product(id: '1', name: '台農57號黃金地瓜', price: 100));

      expect(cart.shipping, 150);
      expect(cart.total, 250);
      expect(cart.qualifiesFreeShipping, isFalse);
    });

    test('黃金地瓜滿 20 盒免運', () {
      final cart = CartProvider();
      final potato = _product(id: '1', name: '台農57號黃金地瓜', price: 100);
      cart.add(potato);
      cart.setQty('1', 20);

      expect(cart.sweetPotatoQty, 20);
      expect(cart.shipping, 0);
      expect(cart.total, 2000);
      expect(cart.qualifiesFreeShipping, isTrue);
    });

    test('移除與清空購物車', () {
      final cart = CartProvider();
      cart.add(_product(id: '1', name: '茶葉蛋', price: 13));
      cart.add(_product(id: '2', name: '地瓜糖', price: 45));

      cart.remove('1');
      expect(cart.items.length, 1);

      cart.clear();
      expect(cart.isEmpty, isTrue);
    });
  });
}
