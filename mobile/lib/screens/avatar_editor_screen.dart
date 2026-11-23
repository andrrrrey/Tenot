import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../theme.dart';

/// Выбирает фото из галереи и открывает редактор аватара.
/// Возвращает путь к готовому квадратному PNG или null, если пользователь передумал.
Future<String?> pickAndEditAvatar(BuildContext context) async {
  final file = await pickAvatarSource();
  if (file == null || !context.mounted) return null;
  return Navigator.of(context).push<String>(
    MaterialPageRoute(fullscreenDialog: true, builder: (_) => AvatarEditorScreen(path: file)),
  );
}

Future<String?> pickAvatarSource() async {
  final f = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2048, maxHeight: 2048, imageQuality: 95);
  return f?.path;
}

/// Доля короткой стороны области просмотра, которую занимает круг.
const _circleRatio = 0.86;
const _minZoom = 1.0;
const _maxZoom = 5.0;
const _outputSize = 640;

/// Редактор аватара как в Telegram / Авито: круг обрезки неподвижен по центру,
/// фото двигается под ним пальцем, масштабируется щипком, двойным тапом
/// или ползунком. Фото всегда полностью закрывает круг.
class AvatarEditorScreen extends StatefulWidget {
  const AvatarEditorScreen({super.key, required this.path});
  final String path;

  @override
  State<AvatarEditorScreen> createState() => _AvatarEditorScreenState();
}

class _AvatarEditorScreenState extends State<AvatarEditorScreen> {
  late String _path = widget.path;
  ui.Image? _image;
  Object? _error;
  bool _saving = false;

  double _zoom = 1;
  Offset _offset = Offset.zero; // центр фото относительно центра круга, в логических px
  double _diameter = 0;

  // Начало жеста.
  double _startZoom = 1;
  Offset _startOffset = Offset.zero;
  Offset _startFocal = Offset.zero;
  Size _viewport = Size.zero;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _image?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _error = null;
      _image?.dispose();
      _image = null;
    });
    try {
      final bytes = await File(_path).readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      codec.dispose();
      if (!mounted) {
        frame.image.dispose();
        return;
      }
      setState(() {
        _image = frame.image;
        _zoom = 1;
        _offset = Offset.zero;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  double get _baseScale {
    final img = _image;
    if (img == null || _diameter <= 0) return 1;
    return _diameter / math.min(img.width, img.height);
  }

  Size get _displaySize {
    final img = _image!;
    final s = _baseScale * _zoom;
    return Size(img.width * s, img.height * s);
  }

  Offset _clampOffset(Offset o, double zoom) {
    final img = _image;
    if (img == null) return Offset.zero;
    final s = _baseScale * zoom;
    final mx = math.max(0.0, (img.width * s - _diameter) / 2);
    final my = math.max(0.0, (img.height * s - _diameter) / 2);
    return Offset(o.dx.clamp(-mx, mx), o.dy.clamp(-my, my));
  }

  /// Масштаб вокруг точки focal (относительно центра круга).
  void _zoomTo(double next, [Offset focal = Offset.zero]) {
    final nz = next.clamp(_minZoom, _maxZoom);
    final k = nz / _zoom;
    setState(() {
      _offset = _clampOffset(focal - (focal - _offset) * k, nz);
      _zoom = nz;
    });
  }

  Offset _toCenter(Offset local) => local - Offset(_viewport.width / 2, _viewport.height / 2);

  void _onScaleStart(ScaleStartDetails d) {
    _startZoom = _zoom;
    _startOffset = _offset;
    _startFocal = _toCenter(d.localFocalPoint);
  }

  void _onScaleUpdate(ScaleUpdateDetails d) {
    if (_image == null) return;
    final nz = (_startZoom * d.scale).clamp(_minZoom, _maxZoom);
    final k = nz / _startZoom;
    final focal = _toCenter(d.localFocalPoint);
    // Точка фото под пальцами в начале жеста остаётся под пальцами.
    setState(() {
      _zoom = nz;
      _offset = _clampOffset(focal - (_startFocal - _startOffset) * k, nz);
    });
  }

  Offset? _doubleTapAt;

  void _onDoubleTap() {
    final focal = _doubleTapAt != null ? _toCenter(_doubleTapAt!) : Offset.zero;
    _zoomTo(_zoom > 1.5 ? 1 : 2.5, focal);
  }

  Future<void> _pickAnother() async {
    final p = await pickAvatarSource();
    if (p == null || !mounted) return;
    _path = p;
    await _load();
  }

  Future<void> _save() async {
    final img = _image;
    if (img == null || _saving) return;
    setState(() => _saving = true);
    try {
      final scale = _baseScale * _zoom;
      final size = _diameter / scale; // сторона квадрата вокруг круга, в px исходника
      final disp = _displaySize;
      final left = (disp.width / 2 - _offset.dx - _diameter / 2) / scale;
      final top = (disp.height / 2 - _offset.dy - _diameter / 2) / scale;
      final out = math.min(_outputSize, size.round()).clamp(1, _outputSize);

      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawRect(Rect.fromLTWH(0, 0, out.toDouble(), out.toDouble()), Paint()..color = Colors.white);
      canvas.drawImageRect(
        img,
        Rect.fromLTWH(left, top, size, size),
        Rect.fromLTWH(0, 0, out.toDouble(), out.toDouble()),
        Paint()
          ..filterQuality = FilterQuality.high
          ..isAntiAlias = true,
      );
      final picture = recorder.endRecording();
      final rendered = await picture.toImage(out, out);
      picture.dispose();
      final data = await rendered.toByteData(format: ui.ImageByteFormat.png);
      rendered.dispose();
      if (data == null) throw Exception('Не удалось обработать фото');

      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/avatar_${DateTime.now().millisecondsSinceEpoch}.png');
      await file.writeAsBytes(data.buffer.asUint8List(), flush: true);
      if (mounted) Navigator.of(context).pop(file.path);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          elevation: 0,
          title: const Text('Фото профиля', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
          leading: IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Отмена',
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: Column(children: [
          Expanded(child: _cropArea()),
          _controls(),
        ]),
      ),
    );
  }

  Widget _cropArea() {
    if (_error != null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Не удалось открыть это изображение.\nВыберите другое фото.',
              textAlign: TextAlign.center, style: TextStyle(color: Colors.white70, fontSize: 15)),
        ),
      );
    }
    final img = _image;
    if (img == null) return const Center(child: CircularProgressIndicator(color: Colors.white));

    return LayoutBuilder(builder: (context, c) {
      final viewport = Size(c.maxWidth, c.maxHeight);
      final diameter = math.min(viewport.width, viewport.height) * _circleRatio;
      if (viewport != _viewport || diameter != _diameter) {
        _viewport = viewport;
        _diameter = diameter;
        _offset = _clampOffset(_offset, _zoom);
      }
      final disp = _displaySize;
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onScaleStart: _onScaleStart,
        onScaleUpdate: _onScaleUpdate,
        onDoubleTapDown: (d) => _doubleTapAt = d.localPosition,
        onDoubleTap: _onDoubleTap,
        child: ClipRect(
          child: Stack(children: [
            Positioned(
              left: viewport.width / 2 + _offset.dx - disp.width / 2,
              top: viewport.height / 2 + _offset.dy - disp.height / 2,
              width: disp.width,
              height: disp.height,
              child: RawImage(image: img, fit: BoxFit.fill, filterQuality: FilterQuality.medium),
            ),
            Positioned.fill(
              child: IgnorePointer(child: CustomPaint(painter: _CircleMaskPainter(diameter))),
            ),
          ]),
        ),
      );
    });
  }

  Widget _controls() {
    final ready = _image != null && !_saving;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            IconButton(
              onPressed: ready && _zoom > _minZoom ? () => _zoomTo(_zoom / 1.2) : null,
              icon: const Icon(Icons.remove),
              color: Colors.white,
              disabledColor: Colors.white24,
              tooltip: 'Уменьшить',
            ),
            Expanded(
              child: Slider(
                value: _zoom,
                min: _minZoom,
                max: _maxZoom,
                activeColor: Colors.white,
                inactiveColor: Colors.white24,
                onChanged: ready ? (v) => _zoomTo(v) : null,
              ),
            ),
            IconButton(
              onPressed: ready && _zoom < _maxZoom ? () => _zoomTo(_zoom * 1.2) : null,
              icon: const Icon(Icons.add),
              color: Colors.white,
              disabledColor: Colors.white24,
              tooltip: 'Увеличить',
            ),
          ]),
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text('Перемещайте и масштабируйте фото',
                style: TextStyle(color: Colors.white60, fontSize: 13)),
          ),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _saving ? null : _pickAnother,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white38),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
                ),
                child: const Text('Выбрать другое'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: ready ? _save : null,
                style: FilledButton.styleFrom(
                  backgroundColor: T.brand,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rSm)),
                ),
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Сохранить'),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

/// Затемнение вокруг круга и белая окантовка круга.
class _CircleMaskPainter extends CustomPainter {
  _CircleMaskPainter(this.diameter);
  final double diameter;

  @override
  void paint(Canvas canvas, Size size) {
    final circle = Rect.fromCircle(center: size.center(Offset.zero), radius: diameter / 2);
    final mask = Path()
      ..fillType = PathFillType.evenOdd
      ..addRect(Offset.zero & size)
      ..addOval(circle);
    canvas.drawPath(mask, Paint()..color = const Color(0x99000000));
    canvas.drawOval(
      circle,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = Colors.white70,
    );
  }

  @override
  bool shouldRepaint(_CircleMaskPainter old) => old.diameter != diameter;
}
