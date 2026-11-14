import 'dart:async';
import 'dart:math' as math;

import 'package:sensors_plus/sensors_plus.dart';

/// Ориентация основной (задней) камеры телефона в градусах.
///
/// Соглашения как в Hugin (по ним сервер склеивает панораму):
/// * [yaw] — поворот вокруг вертикали, вправо — плюс; 0 — направление в момент [OrientationTracker.resetYaw];
/// * [pitch] — наклон камеры, вверх — плюс (−90…90);
/// * [roll] — завал кадра вокруг оси камеры, по часовой — плюс.
class CameraPose {
  const CameraPose(this.yaw, this.pitch, this.roll);
  final double yaw;
  final double pitch;
  final double roll;

  Map<String, double> toJson() => {'yaw': yaw, 'pitch': pitch, 'roll': roll};
}

double wrap180(double a) => ((a + 180) % 360 + 360) % 360 - 180;

/// Ориентация по акселерометру и гироскопу (`sensors_plus`).
///
/// * Гравитация (сглаженный акселерометр) даёт наклон и завал — без дрейфа.
/// * Поворот вокруг вертикали — интеграл гироскопа в проекции на вертикаль: работает при
///   любом положении телефона. Компас не используем: в машине его сбивает металл кузова.
///   Небольшой дрейф гироскопа за минуту съёмки сервер исправит при склейке.
class OrientationTracker {
  StreamSubscription<GyroscopeEvent>? _gyroSub;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  final Stopwatch _clock = Stopwatch();
  int _lastGyroMicros = 0;

  // Гравитация в координатах телефона (ось «вверх», как отдаёт акселерометр в покое).
  double _gx = 0, _gy = 9.8, _gz = 0;
  double _yawRad = 0;

  /// Модуль угловой скорости вокруг вертикали, рад/с.
  double verticalSpeed = 0;

  /// Модуль полной угловой скорости, рад/с — «телефон неподвижен», когда мала.
  double totalSpeed = 0;

  /// Накопленный поворот вокруг вертикали со знаком, радианы (вправо — минус в осях телефона,
  /// поэтому в [pose] знак меняется).
  double get verticalAngleRad => _yawRad;

  /// Вызывается на каждое событие гироскопа (после пересчёта).
  void Function()? onUpdate;

  void start() {
    _clock
      ..reset()
      ..start();
    _lastGyroMicros = 0;
    _accelSub ??= accelerometerEventStream(samplingPeriod: SensorInterval.gameInterval).listen(_onAccel);
    _gyroSub ??= gyroscopeEventStream(samplingPeriod: SensorInterval.gameInterval).listen(_onGyro);
  }

  /// Слушать только акселерометр (наклон) — до начала съёмки.
  void startTiltOnly() {
    _accelSub ??= accelerometerEventStream(samplingPeriod: SensorInterval.gameInterval).listen(_onAccel);
  }

  void stopGyro() {
    _gyroSub?.cancel();
    _gyroSub = null;
    _clock.stop();
  }

  void dispose() {
    stopGyro();
    _accelSub?.cancel();
    _accelSub = null;
  }

  void resetYaw() => _yawRad = 0;

  double get _g => math.sqrt(_gx * _gx + _gy * _gy + _gz * _gz);

  /// Доля гравитации, приходящаяся на ось Z (перпендикуляр экрану): 0 — телефон вертикально,
  /// 1 — лежит плашмя.
  double get flatness {
    final g = _g;
    return g == 0 ? 0 : _gz.abs() / g;
  }

  CameraPose get pose {
    final g = _g;
    if (g == 0) return CameraPose(-_yawRad * 180 / math.pi, 0, 0);
    final ux = _gx / g, uy = _gy / g, uz = _gz / g;
    // Задняя камера смотрит вдоль −Z телефона: наклон камеры = asin(−Z · вверх).
    final pitch = math.asin((-uz).clamp(-1.0, 1.0)) * 180 / math.pi;
    // Завал: угол между осью «вверх экрана» (+Y) и проекцией вертикали на плоскость экрана.
    final roll = math.atan2(-ux, uy) * 180 / math.pi;
    // Гироскоп правосторонний: поворот вправо (по часовой, если смотреть сверху) — отрицательный.
    return CameraPose(wrap180(-_yawRad * 180 / math.pi), pitch, roll);
  }

  void _onAccel(AccelerometerEvent e) {
    const k = 0.15; // низкочастотный фильтр — остаётся гравитация
    _gx += (e.x - _gx) * k;
    _gy += (e.y - _gy) * k;
    _gz += (e.z - _gz) * k;
  }

  void _onGyro(GyroscopeEvent e) {
    final now = _clock.elapsedMicroseconds;
    final dt = (now - _lastGyroMicros) / 1e6;
    _lastGyroMicros = now;
    totalSpeed = math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z);
    final g = _g;
    if (dt <= 0 || dt > 0.2 || g == 0) return;
    // Проекция угловой скорости на вертикаль = поворот вокруг вертикальной оси.
    final w = (e.x * _gx + e.y * _gy + e.z * _gz) / g;
    _yawRad += w * dt;
    verticalSpeed = w.abs();
    onUpdate?.call();
  }
}
