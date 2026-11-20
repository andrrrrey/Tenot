import 'dart:math' as math;

import '../../api/api.dart';
import 'interior_capture_screen.dart';
import 'orientation_tracker.dart';

String _newUploadId() => '${DateTime.now().millisecondsSinceEpoch}-${math.Random().nextInt(1 << 32)}';

/// Отправляет кадры 360°-обзора пачками и фиксирует загрузку.
/// [onProgress] получает число уже отправленных кадров.
Future<void> uploadSpin(Api api, int listingId, List<String> frames, {void Function(int sent)? onProgress}) async {
  const batch = 6; // ~2–3 МБ на запрос при 720p
  final uploadId = _newUploadId();
  for (var i = 0; i < frames.length; i += batch) {
    final part = frames.sublist(i, math.min(i + batch, frames.length));
    await api.uploadSpinFrames(listingId, uploadId, i, part);
    onProgress?.call(i + part.length);
  }
  await api.commitSpin(listingId, uploadId, frames.length);
}

/// Отправляет снимки салона и запускает склейку на сервере (результат — через GET /listings/:id/360).
Future<void> uploadInterior(Api api, int listingId, List<InteriorShot> shots,
    {void Function(int sent)? onProgress}) async {
  const batch = 4; // снимки ~1 МБ — запрос до ~5 МБ
  final uploadId = _newUploadId();
  for (var i = 0; i < shots.length; i += batch) {
    final part = shots.sublist(i, math.min(i + batch, shots.length));
    await api.uploadInteriorShots(listingId, uploadId, i, [for (final s in part) s.path]);
    onProgress?.call(i + part.length);
  }
  await api.commitInterior(listingId, uploadId, [
    for (final s in shots) CameraPose(wrap180(s.pose.yaw), s.pose.pitch, s.pose.roll).toJson(),
  ]);
}
