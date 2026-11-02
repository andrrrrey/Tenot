import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/api/models.dart';

void main() {
  test('Listing.fromJson: флаг 360° и превью из media360', () {
    final l = Listing.fromJson({
      'id': 5,
      'title': 'Авто',
      'has360': true,
      'media360': [
        {'kind': 'spin', 'previewUrl': '/uploads/listings/360/5/1/frame_000.jpg'},
      ],
    });
    expect(l.has360, isTrue);
    expect(l.preview360, '/uploads/listings/360/5/1/frame_000.jpg');

    final plain = Listing.fromJson({'id': 6, 'title': 'Без 360'});
    expect(plain.has360, isFalse);
    expect(plain.preview360, isNull);
  });

  test('загрузка кадров партиями, commit и чтение набора', () async {
    final dir = await Directory.systemTemp.createTemp('spin');
    final frame = File('${dir.path}/f.jpg')..writeAsBytesSync([0xFF, 0xD8, 0xFF, 0xD9]);
    final calls = <String>[];
    final client = MockClient.streaming((req, body) async {
      final bytes = await body.toBytes();
      calls.add('${req.method} ${req.url.path}?${req.url.query}');
      if (req.url.path.endsWith('/commit')) {
        expect(jsonDecode(utf8.decode(bytes)), {'uploadId': 'u-123456789', 'count': 12});
      }
      if (req.method == 'GET') {
        return http.StreamedResponse(
          Stream.value(utf8.encode(jsonEncode({
            'spin': {'frames': ['/a.jpg', '/b.jpg'], 'previewUrl': '/a.jpg', 'frameCount': 2},
          }))),
          200,
        );
      }
      return http.StreamedResponse(Stream.value(utf8.encode('{}')), 201);
    });
    final api = Api(baseUrl: 'https://tenot.ru', client: client);

    await api.uploadSpinFrames(7, 'u-123456789', 6, [frame.path, frame.path]);
    await api.commitSpin(7, 'u-123456789', 12);
    final spin = await api.listing360(7);

    expect(calls, [
      'POST /api/proxy/listings/7/360/spin/frames?uploadId=u-123456789&startIndex=6',
      'POST /api/proxy/listings/7/360/spin/commit?',
      'GET /api/proxy/listings/7/360?',
    ]);
    expect(spin!.frames, ['/a.jpg', '/b.jpg']);
    await dir.delete(recursive: true);
  });
}
