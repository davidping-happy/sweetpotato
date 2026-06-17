import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/order_result.dart';
import '../theme/app_theme.dart';

class OrderSuccessScreen extends StatelessWidget {
  const OrderSuccessScreen({super.key, required this.result});

  final OrderResult result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: AppTheme.success.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle,
                      size: 64, color: AppTheme.success),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                '訂單已送出！',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                result.message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.clay, height: 1.5),
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      const Text('訂單編號',
                          style: TextStyle(color: AppTheme.clay)),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              result.orderNumber,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.emberDark,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: '複製',
                            onPressed: () {
                              Clipboard.setData(
                                  ClipboardData(text: result.orderNumber));
                              ScaffoldMessenger.of(context)
                                ..hideCurrentSnackBar()
                                ..showSnackBar(const SnackBar(
                                    content: Text('已複製訂單編號')));
                            },
                            icon: const Icon(Icons.copy, size: 18),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      _row('商品小計', 'NT\$${result.subtotal}'),
                      _row(
                        '運費',
                        result.shipping == 0
                            ? '免運費'
                            : 'NT\$${result.shipping}',
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('總計',
                              style:
                                  TextStyle(fontWeight: FontWeight.w800)),
                          Text('NT\$${result.total}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                  color: AppTheme.emberDark)),
                        ],
                      ),
                      if (result.shippingNote.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          result.shippingNote,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppTheme.success, fontSize: 13),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () => Navigator.of(context)
                    .popUntil((route) => route.isFirst),
                style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(54)),
                child: const Text('返回商店'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.clay)),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, color: AppTheme.charcoal)),
        ],
      ),
    );
  }
}
