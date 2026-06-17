import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/cart_item.dart';
import '../models/customer_info.dart';
import '../models/order_result.dart';
import '../models/product.dart';

/// API 例外，攜帶可顯示給使用者的訊息。
class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

/// 與既有後端溝通的服務層。沿用既有 API，不更動後端。
class ApiService {
  ApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _client;
  final String _baseUrl;

  static const Duration _timeout = Duration(seconds: 15);

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    return Uri.parse('$_baseUrl$path').replace(
      queryParameters: query?.map((k, v) => MapEntry(k, v.toString())),
    );
  }

  /// 取得所有商品（可選分類過濾）。
  Future<List<Product>> fetchProducts({String? category}) async {
    try {
      final res = await _client
          .get(_uri('/api/products',
              category != null ? {'category': category} : null))
          .timeout(_timeout);

      final json = _decode(res);
      if (res.statusCode == 200 && json['success'] == true) {
        final data = (json['data'] as List?) ?? const [];
        return data
            .whereType<Map<String, dynamic>>()
            .map(Product.fromJson)
            .toList();
      }
      throw ApiException(_messageOf(json, '取得商品失敗'));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('無法連線伺服器，請確認網路或稍後再試');
    }
  }

  /// 取得單一商品。
  Future<Product> fetchProduct(String id) async {
    try {
      final res = await _client.get(_uri('/api/products/$id')).timeout(_timeout);
      final json = _decode(res);
      if (res.statusCode == 200 && json['success'] == true) {
        return Product.fromJson(json['data'] as Map<String, dynamic>);
      }
      throw ApiException(_messageOf(json, '找不到該商品'));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('無法連線伺服器，請稍後再試');
    }
  }

  /// 送出訂單。後端會以伺服器端價格重新計算並驗證金額。
  Future<OrderResult> createOrder({
    required List<CartItem> items,
    required CustomerInfo customer,
    required int subtotal,
    required int shipping,
    required NotifyPreference notifyPreference,
  }) async {
    try {
      final body = {
        'items': items.map((e) => e.toOrderItemJson()).toList(),
        'subtotal': subtotal,
        'shipping': shipping,
        'totalAmount': subtotal + shipping,
        'shopInfo': {
          'name': AppConfig.shopName,
          'address': AppConfig.shopAddress,
          'phone': AppConfig.shopPhone,
        },
        'customer': customer.toJson(),
        'notifyPreference': notifyPreference.value,
      };

      final res = await _client
          .post(
            _uri('/api/orders'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(_timeout);

      final json = _decode(res);
      if ((res.statusCode == 200 || res.statusCode == 201) &&
          json['success'] == true) {
        return OrderResult.fromJson(json);
      }
      throw ApiException(_messageOf(json, '訂單送出失敗，請稍後再試'));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('無法連線伺服器，請稍後再試');
    }
  }

  /// 訂閱電子報。
  Future<String> subscribeNewsletter(String email) async {
    try {
      final res = await _client
          .post(
            _uri('/api/newsletter/subscribe'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(_timeout);

      final json = _decode(res);
      if (res.statusCode == 200 && json['success'] == true) {
        return _messageOf(json, '感謝訂閱！');
      }
      throw ApiException(_messageOf(json, '訂閱失敗，請稍後再試'));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('無法連線伺服器，請稍後再試');
    }
  }

  Map<String, dynamic> _decode(http.Response res) {
    try {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is Map<String, dynamic>) return decoded;
      return {'success': false, 'data': decoded};
    } catch (_) {
      return {'success': false, 'message': '伺服器回應格式錯誤'};
    }
  }

  String _messageOf(Map<String, dynamic> json, String fallback) {
    final msg = json['message'];
    return (msg is String && msg.isNotEmpty) ? msg : fallback;
  }

  void dispose() => _client.close();
}
