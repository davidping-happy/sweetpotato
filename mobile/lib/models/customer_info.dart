/// 結帳時的顧客寄送資訊。
class CustomerInfo {
  final String name;
  final String phone;
  final String email;
  final String address;

  /// 綁定 LINE 後取得的使用者 ID（選填）。
  final String lineUserId;

  const CustomerInfo({
    required this.name,
    required this.phone,
    this.email = '',
    required this.address,
    this.lineUserId = '',
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'email': email,
      'address': address,
      'lineUserId': lineUserId,
    };
  }
}

/// 通知偏好，對應後端 notifyPreference。
enum NotifyPreference {
  email('email', 'Email 確認信'),
  line('line', '僅通知店家 LINE'),
  both('both', 'Email + LINE 都通知'),
  none('none', '不通知');

  const NotifyPreference(this.value, this.label);

  final String value;
  final String label;
}
