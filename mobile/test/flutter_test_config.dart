import 'dart:async';

import 'package:tenot/widgets/hero_slider.dart';

/// Общая настройка всех виджет-тестов: бесконечная автопрокрутка слайдера
/// на главной не даёт pumpAndSettle завершиться, поэтому в тестах она выключена.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  HeroSlider.autoplay = false;
  await testMain();
}
