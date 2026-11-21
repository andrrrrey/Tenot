import 'dart:async';
import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme.dart';

/// Слайдер героя на главной: автопрокрутка, свайп, точки-индикаторы.
/// Слайды лежат в одном Stack — высота равна самому высокому слайду и не прыгает.
class HeroSlider extends StatefulWidget {
  const HeroSlider({super.key, required this.slides, this.interval = const Duration(seconds: 7)});

  final List<Widget> slides;
  final Duration interval;

  /// Автопрокрутка и анимация иллюстрации. В виджет-тестах выключается
  /// (test/flutter_test_config.dart), иначе pumpAndSettle никогда не завершится.
  static bool autoplay = true;

  @override
  State<HeroSlider> createState() => _HeroSliderState();
}

class _HeroSliderState extends State<HeroSlider> {
  int _index = 0;
  Timer? _timer;

  int get _count => widget.slides.length;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _restart() {
    _timer?.cancel();
    if (_count < 2 || !HeroSlider.autoplay) return;
    _timer = Timer(widget.interval, () {
      if (mounted) _go(_index + 1);
    });
  }

  void _go(int i) {
    setState(() => _index = ((i % _count) + _count) % _count);
    _restart();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragEnd: (d) {
        final v = d.primaryVelocity ?? 0;
        if (v < -150) {
          _go(_index + 1);
        } else if (v > 150) {
          _go(_index - 1);
        }
      },
      child: Stack(
        alignment: AlignmentDirectional.centerStart,
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < _count; i++)
            TickerMode(
              enabled: i == _index,
              child: IgnorePointer(
                ignoring: i != _index,
                child: AnimatedOpacity(
                  opacity: i == _index ? 1 : 0,
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.easeOut,
                  child: AnimatedSlide(
                    offset: i == _index ? Offset.zero : const Offset(0.05, 0),
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeOut,
                    child: widget.slides[i],
                  ),
                ),
              ),
            ),
          // точки — поверх, в правом нижнем углу, чтобы не добавлять высоты
          if (_count > 1)
            PositionedDirectional(
              end: -4,
              bottom: -6,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var i = 0; i < _count; i++)
                    GestureDetector(
                      onTap: () => _go(i),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: i == _index ? 28 : 8,
                          height: 8,
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            color: T.brand.withValues(alpha: 0.22),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          alignment: Alignment.centerLeft,
                          child: i == _index && HeroSlider.autoplay
                              ? TweenAnimationBuilder<double>(
                                  key: ValueKey(_index),
                                  tween: Tween(begin: 0, end: 1),
                                  duration: widget.interval,
                                  builder: (_, v, _) => FractionallySizedBox(
                                    widthFactor: v,
                                    heightFactor: 1,
                                    child: const ColoredBox(color: T.brand),
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Картинка категории «Транспорт» (или корневой авто-категории).
String? findTransportImage(List<Category>? cats) {
  if (cats == null) return null;
  for (final c in cats) {
    if (c.name.toLowerCase().replaceAll('ё', 'е').trim() == 'транспорт' && (c.imageUrl ?? '').isNotEmpty) {
      return c.imageUrl;
    }
  }
  for (final c in cats) {
    if (c.hasCarFilter && (c.imageUrl ?? '').isNotEmpty) return c.imageUrl;
  }
  return null;
}

/// Иллюстрация «панорама 360°»: фото автомобиля (картинка категории «Транспорт»)
/// и камера, облетающая его по орбите. За машиной камера уходит под фото и
/// уменьшается, перед машиной — поверх и крупнее; пройденные точки съёмки
/// на орбите подсвечиваются.
class Car360Illustration extends StatefulWidget {
  const Car360Illustration({super.key, this.carUrl});

  /// Полный URL картинки автомобиля.
  final String? carUrl;

  @override
  State<Car360Illustration> createState() => _Car360IllustrationState();
}

// Геометрия в координатах 440×260 (как в веб-версии Car360Illustration.tsx).
const _w = 440.0;
const _h = 260.0;
const _cx = 220.0;
const _cy = 170.0;
const _rx = 195.0;
const _ry = 58.0;
const _carRect = Rect.fromLTWH(92, 32, 256, 190);
const _carCenter = Offset(_cx, 140);
const _camW = 64.0;
const _camH = _camW * 211 / 240;
const _shots = 24;

Offset _pt(double t) => Offset(_cx + _rx * math.cos(t), _cy + _ry * math.sin(t));
double _camScale(double t) => 0.62 + 0.5 * ((math.sin(t) + 1) / 2);
Offset _camCenter(double t) => _pt(t) - Offset(0, 22 * _camScale(t));

class _Car360IllustrationState extends State<Car360Illustration> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 7), value: 0.15);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = (MediaQuery.maybeDisableAnimationsOf(context) ?? false) || !HeroSlider.autoplay;
    if (reduce) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Widget _camera(double t, double k) {
    final s = _camScale(t);
    final c = _camCenter(t);
    final cos = math.cos(t);
    // объектив на картинке смотрит влево: справа от машины — как есть, слева — зеркально
    final flip = (cos >= 0 ? 1.0 : -1.0) * math.max(0.35, math.min(1.0, cos.abs() * 2.4));
    final w = _camW * s * k;
    final h = _camH * s * k;
    return Positioned(
      left: c.dx * k - w / 2,
      top: c.dy * k - h / 2,
      width: w,
      height: h,
      child: Transform(
        alignment: Alignment.center,
        transform: Matrix4.diagonal3Values(flip, 1, 1),
        child: Image.asset('assets/images/camera_360.webp', fit: BoxFit.contain),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.carUrl;
    return Semantics(
      label: 'Камера снимает автомобиль по кругу — панорама 360°',
      child: AspectRatio(
        aspectRatio: _w / _h,
        child: LayoutBuilder(builder: (context, box) {
          final k = box.maxWidth / _w;
          final car = Positioned(
            left: _carRect.left * k,
            top: _carRect.top * k,
            width: _carRect.width * k,
            height: _carRect.height * k,
            child: url == null
                ? const SizedBox()
                : CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.contain,
                    httpHeaders: const {'user-agent': 'TenotApp/1.0 (Flutter)'},
                    fadeInDuration: const Duration(milliseconds: 200),
                    errorWidget: (_, _, _) => const SizedBox(),
                  ),
          );
          return AnimatedBuilder(
            animation: _c,
            child: car,
            builder: (context, carChild) {
              final t = _c.value * math.pi * 2;
              final behind = math.sin(t) < 0;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(child: CustomPaint(painter: _OrbitPainter(t, back: true))),
                  if (behind) _camera(t, k),
                  carChild!,
                  Positioned.fill(child: CustomPaint(painter: _OrbitPainter(t, back: false))),
                  if (!behind) _camera(t, k),
                ],
              );
            },
          );
        }),
      ),
    );
  }
}

/// Задний слой (свечение, дальняя половина орбиты, луч, тени) или передний
/// (ближняя половина орбиты, значок 360°).
class _OrbitPainter extends CustomPainter {
  _OrbitPainter(this.t, {required this.back});

  final double t;
  final bool back;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / _w, size.height / _h);
    final behind = math.sin(t) < 0;

    if (back) {
      final glow = Rect.fromCenter(center: const Offset(_cx, _cy - 20), width: 430, height: 250);
      canvas.drawOval(
        glow,
        Paint()..shader = const RadialGradient(colors: [Color(0x292563EB), Color(0x002563EB)]).createShader(glow),
      );
      _dashedArc(canvas, math.pi, math.pi * 2, T.brand.withValues(alpha: 0.35), 2);
      _shotsDots(canvas);

      // луч обзора камеры к автомобилю
      final cam = _camCenter(t);
      final d = _carCenter - cam;
      final len = d.distance == 0 ? 1.0 : d.distance;
      final n = Offset(-d.dy / len, d.dx / len);
      const spread = 78.0;
      final cone = Path()
        ..moveTo(cam.dx, cam.dy)
        ..lineTo(_carCenter.dx + n.dx * spread, _carCenter.dy + n.dy * spread * 0.55)
        ..lineTo(_carCenter.dx - n.dx * spread, _carCenter.dy - n.dy * spread * 0.55)
        ..close();
      canvas.drawPath(cone, Paint()..color = T.brand.withValues(alpha: 0.10));

      if (behind) _camShadow(canvas);
      canvas.drawOval(Rect.fromCenter(center: Offset(_cx, _carRect.bottom - 6), width: 224, height: 18),
          Paint()..color = const Color(0x1A111827));
    } else {
      _dashedArc(canvas, 0, math.pi, T.brand.withValues(alpha: 0.55), 2.5);
      _shotsDots(canvas);
      if (!behind) _camShadow(canvas);
      _badge(canvas);
    }
    canvas.restore();
  }

  void _camShadow(Canvas canvas) {
    final s = _camScale(t);
    canvas.drawOval(Rect.fromCenter(center: _pt(t) + const Offset(0, 2), width: 40 * s, height: 10 * s),
        Paint()..color = const Color(0x24111827));
  }

  void _dashedArc(Canvas canvas, double from, double to, Color color, double width) {
    final p = Paint()
      ..color = color
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    const step = 0.045;
    var a = from;
    var on = true;
    while (a < to) {
      final b = math.min(a + step, to);
      if (on) canvas.drawLine(_pt(a), _pt(b), p);
      on = !on;
      a = b;
    }
  }

  void _shotsDots(Canvas canvas) {
    for (var i = 0; i < _shots; i++) {
      final a = i / _shots * math.pi * 2;
      final p = _pt(a);
      if ((p.dy < _cy) != back) continue;
      final done = a <= t;
      final r = done ? (back ? 3.0 : 3.4) : (back ? 2.2 : 2.4);
      canvas.drawCircle(p, r, Paint()..color = done ? T.brand : T.brand.withValues(alpha: back ? 0.25 : 0.3));
    }
  }

  void _badge(Canvas canvas) {
    const c = Offset(392, 26);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: c, width: 64, height: 32), const Radius.circular(16)),
      Paint()..color = T.brand,
    );
    final tp = TextPainter(
      text: const TextSpan(
        text: '360°',
        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, c - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant _OrbitPainter old) => old.t != t || old.back != back;
}
