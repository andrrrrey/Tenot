import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Отдельный экран входа (открывается, когда гость делает действие, требующее авторизации).
class AuthScreen extends StatelessWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(),
        body: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 32),
          child: AuthForm(onDone: () => Navigator.of(context).pop(true)),
        ),
      );
}

/// Форма входа/регистрации — как app/login и app/register.
class AuthForm extends StatefulWidget {
  const AuthForm({super.key, this.onDone});
  final VoidCallback? onDone;

  @override
  State<AuthForm> createState() => _AuthFormState();
}

enum _AuthMode { phone, email }

class _AuthFormState extends State<AuthForm> {
  _AuthMode _mode = _AuthMode.phone;
  bool _register = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _password2 = TextEditingController();
  final _form = GlobalKey<FormState>();

  // Вход по телефону: номер → код из SMS. Аккаунт создаётся при первом входе.
  final _phone = TextEditingController();
  final _code = TextEditingController();
  bool _codeSent = false;
  int _cooldown = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _email.dispose();
    _password.dispose();
    _password2.dispose();
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  void _startCooldown(int seconds) {
    _timer?.cancel();
    setState(() => _cooldown = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _cooldown--);
      if (_cooldown <= 0) t.cancel();
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      if (e.retryAfter != null) _startCooldown(e.retryAfter!);
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() async {
    if (_phone.text.trim().isEmpty) {
      setState(() => _error = 'Введите номер телефона');
      return;
    }
    final session = context.read<Session>();
    await _run(() async {
      final retryAfter = await session.requestPhoneCode(_phone.text.trim());
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _code.clear();
      });
      _startCooldown(retryAfter);
    });
  }

  Future<void> _verifyCode() async {
    if (_code.text.trim().isEmpty) {
      setState(() => _error = 'Введите код из SMS');
      return;
    }
    final session = context.read<Session>();
    await _run(() async {
      await session.loginByPhone(_phone.text.trim(), _code.text.trim());
      widget.onDone?.call();
    });
  }

  Widget _modeSwitch() => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: SegmentedButton<_AuthMode>(
          segments: const [
            ButtonSegment(value: _AuthMode.phone, label: Text('По телефону')),
            ButtonSegment(value: _AuthMode.email, label: Text('По email')),
          ],
          selected: {_mode},
          showSelectedIcon: false,
          onSelectionChanged: (s) => setState(() {
            _mode = s.first;
            _error = null;
          }),
        ),
      );

  List<Widget> _phoneFields() => [
        Labeled(
          'Телефон',
          TextFormField(
            controller: _phone,
            enabled: !_codeSent,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            decoration: const InputDecoration(hintText: '+7 900 000-00-00'),
          ),
        ),
        if (_codeSent) ...[
          Labeled(
            'Код из SMS',
            TextFormField(
              controller: _code,
              autofocus: true,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              maxLength: 6,
              decoration: const InputDecoration(hintText: '••••', counterText: ''),
              onFieldSubmitted: (_) => _verifyCode(),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                          _codeSent = false;
                          _error = null;
                        }),
                child: const Text('Изменить номер'),
              ),
              TextButton(
                onPressed: _busy || _cooldown > 0 ? null : _sendCode,
                child: Text(_cooldown > 0 ? 'Повторно через $_cooldown с' : 'Отправить снова'),
              ),
            ],
          ),
          const SizedBox(height: 6),
        ],
      ];

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final session = context.read<Session>();
    try {
      if (_register) {
        await session.register(_email.text.trim(), _password.text);
      } else {
        await session.login(_email.text.trim(), _password.text);
      }
      widget.onDone?.call();
    } on ApiException catch (e) {
      setState(() => _error = !_register && e.status == 401 ? 'Неверный email или пароль' : e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: T.cardDecoration(radius: T.rXl),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(child: Logo(size: 28)),
            const SizedBox(height: 16),
            Text(_register ? 'Регистрация' : 'Вход', textAlign: TextAlign.center, style: T.h2.copyWith(fontSize: 22)),
            const SizedBox(height: 6),
            Text(
              _mode == _AuthMode.phone
                  ? 'Аккаунт создастся автоматически при первом входе'
                  : _register
                      ? 'Создайте аккаунт, чтобы размещать объявления'
                      : 'Войдите, чтобы размещать объявления',
              textAlign: TextAlign.center,
              style: T.mutedText,
            ),
            const SizedBox(height: 20),
            _modeSwitch(),
            if (_mode == _AuthMode.phone) ..._phoneFields() else ...[
            Labeled(
              'Email',
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(hintText: 'you@example.com'),
                validator: (v) => v != null && RegExp(r'^\S+@\S+\.\S+$').hasMatch(v.trim()) ? null : 'Введите email',
              ),
            ),
            Labeled(
              'Пароль',
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.password],
                decoration: InputDecoration(
                  hintText: _register ? 'Минимум 6 символов' : '••••••',
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v ?? '').length >= 6 ? null : 'Минимум 6 символов',
              ),
            ),
            if (_register)
              Labeled(
                'Повторите пароль',
                TextFormField(
                  controller: _password2,
                  obscureText: _obscure,
                  validator: (v) => v == _password.text ? null : 'Пароли не совпадают',
                ),
              ),
            ],
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0x14EF4444),
                  borderRadius: BorderRadius.circular(T.rSm),
                  border: Border.all(color: const Color(0x33EF4444)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13)),
              ),
            FilledButton(
              onPressed: _busy
                  ? null
                  : _mode == _AuthMode.email
                      ? _submit
                      : _codeSent
                          ? _verifyCode
                          : _cooldown > 0
                              ? null
                              : _sendCode,
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_mode == _AuthMode.phone
                      ? (_codeSent ? 'Войти' : (_cooldown > 0 ? 'Получить код ($_cooldown с)' : 'Получить код'))
                      : (_register ? 'Зарегистрироваться' : 'Войти')),
            ),
            const SizedBox(height: 8),
            if (_mode == _AuthMode.email)
            TextButton(
              onPressed: () => setState(() {
                _register = !_register;
                _error = null;
              }),
              child: Text(_register ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'),
            ),
          ],
        ),
      ),
    );
  }
}
