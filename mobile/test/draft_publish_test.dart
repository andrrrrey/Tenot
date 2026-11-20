import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/api/models.dart';
import 'package:tenot/screens/add_listing_screen.dart';
import 'package:tenot/state/session.dart';

class _MemoryStorage extends TokenStorage {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String? t) async => token = t;
}

Map<String, dynamic> _draft({String templateKey = 'transport:cars'}) => {
      'id': 7,
      'title': 'Черновик',
      'description': ' ',
      'price': 0,
      'status': 'DRAFT',
      'isActive': true,
      'createdAt': '2026-11-18T10:00:00.000Z',
      'category': {'id': 3, 'name': 'Автомобили', 'templateKey': templateKey},
      'images': [],
      'user': {'id': 9, 'name': 'Иван'},
    };

void main() {
  final requests = <http.Request>[];
  final client = MockClient((req) async {
    requests.add(req);
    final p = req.url.path;
    Object body = [];
    if (req.method == 'PATCH' && p.endsWith('/listings/7')) body = {..._draft(), ...jsonDecode(req.body)};
    return http.Response.bytes(utf8.encode(jsonEncode(body)), 200, headers: {'content-type': 'application/json'});
  });

  Future<void> pumpForm(WidgetTester tester, Listing? editing) async {
    await tester.binding.setSurfaceSize(const Size(360, 3000));
    final session = Session(Api(baseUrl: 'https://example.test', client: client), storage: _MemoryStorage());
    await session.init();
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: session,
      child: MaterialApp(home: AddListingScreen(editing: editing)),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('новое объявление: 360° можно снять до публикации', (tester) async {
    await pumpForm(tester, null);
    expect(find.text('360°-обзор'), findsWidgets);
    expect(find.text('Снять 360°-обзор'), findsOneWidget);
    // Салон — только для транспорта, категория ещё не выбрана.
    expect(find.text('Снять салон 360°'), findsNothing);
    expect(find.text('Опубликовать'), findsOneWidget);
    expect(find.text('Сохранить черновик'), findsOneWidget);
  });

  testWidgets('черновик: можно опубликовать прямо из формы', (tester) async {
    requests.clear();
    await pumpForm(tester, Listing.fromJson(_draft()));
    expect(find.text('Снять салон 360°'), findsOneWidget);
    expect(find.text('Сохранить черновик'), findsOneWidget);
    // Заглушка «Черновик» в названии не подставляется.
    expect(find.widgetWithText(TextField, 'Черновик'), findsNothing);

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Fiat Albea');
    await tester.enterText(fields.at(1), 'Хорошее состояние, один владелец');
    await tester.enterText(fields.at(2), '700000');
    await tester.tap(find.text('Опубликовать'));
    await tester.pumpAndSettle();

    final patch = requests.lastWhere((r) => r.method == 'PATCH');
    final body = jsonDecode(patch.body) as Map<String, dynamic>;
    expect(patch.url.path, endsWith('/listings/7'));
    expect(body['status'], 'PUBLISHED');
    expect(body['title'], 'Fiat Albea');
  });
}
