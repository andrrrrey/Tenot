import 'dart:math' as math;

import 'orientation_tracker.dart';

/// Режим съёмки салона.
enum InteriorMode {
  /// Один ряд по горизонту: 12 снимков через 30°. Потолок и пол остаются тёмными.
  quick,

  /// Три ряда: вверх 45° (8), горизонт (12), вниз 45° (8) — почти полная сфера.
  full,
}

/// Точка-цель: куда навести камеру для очередного снимка.
class ShotTarget {
  const ShotTarget(this.yaw, this.pitch);
  final double yaw;
  final double pitch;
}

/// Точки-цели для режима. Порядок — удобный для съёмки: сначала горизонт по кругу,
/// затем верхний и нижний ряды.
List<ShotTarget> interiorTargets(InteriorMode mode) {
  final ring = [for (var i = 0; i < 12; i++) ShotTarget(wrap180(i * 30.0), 0)];
  if (mode == InteriorMode.quick) return ring;
  return [
    ...ring,
    for (var i = 0; i < 8; i++) ShotTarget(wrap180(i * 45.0 + 22.5), 45),
    for (var i = 0; i < 8; i++) ShotTarget(wrap180(i * 45.0), -45),
  ];
}

/// Отклонение камеры от цели в градусах «по экрану»: по горизонтали с поправкой на наклон
/// (у верхнего/нижнего ряда один и тот же поворот выглядит короче), по вертикали — разница наклона.
({double dx, double dy}) offsetToTarget(CameraPose pose, ShotTarget t) {
  final dYaw = wrap180(t.yaw - pose.yaw);
  final dx = dYaw * math.cos((t.pitch + pose.pitch) / 2 * math.pi / 180);
  final dy = t.pitch - pose.pitch;
  return (dx: dx, dy: dy);
}

/// Ближайшая ещё не снятая цель (или null, если всё снято).
int? nearestTarget(CameraPose pose, List<ShotTarget> targets, Set<int> done) {
  int? best;
  var bestDist = double.infinity;
  for (var i = 0; i < targets.length; i++) {
    if (done.contains(i)) continue;
    final o = offsetToTarget(pose, targets[i]);
    final d = o.dx * o.dx + o.dy * o.dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/// Прицел «на точке»: попадание в пределах [tolerance] градусов.
bool isAimed(CameraPose pose, ShotTarget t, {double tolerance = 4}) {
  final o = offsetToTarget(pose, t);
  return o.dx.abs() <= tolerance && o.dy.abs() <= tolerance;
}
