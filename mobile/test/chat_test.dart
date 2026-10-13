import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/main.dart';
import 'package:tenot/screens/chat_thread_screen.dart';
import 'package:tenot/state/session.dart';

class _MemoryStorage extends TokenStorage {
  String? token = 'test-token';
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String? t) async => token = t;
}

void main() {
  testWidgets('чаты: список, непрочитанные, переписка и отправка', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    final now = DateTime.now().toUtc().toIso8601String();
    final messages = <Map<String, dynamic>>[
      {'id': 1, 'chatId': 5, 'senderId': 2, 'text': 'Здравствуйте, ещё продаёте?', 'isRead': false, 'createdAt': now},
      {'id': 2, 'chatId': 5, 'senderId': 1, 'text': 'Да', 'isRead': true, 'createdAt': now},
    ];
    var unread = 1;
    final calls = <String>[];
    final client = MockClient((req) async {
      final p = req.url.path.replaceFirst('/api/proxy', '');
      calls.add('${req.method} $p');
      expect(req.headers['authorization'], 'Bearer test-token');
      Object body = [];
      if (p == '/users/me') {
        body = {'id': 1, 'email': 'me@test.ru', 'name': 'Я', 'role': 'USER'};
      } else if (p == '/chat/my') {
        body = [
          // Старый диалог с более поздним id, но давним сообщением — должен оказаться ниже.
          {
            'id': 9,
            'initiatorId': 3,
            'ownerId': 1,
            'listingId': 11,
            'messages': [
              {'id': 90, 'chatId': 9, 'senderId': 3, 'text': 'Старое', 'isRead': true, 'createdAt': '2026-01-01T10:00:00.000Z'}
            ],
            'initiator': {'id': 3, 'name': 'Анна'},
            'owner': {'id': 1, 'name': 'Я'},
            'listing': {'id': 11, 'title': 'Самокат'},
            '_count': {'messages': 0},
          },
          {
            'id': 5,
            'initiatorId': 2,
            'ownerId': 1,
            'listingId': 10,
            'messages': [messages.last],
            'initiator': {'id': 2, 'name': 'Пётр Покупатель', 'avatarUrl': null},
            'owner': {'id': 1, 'name': 'Я', 'avatarUrl': null},
            'listing': {'id': 10, 'title': 'Велосипед'},
            '_count': {'messages': unread},
          }
        ];
      } else if (p == '/chat/5/messages') {
        body = messages;
      } else if (p == '/chat/5/read') {
        unread = 0;
        body = {'ok': true};
      } else if (p == '/chat/send') {
        final data = jsonDecode(req.body) as Map;
        expect(data, {'listingId': 10, 'receiverId': 2, 'text': 'Можно сегодня'});
        final m = {'id': 3, 'chatId': 5, 'senderId': 1, 'text': data['text'], 'isRead': false, 'createdAt': now};
        messages.add(m);
        body = m;
      }
      return http.Response.bytes(utf8.encode(jsonEncode(body)), 200, headers: {'content-type': 'application/json'});
    });

    final session = Session(Api(baseUrl: 'https://example.test', client: client), storage: _MemoryStorage());
    await session.init();
    await tester.pumpWidget(TenotApp(session: session));
    await tester.pumpAndSettle();

    // Бейдж непрочитанных на вкладке «Чаты».
    expect(find.text('1'), findsWidgets);
    await tester.tap(find.text('Чаты').last);
    await tester.pumpAndSettle();
    expect(find.text('Пётр Покупатель'), findsOneWidget);
    expect(find.text('Велосипед'), findsOneWidget);
    expect(find.text('Вы: Да'), findsOneWidget);
    // Свежий диалог — выше старого.
    expect(tester.getTopLeft(find.text('Пётр Покупатель')).dy, lessThan(tester.getTopLeft(find.text('Анна')).dy));

    await tester.tap(find.text('Пётр Покупатель'));
    await tester.pumpAndSettle();
    expect(find.byType(ChatThreadScreen), findsOneWidget);
    expect(find.text('Здравствуйте, ещё продаёте?'), findsOneWidget);
    expect(find.text('✓✓'), findsOneWidget);
    expect(calls, contains('PATCH /chat/5/read'));

    final input = find.descendant(of: find.byType(ChatThreadScreen), matching: find.byType(TextField));
    expect(input, findsOneWidget);
    await tester.enterText(input, 'Можно сегодня');
    await tester.pump(); // перестроить кнопку отправки после ввода текста
    await tester.tap(find.byIcon(Icons.send_rounded));
    // Тело запроса MockClient читается через реальный async.
    for (var i = 0; i < 20 && find.text('✓').evaluate().isEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump();
    }
    await tester.pumpAndSettle();
    expect(find.text('Можно сегодня'), findsOneWidget);
    expect(calls, contains('POST /chat/send'));
    expect(find.text('✓'), findsOneWidget);

    // Закрываем экраны, чтобы остановить таймеры опроса.
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 11));
  });
}
