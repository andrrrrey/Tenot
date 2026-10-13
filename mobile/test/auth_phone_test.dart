import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/screens/auth_screen.dart';
import 'package:tenot/state/session.dart';

class _MemoryStorage extends TokenStorage {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String? t) async => token = t;
}

http.Response _json(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

void main() {
  testWidgets('вход по телефону: номер → код → вход', (tester) async {
    final calls = <String, Map>{};
    final client = MockClient((req) async {
      final p = req.url.path;
      if (req.method == 'POST') calls[p] = jsonDecode(req.body) as Map;
      if (p.endsWith('/auth/phone/request')) return _json({'ok': true, 'retryAfter': 60, 'codeLength': 4});
      if (p.endsWith('/auth/phone/verify')) return _json({'access_token': 'tok'});
      if (p.endsWith('/users/me')) return _json({'id': 1, 'email': null, 'phone': '+79991112233', 'role': 'USER'});
      return _json([]);
    });
    final session = Session(Api(baseUrl: 'https://example.test', client: client), storage: _MemoryStorage());
    var done = false;

    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: session,
      child: MaterialApp(home: Scaffold(body: SingleChildScrollView(child: AuthForm(onDone: () => done = true)))),
    ));

    await tester.enterText(find.byType(TextFormField).first, '+7 999 111-22-33');
    await tester.tap(find.text('Получить код'));
    await tester.pump();
    expect(calls['/api/proxy/auth/phone/request'], {'phone': '+7 999 111-22-33'});
    expect(find.text('Код из SMS'), findsOneWidget);
    expect(find.text('Повторно через 60 с'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Повторно через 59 с'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).last, '1234');
    await tester.tap(find.widgetWithText(FilledButton, 'Войти'));
    await tester.pump();
    expect(calls['/api/proxy/auth/phone/verify'], {'phone': '+7 999 111-22-33', 'code': '1234'});
    expect(session.isLoggedIn, isTrue);
    expect(done, isTrue);

    // Дождаться окончания таймера повторной отправки, чтобы не осталось активных таймеров.
    await tester.pump(const Duration(seconds: 60));
  });

  testWidgets('ошибка 429 показывает сообщение и запускает таймер', (tester) async {
    final client = MockClient((req) async => _json(
          {'statusCode': 429, 'message': 'Повторно запросить код можно позже', 'retryAfter': 30},
          429,
        ));
    final session = Session(Api(baseUrl: 'https://example.test', client: client), storage: _MemoryStorage());

    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: session,
      child: const MaterialApp(home: Scaffold(body: SingleChildScrollView(child: AuthForm()))),
    ));

    await tester.enterText(find.byType(TextFormField).first, '+79991112233');
    await tester.tap(find.text('Получить код'));
    await tester.pump();
    expect(find.text('Повторно запросить код можно позже'), findsOneWidget);
    expect(find.text('Получить код (30 с)'), findsOneWidget);
    await tester.pump(const Duration(seconds: 30));
    expect(find.text('Получить код'), findsOneWidget);
  });
}
