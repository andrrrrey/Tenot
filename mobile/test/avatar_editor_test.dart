import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenot/screens/avatar_editor_screen.dart';

/// Прямоугольное фото 300×200: левая половина красная, правая синяя.
Future<File> _makeImage(Directory dir) async {
  final rec = ui.PictureRecorder();
  final c = Canvas(rec);
  c.drawRect(const Rect.fromLTWH(0, 0, 150, 200), Paint()..color = const Color(0xFFFF0000));
  c.drawRect(const Rect.fromLTWH(150, 0, 150, 200), Paint()..color = const Color(0xFF0000FF));
  final img = await rec.endRecording().toImage(300, 200);
  final data = await img.toByteData(format: ui.ImageByteFormat.png);
  final f = File('${dir.path}/src.png');
  await f.writeAsBytes(data!.buffer.asUint8List());
  return f;
}

void main() {
  testWidgets('редактор аватара: перемещение и сохранение квадратного фото', (tester) async {
    await _scenario(tester, rotations: 0, expectBlue: true);
  });

  testWidgets('редактор аватара: поворот учитывается при сохранении', (tester) async {
    // После поворота на 180° правая часть кадра — бывшая левая (красная) половина.
    await _scenario(tester, rotations: 2, expectBlue: false);
  });
}

Future<void> _scenario(WidgetTester tester, {required int rotations, required bool expectBlue}) async {
  {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    final dir = Directory.systemTemp.createTempSync('avatar_test');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (call) async => dir.path,
    );
    final src = await tester.runAsync(() => _makeImage(dir));

    String? result;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (ctx) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () async {
                  result = await Navigator.of(
                    ctx,
                  ).push<String>(MaterialPageRoute(builder: (_) => AvatarEditorScreen(path: src!.path)));
                },
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400)); // анимация перехода
    // Декодирование картинки идёт в реальном времени.
    for (var i = 0; i < 20 && find.byType(RawImage).evaluate().isEmpty; i++) {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await tester.pump();
    }
    expect(find.byType(RawImage), findsOneWidget);
    expect(find.text('Сохранить'), findsOneWidget);
    expect(find.text('Выбрать другое'), findsOneWidget);

    for (var i = 0; i < rotations; i++) {
      await tester.tap(find.byTooltip('Повернуть'));
      await tester.pump();
    }
    // Тащим фото влево до упора — в круг попадает правая часть кадра.
    await tester.drag(find.byType(RawImage), const Offset(-400, 0));
    await tester.pump();

    await tester.runAsync(() async {
      await tester.tap(find.text('Сохранить'));
      for (var i = 0; i < 40 && result == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 50));
        await tester.pump();
      }
    });
    await tester.pump(const Duration(milliseconds: 400));
    expect(result, isNotNull);

    final bytes = await tester.runAsync(() => File(result!).readAsBytes());
    final decoded = await tester.runAsync(() async {
      final codec = await ui.instantiateImageCodec(bytes!);
      final frame = await codec.getNextFrame();
      final px = await frame.image.toByteData(format: ui.ImageByteFormat.rawRgba);
      return (frame.image.width, frame.image.height, px!);
    });
    final (w, h, px) = decoded!;
    expect(w, h, reason: 'аватар квадратный');
    expect(w, 200, reason: 'не больше исходного разрешения в круге');
    final o = ((h ~/ 2) * w + w ~/ 2) * 4;
    final red = px.getUint8(o), blue = px.getUint8(o + 2);
    if (expectBlue) {
      expect(red, lessThan(40));
      expect(blue, greaterThan(200));
    } else {
      expect(red, greaterThan(200));
      expect(blue, lessThan(40));
    }
  }
}
