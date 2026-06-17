import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/customer_info.dart';
import '../services/api_service.dart';
import '../state/cart_provider.dart';
import '../theme/app_theme.dart';
import 'order_success_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();

  NotifyPreference _notify = NotifyPreference.email;
  bool _submitting = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final cart = context.read<CartProvider>();
    if (cart.isEmpty) {
      _showSnack('您的購物車是空的');
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await context.read<ApiService>().createOrder(
            items: cart.items,
            customer: CustomerInfo(
              name: _name.text.trim(),
              phone: _phone.text.trim(),
              email: _email.text.trim(),
              address: _address.text.trim(),
            ),
            subtotal: cart.subtotal,
            shipping: cart.shipping,
            notifyPreference: _notify,
          );
      if (!mounted) return;
      cart.clear();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => OrderSuccessScreen(result: result),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      _showSnack(e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('結帳',
            style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          children: [
            _OrderSummaryCard(cart: cart),
            const SizedBox(height: 20),
            const Text('寄送資訊',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal)),
            const SizedBox(height: 12),
            _Field(
              controller: _name,
              label: '姓名',
              required: true,
              textInputAction: TextInputAction.next,
            ),
            _Field(
              controller: _phone,
              label: '電話',
              required: true,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
            ),
            _Field(
              controller: _email,
              label: 'Email（選填，可收確認信）',
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: (value) {
                final v = value?.trim() ?? '';
                if (v.isEmpty) return null;
                final ok = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v);
                return ok ? null : 'Email 格式不正確';
              },
            ),
            _Field(
              controller: _address,
              label: '寄送地址',
              required: true,
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            const Text('通知方式',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal)),
            const SizedBox(height: 4),
            RadioGroup<NotifyPreference>(
              groupValue: _notify,
              onChanged: (v) => setState(() => _notify = v!),
              child: Column(
                children: [
                  for (final pref in NotifyPreference.values)
                    RadioListTile<NotifyPreference>(
                      value: pref,
                      title: Text(pref.label),
                      activeColor: AppTheme.ember,
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style:
                ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(54)),
            child: _submitting
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text('確認送出訂單 · NT\$${cart.total}'),
          ),
        ),
      ),
    );
  }
}

class _OrderSummaryCard extends StatelessWidget {
  const _OrderSummaryCard({required this.cart});

  final CartProvider cart;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('訂單內容',
                style: TextStyle(
                    fontWeight: FontWeight.w800, color: AppTheme.charcoal)),
            const SizedBox(height: 10),
            for (final item in cart.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('${item.product.name} ×${item.qty}',
                          style: const TextStyle(color: AppTheme.clay)),
                    ),
                    Text('NT\$${item.lineTotal}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoal)),
                  ],
                ),
              ),
            const Divider(),
            _row('商品小計', 'NT\$${cart.subtotal}'),
            _row(
              '運費',
              cart.shipping == 0 ? '免運費' : 'NT\$${cart.shipping}',
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('總計',
                    style: TextStyle(fontWeight: FontWeight.w800)),
                Text('NT\$${cart.total}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        color: AppTheme.emberDark)),
              ],
            ),
          ],
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

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    this.required = false,
    this.keyboardType,
    this.textInputAction,
    this.maxLines = 1,
    this.validator,
  });

  final TextEditingController controller;
  final String label;
  final bool required;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int maxLines;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: required ? '$label *' : label,
        ),
        validator: validator ??
            (required
                ? (value) =>
                    (value == null || value.trim().isEmpty) ? '此欄位為必填' : null
                : null),
      ),
    );
  }
}
