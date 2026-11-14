import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'interior_plan.dart';
import 'orientation_tracker.dart';

/// Снимок салона с углами камеры в момент съёмки.
class InteriorShot {
  const InteriorShot(this.path, this.pose);
  final String path;
  final CameraPose pose;
}

/// «Умная камера» для панорамы салона: точки-цели на сфере вокруг пользователя,
/// автоснимок, когда прицел на точке и телефон неподвижен.
///
/// Возвращает через `Navigator.pop` снимки в порядке съёмки или `null`.
class InteriorCaptureScreen extends StatefulWidget {
  const InteriorCaptureScreen({super.key});

  @override
  State<InteriorCaptureScreen> createState() => _InteriorCaptureScreenState();
}

class _InteriorCaptureScreenState extends State<InteriorCaptureScreen> with WidgetsBindingObserver {
  CameraController? _camera;
  String? _cameraError;

  final OrientationTracker _tracker = OrientationTracker();
  InteriorMode _mode = InteriorMode.quick;
  List<ShotTarget> _targets = interiorTargets(InteriorMode.quick);

  bool _running = false;
  bool _busy = false;
  final Map<int, InteriorShot> _shots = {}; // индекс цели → снимок
  final List<int> _order = []; // порядок съёмки (для «переснять последний»)
  DateTime? _aimedSince;
  int _lastUiUpdateMs = 0;

  /// Сколько градусов помещается по ширине экрана (основная камера в портрете ≈ 50°).
  static const _viewDeg = 50.0;
  static const _maxRoll = 12.0;
  static const _stillSpeed = 0.15; // рад/с — «телефон неподвижен»
  static const _hold = Duration(milliseconds: 300);

  CameraPose get _pose => _tracker.pose;
  int? get _current => nearestTarget(_pose, _targets, _shots.keys.toSet());

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Портрет: по вертикали в кадр помещается больше — меньше рядов снимков.
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    _initCamera();
    _tracker.onUpdate = _onSensors;
    _tracker.start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tracker.dispose();
    _camera?.dispose();
    SystemChrome.setPreferredOrientations(const []);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final cam = _camera;
    if (cam == null || !cam.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      setState(() => _running = false);
      cam.dispose();
      _camera = null;
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      // 1080p: деталей достаточно для склейки, снимок ~1 МБ.
      final cam = CameraController(back, ResolutionPreset.veryHigh,
          enableAudio: false, imageFormatGroup: ImageFormatGroup.jpeg);
      await cam.initialize();
      await cam.lockCaptureOrientation(DeviceOrientation.portraitUp);
      if (!mounted) {
        await cam.dispose();
        return;
      }
      setState(() {
        _camera = cam;
        _cameraError = null;
      });
    } on CameraException catch (e) {
      setState(() => _cameraError = e.code == 'CameraAccessDenied'
          ? 'Нет доступа к камере. Разрешите его в настройках телефона.'
          : 'Не удалось открыть камеру');
    } catch (_) {
      setState(() => _cameraError = 'Камера недоступна на этом устройстве');
    }
  }

  // ── Датчики и автоснимок ─────────────────────────────────────────────────

  void _onSensors() {
    if (_running && !_busy) {
      final i = _current;
      final pose = _pose;
      final ready = i != null &&
          isAimed(pose, _targets[i]) &&
          _tracker.totalSpeed < _stillSpeed &&
          pose.roll.abs() < _maxRoll;
      if (ready) {
        _aimedSince ??= DateTime.now();
        if (DateTime.now().difference(_aimedSince!) >= _hold) _shoot(i);
      } else {
        _aimedSince = null;
      }
    }
    // Перерисовка ~30 раз в секунду — датчики шлют чаще.
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastUiUpdateMs > 33 && mounted) {
      _lastUiUpdateMs = now;
      setState(() {});
    }
  }

  Future<void> _shoot(int target) async {
    final cam = _camera;
    if (_busy || cam == null || !cam.value.isInitialized) return;
    _busy = true;
    _aimedSince = null;
    final pose = _pose; // углы — в момент спуска
    try {
      final file = await cam.takePicture();
      if (_shots.isEmpty) {
        // Одинаковая яркость и фокус на всех снимках — иначе на склейке видны полосы.
        try {
          await cam.setExposureMode(ExposureMode.locked);
          await cam.setFocusMode(FocusMode.locked);
        } catch (_) {
          // не все устройства поддерживают блокировку
        }
      }
      _shots[target] = InteriorShot(file.path, pose);
      _order.add(target);
      HapticFeedback.selectionClick();
      if (_shots.length == _targets.length) _finish();
    } catch (_) {
      // не получилось — попробуем снова, когда прицел снова встанет на точку
    } finally {
      _busy = false;
      if (mounted) setState(() {});
    }
  }

  void _start() {
    HapticFeedback.mediumImpact();
    _tracker.resetYaw(); // направление «вперёд» — где телефон смотрит сейчас
    setState(() {
      _shots.clear();
      _order.clear();
      _running = true;
    });
  }

  void _retakeLast() {
    if (_order.isEmpty) return;
    setState(() => _shots.remove(_order.removeLast()));
  }

  void _finish() {
    _running = false;
    HapticFeedback.heavyImpact();
    _camera?.setExposureMode(ExposureMode.auto).catchError((_) {});
    _camera?.setFocusMode(FocusMode.auto).catchError((_) {});
    if (mounted) Navigator.of(context).pop([for (final i in _order) _shots[i]!]);
  }

  String get _tip {
    final pose = _pose;
    final i = _current;
    if (i == null) return 'Готово';
    if (pose.roll.abs() >= _maxRoll) return 'Не заваливайте телефон набок';
    if (isAimed(pose, _targets[i])) {
      return _tracker.totalSpeed >= _stillSpeed ? 'Замрите на секунду' : 'Снимаем…';
    }
    if (_tracker.verticalSpeed > 0.8) return 'Медленнее';
    final left = _targets.length - _shots.length;
    return 'Наведите круг на белую точку · осталось $left';
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final cam = _camera;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (cam != null && cam.value.isInitialized)
            Center(child: CameraPreview(cam))
          else
            Center(
              child: _cameraError != null
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(_cameraError!,
                          textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
                    )
                  : const CircularProgressIndicator(color: Colors.white),
            ),
          if (cam != null && _running)
            IgnorePointer(
              child: CustomPaint(
                painter: _TargetsPainter(
                  pose: _pose,
                  targets: _targets,
                  done: _shots.keys.toSet(),
                  current: _current,
                  viewDeg: _viewDeg,
                ),
              ),
            ),
          SafeArea(
            child: Stack(children: [
              Positioned(
                top: 8,
                left: 8,
                child: IconButton.filledTonal(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ),
              if (_running)
                Positioned(
                  top: 64,
                  left: 16,
                  right: 16,
                  child: Center(child: _Banner(_tip, warn: _pose.roll.abs() >= _maxRoll)),
                ),
              if (_running)
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: Row(children: [
                    Text('${_shots.length} / ${_targets.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                    const Spacer(),
                    if (_order.isNotEmpty)
                      FilledButton.tonalIcon(
                        onPressed: _retakeLast,
                        icon: const Icon(Icons.undo, size: 18),
                        label: const Text('Переснять последний'),
                      ),
                  ]),
                ),
            ]),
          ),
          if (!_running && cam != null) _setupPanel(),
        ],
      ),
    );
  }

  Widget _setupPanel() {
    return Container(
      color: const Color(0x99000000),
      alignment: Alignment.center,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 460),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Салон 360°', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              const Text(
                'Сядьте в центр салона (например, между передними сиденьями) и не сдвигайтесь. '
                'Поворачивайте только телефон, держа его вертикально, и наводите круг в центре экрана '
                'на белые точки — снимки делаются сами. Начинайте, глядя вперёд, по ходу движения.',
                style: TextStyle(fontSize: 13, height: 1.35),
              ),
              const SizedBox(height: 12),
              SegmentedButton<InteriorMode>(
                segments: const [
                  ButtonSegment(value: InteriorMode.quick, label: Text('Быстро · 12')),
                  ButtonSegment(value: InteriorMode.full, label: Text('Полностью · 28')),
                ],
                selected: {_mode},
                onSelectionChanged: (s) => setState(() {
                  _mode = s.first;
                  _targets = interiorTargets(_mode);
                }),
              ),
              const SizedBox(height: 8),
              Text(
                _mode == InteriorMode.quick
                    ? 'Один круг по горизонту, около минуты. Потолок и пол будут затемнены.'
                    : 'Три круга: по горизонту, вверх и вниз — видно и потолок, и пол. 2–3 минуты.',
                style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _start,
                icon: const Icon(Icons.fiber_manual_record),
                label: const Text('Начать съёмку'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Точки-цели и прицел поверх камеры.
class _TargetsPainter extends CustomPainter {
  _TargetsPainter({
    required this.pose,
    required this.targets,
    required this.done,
    required this.current,
    required this.viewDeg,
  });

  final CameraPose pose;
  final List<ShotTarget> targets;
  final Set<int> done;
  final int? current;
  final double viewDeg;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final pxPerDeg = size.width / viewDeg;
    // Завал телефона поворачивает всю картинку целей вокруг центра.
    canvas.save();
    canvas.translate(c.dx, c.dy);
    canvas.rotate(-pose.roll * math.pi / 180);

    final white = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    final filled = Paint()..color = Colors.white;
    final ok = Paint()..color = const Color(0xFF22C55E);

    Offset? currentPos;
    for (var i = 0; i < targets.length; i++) {
      final o = offsetToTarget(pose, targets[i]);
      final p = Offset(o.dx * pxPerDeg, -o.dy * pxPerDeg);
      if (i == current) currentPos = p;
      if (p.dx.abs() > size.width || p.dy.abs() > size.height) continue;
      if (done.contains(i)) {
        canvas.drawCircle(p, 9, ok);
      } else {
        canvas.drawCircle(p, i == current ? 14 : 8, i == current ? filled : white);
      }
    }
    canvas.restore();

    // Прицел
    canvas.drawCircle(c, 26, white);

    // Стрелка к текущей цели, если она за краем экрана
    if (currentPos != null) {
      final rotated = _rotate(currentPos, -pose.roll * math.pi / 180);
      final half = Offset(size.width / 2 - 40, size.height / 2 - 120);
      if (rotated.dx.abs() > half.dx || rotated.dy.abs() > half.dy) {
        final dir = rotated / rotated.distance;
        final tip = c + Offset(dir.dx * math.min(half.dx, 140), dir.dy * math.min(half.dy, 140));
        final arrow = Path()
          ..moveTo(tip.dx + dir.dx * 18, tip.dy + dir.dy * 18)
          ..lineTo(tip.dx - dir.dy * 12, tip.dy + dir.dx * 12)
          ..lineTo(tip.dx + dir.dy * 12, tip.dy - dir.dx * 12)
          ..close();
        canvas.drawPath(arrow, filled);
      }
    }
  }

  static Offset _rotate(Offset p, double a) =>
      Offset(p.dx * math.cos(a) - p.dy * math.sin(a), p.dx * math.sin(a) + p.dy * math.cos(a));

  @override
  bool shouldRepaint(covariant _TargetsPainter old) => true;
}

class _Banner extends StatelessWidget {
  const _Banner(this.text, {this.warn = false});
  final String text;
  final bool warn;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: warn ? const Color(0xE6DC2626) : const Color(0xB8111827),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text,
            textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      );
}
