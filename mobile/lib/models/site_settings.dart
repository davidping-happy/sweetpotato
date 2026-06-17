/// 店家設定模型（對應後端 /api/site-settings）。
///
/// 預設值與既有寫死內容一致，確保離線 / 連線失敗時行為不變。
class SiteSettings {
  final ShopInfo shop;
  final LineInfo line;
  final ShippingRule shipping;
  final SiteContent content;

  const SiteSettings({
    required this.shop,
    required this.line,
    required this.shipping,
    required this.content,
  });

  /// 預設值（= 之前寫死於 AppConfig / 畫面的內容）。
  static const SiteSettings defaults = SiteSettings(
    shop: ShopInfo(
      name: '磐石烤地瓜 - 番薯阿嬤',
      phone: '0953830409',
      email: 'sweetpotatograndmom@gmail.com',
      address: '高雄市左營區華夏路576號',
    ),
    line: LineInfo(
      officialId: '@437lnypi',
      addFriendUrl: 'https://line.me/R/ti/p/@437lnypi',
    ),
    shipping: ShippingRule(
      fee: 150,
      freeThresholdQty: 20,
      freeThresholdKeyword: '黃金地瓜',
    ),
    content: SiteContent(
      heroTag: '傳承古早窯烤工藝',
      heroTitle: '番薯阿嬤的溫暖滋味',
      heroSubtitle: '炭火慢烤，每一口都是古早的人情味。',
      storyTitle: '守護一爐炭火的執著',
      storyBody:
          '在那座用了 20 多年的窯烤爐旁，我們依然堅持最古老的做法。阿嬤常說：「地瓜要好吃，急不得。」每一顆地瓜都承載著我們對土地的敬意。',
    ),
  );

  factory SiteSettings.fromJson(Map<String, dynamic> json) {
    final d = defaults;
    final shop = json['shop'] as Map<String, dynamic>? ?? const {};
    final line = json['line'] as Map<String, dynamic>? ?? const {};
    final shipping = json['shipping'] as Map<String, dynamic>? ?? const {};
    final content = json['content'] as Map<String, dynamic>? ?? const {};

    String s(dynamic v, String fallback) {
      final str = (v ?? '').toString().trim();
      return str.isEmpty ? fallback : str;
    }

    int i(dynamic v, int fallback) {
      if (v is num) return v.toInt();
      return int.tryParse('${v ?? ''}') ?? fallback;
    }

    return SiteSettings(
      shop: ShopInfo(
        name: s(shop['name'], d.shop.name),
        phone: s(shop['phone'], d.shop.phone),
        email: s(shop['email'], d.shop.email),
        address: s(shop['address'], d.shop.address),
      ),
      line: LineInfo(
        officialId: s(line['officialId'], d.line.officialId),
        addFriendUrl: s(line['addFriendUrl'], d.line.addFriendUrl),
      ),
      shipping: ShippingRule(
        fee: i(shipping['fee'], d.shipping.fee),
        freeThresholdQty: i(shipping['freeThresholdQty'], d.shipping.freeThresholdQty),
        // 關鍵字允許為空字串（代表全部商品都算），因此不套用 fallback。
        freeThresholdKeyword: (shipping.containsKey('freeThresholdKeyword'))
            ? (shipping['freeThresholdKeyword'] ?? '').toString()
            : d.shipping.freeThresholdKeyword,
      ),
      content: SiteContent(
        heroTag: s(content['heroTag'], d.content.heroTag),
        heroTitle: s(content['heroTitle'], d.content.heroTitle),
        heroSubtitle: s(content['heroSubtitle'], d.content.heroSubtitle),
        storyTitle: s(content['storyTitle'], d.content.storyTitle),
        storyBody: s(content['storyBody'], d.content.storyBody),
      ),
    );
  }
}

class ShopInfo {
  final String name;
  final String phone;
  final String email;
  final String address;
  const ShopInfo({
    required this.name,
    required this.phone,
    required this.email,
    required this.address,
  });
}

class LineInfo {
  final String officialId;
  final String addFriendUrl;
  const LineInfo({required this.officialId, required this.addFriendUrl});
}

class ShippingRule {
  final int fee;
  final int freeThresholdQty;
  final String freeThresholdKeyword;
  const ShippingRule({
    required this.fee,
    required this.freeThresholdQty,
    required this.freeThresholdKeyword,
  });
}

class SiteContent {
  final String heroTag;
  final String heroTitle;
  final String heroSubtitle;
  final String storyTitle;
  final String storyBody;
  const SiteContent({
    required this.heroTag,
    required this.heroTitle,
    required this.heroSubtitle,
    required this.storyTitle,
    required this.storyBody,
  });
}
