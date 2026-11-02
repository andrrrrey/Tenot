import 'dart:async';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Режим съёмки 360°-вращения.
enum SpinCaptureMode {
  /// Обход вокруг объекта (машины): кадр каждые 360/N градусов по гироскопу.
  walkAround,

  /// Поворотный стол / вращение товара перед неподвижным телефоном: кадр по таймеру.
  turntable,
}

/// «Умная камера 360°»: серия кадров с подсказками по ракурсу.
///
/// Возвращает через `Navigator.pop` список путей к снятым кадрам (по порядку)
/// или `null`, если пользователь вышел.
class SpinCaptureScreen extends StatefulWidget {
  const SpinCaptureScreen({super.key});

  @override
  State<SpinCaptureScreen> createState() => _SpinCaptureScreenState();
}

class _SpinCaptureScreenState extends State<SpinCaptureScreen> with WidgetsBindingObserver {
  CameraController? _camera;
  String? _cameraError;

  // Настройки (выбираются до старта)
  SpinCaptureMode _mode = SpinCaptureMode.walkAround;
  int _frameCount = 36;
  static const _turntableInterval = Duration(milliseconds: 1500);

  // Состояние съёмки
  bool _running = false;
  bool _busy = false;
  final List<String> _frames = [];

  // Датчики
  StreamSubscription<GyroscopeEvent>? _gyroSub;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  Timer? _turntableTimer;
  final Stopwatch _clock = Stopwatch();
  int _lastGyroMicros = 0;
  // Гравитация (сглаженный акселерометр) — чтобы вращение считать вокруг вертикали
  // при любом положении телефона.
  double _gx = 0, _gy = 0, _gz = 9.8;
  double _angle = 0; // накопленный поворот вокруг вертикали, радианы (со знаком)
  double _speed = 0; // текущая угловая скорость вокруг вертикали, рад/с
  bool _tilted = false;

  double get _step => 2 * math.pi / _frameCount;
  double get _progress => (_frames.length / _frameCount).clamp(0, 1).toDouble();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Машина широкая — снимаем горизонтально.
    SystemChrome.setPreferredOrientations([DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    _initCamera();
    _accelSub = accelerometerEventStream(samplingPeriod: SensorInterval.gameInterval).listen(_onAccel);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopSensors();
    _accelSub?.cancel();
    _camera?.dispose();
    SystemChrome.setPreferredOrientations(const []);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final cam = _camera;
    if (cam == null || !cam.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      _pause();
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
      // 720p: кадр ~200–400 КБ — сервер не ресайзит, загрузка быстрая.
      final cam = CameraController(back, ResolutionPreset.high,
          enableAudio: false, imageFormatGroup: ImageFormatGroup.jpeg);
      await cam.initialize();
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

  // ── Датчики ──────────────────────────────────────────────────────────────

  void _onAccel(AccelerometerEvent e) {
    const k = 0.1; // низкочастотный фильтр
    _gx += (e.x - _gx) * k;
    _gy += (e.y - _gy) * k;
    _gz += (e.z - _gz) * k;
    final g = math.sqrt(_gx * _gx + _gy * _gy + _gz * _gz);
    // Ось Z — перпендикуляр к экрану. Если на неё приходится много гравитации,
    // телефон сильно наклонён вперёд/назад (камера смотрит в пол/небо).
    final tilted = g > 0 && (_gz.abs() / g) > 0.5;
    if (tilted != _tilted && mounted) setState(() => _tilted = tilted);
  }

  void _onGyro(GyroscopeEvent e) {
    final now = _clock.elapsedMicroseconds;
    final dt = (now - _lastGyroMicros) / 1e6;
    _lastGyroMicros = now;
    if (dt <= 0 || dt > 0.2) return;
    final g = math.sqrt(_gx * _gx + _gy * _gy + _gz * _gz);
    if (g == 0) return;
    // Проекция угловой скорости на вертикаль = поворот вокруг вертикальной оси.
    final w = (e.x * _gx + e.y * _gy + e.z * _gz) / g;
    _angle += w * dt;
    _speed = w.abs();
    if (_mode == SpinCaptureMode.walkAround && _running) {
      // Направление обхода любое — считаем по модулю.
      if (_angle.abs() >= _frames.length * _step) _shoot();
    }
    if (mounted) setState(() {});
  }

  void _startSensors() {
    _clock
      ..reset()
      ..start();
    _lastGyroMicros = 0;
    _gyroSub = gyroscopeEventStream(samplingPeriod: SensorInterval.gameInterval).listen(_onGyro);
  }

  void _stopSensors() {
    _gyroSub?.cancel();
    _gyroSub = null;
    _turntableTimer?.cancel();
    _turntableTimer = null;
    _clock.stop();
  }

  // ── Съёмка ───────────────────────────────────────────────────────────────

  Future<void> _start() async {
    final cam = _camera;
    if (cam == null || !cam.value.isInitialized) return;
    HapticFeedback.mediumImpact();
    setState(() {
      _frames.clear();
      _angle = 0;
      _running = true;
    });
    await _shoot(); // первый кадр — сразу; заодно фиксируем экспозицию
    if (_mode == SpinCaptureMode.walkAround) {
      _startSensors();
    } else {
      _turntableTimer = Timer.periodic(_turntableInterval, (_) => _shoot());
    }
  }

  void _pause() {
    _stopSensors();
    if (mounted) setState(() => _running = false);
  }

  Future<void> _shoot() async {
    final cam = _camera;
    if (_busy || cam == null || !cam.value.isInitialized || _frames.length >= _frameCount) return;
    _busy = true;
    try {
      final file = await cam.takePicture();
      if (_frames.isEmpty) {
        // Одинаковая яркость и фокус по всем кадрам — иначе при вращении «мигает».
        try {
          await cam.setExposureMode(ExposureMode.locked);
          await cam.setFocusMode(FocusMode.locked);
        } catch (_) {
          // не все устройства поддерживают блокировку
        }
      }
      _frames.add(file.path);
      HapticFeedback.selectionClick();
      if (_frames.length >= _frameCount) _finish();
    } catch (_) {
      // кадр пропущен — попробуем на следующем шаге
    } finally {
      _busy = false;
      if (mounted) setState(() {});
    }
  }

  void _finish() {
    _stopSensors();
    _running = false;
    HapticFeedback.heavyImpact();
    _camera?.setExposureMode(ExposureMode.auto).catchError((_) {});
    _camera?.setFocusMode(FocusMode.auto).catchError((_) {});
    if (mounted) Navigator.of(context).pop(List<String>.from(_frames));
  }

  String? get _tip {
    if (!_running) return null;
    if (_tilted) return 'Держите телефон вертикально';
    if (_mode == SpinCaptureMode.walkAround) {
      if (_speed > 0.7) return 'Медленнее';
      if (_frames.length <= 1) return 'Медленно обходите объект, держа его в центре кадра';
      return 'Отлично, продолжайте обход';
    }
    return 'Медленно поворачивайте объект';
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
          // Рамка-ориентир: объект держим в центре
          if (cam != null && _running)
            IgnorePointer(
              child: Center(
                child: FractionallySizedBox(
                  widthFactor: 0.7,
                  heightFactor: 0.6,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white54, width: 2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
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
              if (_tip != null)
                Positioned(
                  top: 14,
                  left: 0,
                  right: 0,
                  child: Center(child: _Banner(_tip!, warn: _tilted || _speed > 0.7)),
                ),
              Positioned(right: 16, top: 0, bottom: 0, child: Center(child: _controls())),
            ]),
          ),
          if (!_running && cam != null) _setupPanel(),
        ],
      ),
    );
  }

  Widget _controls() {
    final degrees = (_angle.abs() * 180 / math.pi).clamp(0, 360).round();
    return Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
        width: 96,
        height: 96,
        child: Stack(alignment: Alignment.center, children: [
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: _progress,
              strokeWidth: 6,
              color: Colors.white,
              backgroundColor: Colors.white24,
            ),
          ),
          Column(mainAxisSize: MainAxisSize.min, children: [
            Text('${_frames.length}/$_frameCount',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
            if (_mode == SpinCaptureMode.walkAround && _running)
              Text('$degrees°', style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ]),
        ]),
      ),
      const SizedBox(height: 14),
      if (_running) ...[
        FilledButton.tonal(onPressed: _pause, child: const Text('Пауза')),
        if (_frames.length >= 12) ...[
          const SizedBox(height: 8),
          FilledButton(onPressed: _finish, child: const Text('Готово')),
        ],
      ],
    ]);
  }

  Widget _setupPanel() {
    final resume = _frames.isNotEmpty;
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
              const Text('Съёмка 360°', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              SegmentedButton<SpinCaptureMode>(
                segments: const [
                  ButtonSegment(value: SpinCaptureMode.walkAround, label: Text('Обход'), icon: Icon(Icons.directions_walk)),
                  ButtonSegment(value: SpinCaptureMode.turntable, label: Text('Поворот товара'), icon: Icon(Icons.rotate_right)),
                ],
                selected: {_mode},
                onSelectionChanged: resume ? null : (s) => setState(() => _mode = s.first),
              ),
              const SizedBox(height: 10),
              Text(
                _mode == SpinCaptureMode.walkAround
                    ? 'Встаньте в 2–3 м от машины. Держите телефон горизонтально на уровне груди и медленно '
                        'обойдите её по кругу, не отрывая от центра кадра. Кадры снимаются автоматически.'
                    : 'Закрепите телефон неподвижно. Ставьте товар на стол и медленно поворачивайте — '
                        'кадр снимается каждые 1,5 секунды. Удобно на поворотном столике.',
                style: const TextStyle(fontSize: 13, height: 1.35),
              ),
              const SizedBox(height: 12),
              Row(children: [
                const Text('Кадров:', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(width: 10),
                for (final n in const [24, 36])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$n'),
                      selected: _frameCount == n,
                      onSelected: resume ? null : (_) => setState(() => _frameCount = n),
                    ),
                  ),
              ]),
              const SizedBox(height: 14),
              if (resume)
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() {
                        _frames.clear();
                        _angle = 0;
                      }),
                      child: const Text('Заново'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        setState(() => _running = true);
                        if (_mode == SpinCaptureMode.walkAround) {
                          _startSensors();
                        } else {
                          _turntableTimer = Timer.periodic(_turntableInterval, (_) => _shoot());
                        }
                      },
                      child: Text('Продолжить (${_frames.length}/$_frameCount)'),
                    ),
                  ),
                ])
              else
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
        child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      );
}
