/// 後端 `POST /api/orders` 成功後回傳的結果摘要。
class OrderResult {
  final String orderNumber;
  final int subtotal;
  final int shipping;
  final int total;
  final String shippingNote;
  final String message;

  const OrderResult({
    required this.orderNumber,
    required this.subtotal,
    required this.shipping,
    required this.total,
    required this.shippingNote,
    required this.message,
  });

  factory OrderResult.fromJson(Map<String, dynamic> json) {
    final data = (json['data'] as Map<String, dynamic>?) ?? const {};
    return OrderResult(
      orderNumber:
          (json['orderId'] ?? data['orderNumber'] ?? '').toString(),
      subtotal: _toInt(data['subtotal']),
      shipping: _toInt(data['shipping']),
      total: _toInt(data['total']),
      shippingNote: (data['shippingNote'] ?? '').toString(),
      message: (json['message'] ?? '阿嬤收到您的訂單囉！').toString(),
    );
  }

  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
