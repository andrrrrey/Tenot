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

class _AuthFormState extends State<AuthForm> {
  bool _register = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _password2 = TextEditingController();
  final _form = GlobalKey<FormState>();

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
              _register ? 'Создайте аккаунт, чтобы размещать объявления' : 'Войдите, чтобы размещать объявления',
              textAlign: TextAlign.center,
              style: T.mutedText,
            ),
            const SizedBox(height: 20),
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
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_register ? 'Зарегистрироваться' : 'Войти'),
            ),
            const SizedBox(height: 8),
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
