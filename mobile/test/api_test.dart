import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tenot/api/api.dart';

void main() {
  test('POST входа проходит редирект 301 на другой домен', () async {
    final hosts = <String>[];
    final client = MockClient((req) async {
      hosts.add('${req.method} ${req.url}');
      if (req.url.host == 'test.tenot.ru') {
        return http.Response('', 301, headers: {'location': 'https://tenot.ru${req.url.path}'}, request: req);
      }
      expect(jsonDecode(req.body), {'email': 'a@b.ru', 'password': 'secret1'});
      return http.Response(jsonEncode({'access_token': 'tok'}), 201, request: req);
    });
    final api = Api(baseUrl: 'https://test.tenot.ru', client: client);
    expect(await api.login('a@b.ru', 'secret1'), 'tok');
    expect(api.baseUrl, 'https://tenot.ru');
    expect(api.media('/uploads/a.jpg'), 'https://tenot.ru/uploads/a.jpg');
    expect(hosts, [
      'POST https://test.tenot.ru/api/proxy/auth/login',
      'POST https://tenot.ru/api/proxy/auth/login',
    ]);
  });
}
