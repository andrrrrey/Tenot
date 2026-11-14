import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tenot/api/api.dart';
import 'package:tenot/api/models.dart';
import 'package:tenot/screens/capture360/interior_plan.dart';
import 'package:tenot/screens/capture360/orientation_tracker.dart';

void main() {
  group('точки-цели салона', () {
    test('быстрый режим — 12 по горизонту через 30°, полный — 28 в трёх рядах', () {
      final quick = interiorTargets(InteriorMode.quick);
      expect(quick.length, 12);
      expect(quick.every((t) => t.pitch == 0), isTrue);
      expect(quick.map((t) => t.yaw).toSet().length, 12);

      final full = interiorTargets(InteriorMode.full);
      expect(full.length, 28);
      expect(full.where((t) => t.pitch == 45).length, 8);
      expect(full.where((t) => t.pitch == -45).length, 8);
      expect(full.every((t) => t.yaw >= -180 && t.yaw < 180), isTrue);
    });

    test('прицел, ближайшая цель и переход через ±180°', () {
      final targets = interiorTargets(InteriorMode.quick);
      // Смотрим почти на цель 0° — попадание
      expect(isAimed(const CameraPose(2, -1, 0), targets[0]), isTrue);
      expect(isAimed(const CameraPose(10, 0, 0), targets[0]), isFalse);
      // Цель 0° уже снята — ближайшая к 20° должна быть 30°
      expect(targets[nearestTarget(const CameraPose(20, 0, 0), targets, {0})!].yaw, 30);
      // -175° ближе к 180° (= -180), чем к 150°
      final i = nearestTarget(const CameraPose(-175, 0, 0), targets, {});
      expect(wrap180(targets[i!].yaw), -180);
      expect(nearestTarget(const CameraPose(0, 0, 0), targets, {for (var k = 0; k < 12; k++) k}), isNull);
    });

    test('у верхнего ряда тот же поворот короче по экрану', () {
      const t = ShotTarget(10, 45);
      final o = offsetToTarget(const CameraPose(0, 45, 0), t);
      expect(o.dx, closeTo(10 * 0.7071, 0.01));
      expect(o.dy, 0);
    });
  });

  test('Listing: панорама салона и раздел «Транспорт»', () {
    final l = Listing.fromJson({
      'id': 3,
      'title': 'Авто',
      'hasInterior': true,
      'category': {'id': 1, 'name': 'Автомобили', 'templateKey': 'transport:aceb32c9a505067f'},
      'media360': [
        {'kind': 'interior', 'previewUrl': '/uploads/listings/360/3/1/interior_preview.jpg', 'status': 'ready'},
      ],
    });
    expect(l.hasInterior, isTrue);
    expect(l.previewInterior, '/uploads/listings/360/3/1/interior_preview.jpg');
    expect(l.preview360, isNull);
    expect(l.isTransport, isTrue);
    expect(
      Listing.fromJson({'id': 4, 'category': {'id': 2, 'name': 'Телефоны', 'templateKey': 'electronics:x'}}).isTransport,
      isFalse,
    );
  });

  test('загрузка снимков салона, commit с углами и статус склейки', () async {
    final dir = await Directory.systemTemp.createTemp('interior');
    final shot = File('${dir.path}/s.jpg')..writeAsBytesSync([0xFF, 0xD8, 0xFF, 0xD9]);
    final calls = <String>[];
    Object? commitBody;
    final client = MockClient.streaming((req, body) async {
      final bytes = await body.toBytes();
      calls.add('${req.method} ${req.url.path}');
      if (req.url.path.endsWith('/commit')) commitBody = jsonDecode(utf8.decode(bytes));
      final res = req.method == 'GET'
          ? {
              'spin': null,
              'interior': {'url': null, 'previewUrl': null, 'status': 'processing', 'error': null},
            }
          : {'status': 'processing'};
      return http.StreamedResponse(Stream.value(utf8.encode(jsonEncode(res))), 200);
    });
    final api = Api(baseUrl: 'https://tenot.ru', client: client);

    await api.uploadInteriorShots(9, 'u-123456789', 0, [shot.path]);
    await api.commitInterior(9, 'u-123456789', [const CameraPose(-30, 2.5, -1).toJson()]);
    final m = await api.media360(9);

    expect(calls, [
      'POST /api/proxy/listings/9/360/interior/frames',
      'POST /api/proxy/listings/9/360/interior/commit',
      'GET /api/proxy/listings/9/360',
    ]);
    expect(commitBody, {
      'uploadId': 'u-123456789',
      'shots': [
        {'yaw': -30.0, 'pitch': 2.5, 'roll': -1.0},
      ],
    });
    expect(m.spin, isNull);
    expect(m.interior!.isProcessing, isTrue);
    await dir.delete(recursive: true);
  });
}
