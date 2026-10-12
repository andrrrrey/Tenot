import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/main.dart';
import 'package:tenot/screens/listing_screen.dart';
import 'package:tenot/screens/search_screen.dart';
import 'package:tenot/state/session.dart';

Map<String, dynamic> _listing(int id) => {
      'id': id,
      'title': 'Объявление номер $id с длинным названием для проверки переноса',
      'description': 'Описание объявления',
      'price': 12345 * id,
      'status': 'PUBLISHED',
      'isActive': true,
      'createdAt': '2026-10-01T10:00:00.000Z',
      'category': {'id': 1, 'name': 'Электроника'},
      'city': {'id': 1, 'name': 'Москва'},
      'images': [],
      'user': {'id': 9, 'email': 'seller@test.ru', 'name': 'Иван', 'phone': '+79000000000'},
    };

class _MemoryStorage extends TokenStorage {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String? t) async => token = t;
}

void main() {
  final requests = <http.Request>[];
  final client = MockClient((req) async {
    requests.add(req);
    final p = req.url.path;
    Object body;
    if (p.endsWith('/categories')) {
      body = [
        {'id': 1, 'name': 'Электроника', 'children': []},
        {'id': 2, 'name': 'Автозапчасти', 'hasCarFilter': true, 'children': []},
      ];
    } else if (RegExp(r'/listings/\d+$').hasMatch(p)) {
      body = _listing(int.parse(p.split('/').last));
    } else if (p.endsWith('/listings')) {
      body = [for (var i = 1; i <= 5; i++) _listing(i)];
    } else {
      body = [];
    }
    return http.Response.bytes(utf8.encode(jsonEncode(body)), 200, headers: {'content-type': 'application/json'});
  });

  testWidgets('главная, поиск и карточка открываются без ошибок вёрстки', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    final session = Session(Api(baseUrl: 'https://example.test', client: client), storage: _MemoryStorage());
    await session.init();
    await tester.pumpWidget(TenotApp(session: session));
    await tester.pumpAndSettle();

    expect(find.text('Категории'), findsOneWidget);
    expect(find.text('Автозапчасти'), findsOneWidget);
    expect(find.text('Свежие объявления'), findsOneWidget);
    expect(find.text('12\u00A0345\u00A0₽'), findsOneWidget);

    // Запросы идут через прокси сайта и со своим User-Agent.
    expect(requests.first.url.toString(), startsWith('https://example.test/api/proxy/'));
    expect(requests.first.headers['user-agent'], contains('TenotApp'));

    await tester.tap(find.text('Автозапчасти'));
    await tester.pumpAndSettle();
    expect(find.byType(SearchScreen), findsOneWidget);
    expect(find.text('Найдено: 5'), findsOneWidget);

    await tester.tap(find.text('12\u00A0345\u00A0₽').first);
    await tester.pumpAndSettle();
    expect(find.byType(ListingScreen), findsOneWidget);
    expect(find.text('Показать телефон'), findsOneWidget);

    // Вкладка профиля для гостя показывает форму входа.
    Navigator.of(tester.element(find.byType(ListingScreen))).popUntil((r) => r.isFirst);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Войти').last);
    await tester.pumpAndSettle();
    expect(find.text('Нет аккаунта? Зарегистрироваться'), findsOneWidget);
  });
}
