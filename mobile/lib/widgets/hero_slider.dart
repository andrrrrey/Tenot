import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

/// Слайдер героя на главной: автопрокрутка, свайп, точки-индикаторы.
/// Слайды лежат в одном Stack — высота равна самому высокому слайду и не прыгает.
class HeroSlider extends StatefulWidget {
  const HeroSlider({super.key, required this.slides, this.interval = const Duration(seconds: 7)});

  final List<Widget> slides;
  final Duration interval;

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
    if (_count < 2) return;
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            alignment: AlignmentDirectional.centerStart,
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
            ],
          ),
          if (_count > 1) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _count; i++)
                  GestureDetector(
                    onTap: () => _go(i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: i == _index ? 32 : 8,
                        height: 8,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: T.brand.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        alignment: Alignment.centerLeft,
                        child: i == _index
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
          ],
        ],
      ),
    );
  }
}

/// Иллюстрация «панорама 360°»: автомобиль и камера, облетающая его по кругу.
/// Камера за машиной рисуется под ней, перед машиной — поверх; пройденные
/// точки съёмки на орбите подсвечиваются.
class Car360Illustration extends StatefulWidget {
  const Car360Illustration({super.key});

  @override
  State<Car360Illustration> createState() => _Car360IllustrationState();
}

class _Car360IllustrationState extends State<Car360Illustration> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 6), value: 0.175)..repeat();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
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

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Камера снимает автомобиль по кругу — панорама 360°',
      child: AspectRatio(
        aspectRatio: 440 / 260,
        child: CustomPaint(painter: _Car360Painter(_c)),
      ),
    );
  }
}

class _Car360Painter extends CustomPainter {
  _Car360Painter(this.anim) : super(repaint: anim);

  final Animation<double> anim;

  static const cx = 220.0;
  static const cy = 150.0;
  static const rx = 185.0;
  static const ry = 64.0;
  static const shots = 24;

  static Offset _pt(double t) => Offset(cx + rx * math.cos(t), cy + ry * math.sin(t));

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 440, size.height / 260);

    final t = anim.value * math.pi * 2;
    final behind = math.sin(t) < 0;

    // мягкое свечение
    canvas.drawOval(
      Rect.fromCenter(center: const Offset(cx, cy), width: 430, height: 240),
      Paint()
        ..shader = const RadialGradient(colors: [Color(0x292563EB), Color(0x002563EB)])
            .createShader(Rect.fromCenter(center: const Offset(cx, cy), width: 430, height: 240)),
    );

    // задняя половина орбиты
    _dashedArc(canvas, math.pi, math.pi * 2, T.brand.withValues(alpha: 0.35), 2);
    _shots(canvas, t, back: true);

    // луч обзора
    final cam = _pt(t);
    const target = Offset(cx, 138);
    final d = target - cam;
    final len = d.distance == 0 ? 1.0 : d.distance;
    final n = Offset(-d.dy / len, d.dx / len);
    const spread = 70.0;
    final cone = Path()
      ..moveTo(cam.dx, cam.dy)
      ..lineTo(target.dx + n.dx * spread, target.dy + n.dy * spread * 0.6)
      ..lineTo(target.dx - n.dx * spread, target.dy - n.dy * spread * 0.6)
      ..close();
    canvas.drawPath(cone, Paint()..color = T.brand.withValues(alpha: 0.10));

    if (behind) _camera(canvas, t);
    _car(canvas);

    // передняя половина орбиты
    _dashedArc(canvas, 0, math.pi, T.brand.withValues(alpha: 0.55), 2.5);
    _shots(canvas, t, back: false);
    if (!behind) _camera(canvas, t);

    _badge(canvas);
    canvas.restore();
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

  void _shots(Canvas canvas, double t, {required bool back}) {
    for (var i = 0; i < shots; i++) {
      final a = i / shots * math.pi * 2;
      final p = _pt(a);
      if ((p.dy < cy) != back) continue;
      final done = a <= t;
      final r = done ? (back ? 3.0 : 3.4) : (back ? 2.2 : 2.4);
      canvas.drawCircle(p, r, Paint()..color = done ? T.brand : T.brand.withValues(alpha: back ? 0.25 : 0.3));
    }
  }

  void _camera(Canvas canvas, double t) {
    final p = _pt(t);
    final s = 0.82 + 0.28 * ((math.sin(t) + 1) / 2);
    canvas.save();
    canvas.translate(p.dx, p.dy);
    canvas.scale(s);
    canvas.drawOval(Rect.fromCenter(center: const Offset(0, 20), width: 36, height: 8),
        Paint()..color = const Color(0x1F111827));
    canvas.drawRRect(RRect.fromLTRBR(-9, -19, 3, -12, const Radius.circular(2)), Paint()..color = T.brandDark);
    canvas.drawRRect(RRect.fromLTRBR(-19, -14, 19, 13, const Radius.circular(7)), Paint()..color = T.brand);
    canvas.drawCircle(Offset.zero, 9.5, Paint()..color = Colors.white);
    canvas.drawCircle(Offset.zero, 6.5, Paint()..color = const Color(0xFF1E3A8A));
    canvas.drawCircle(const Offset(-2, -2), 2, Paint()..color = const Color(0xFF93C5FD));
    canvas.drawCircle(const Offset(13, -9), 2, Paint()..color = const Color(0xFFBFDBFE));
    canvas.restore();
  }

  void _car(Canvas canvas) {
    canvas.drawOval(Rect.fromCenter(center: const Offset(222, 194), width: 284, height: 22),
        Paint()..color = const Color(0x1A111827));

    final body = Path()
      ..moveTo(92, 170)
      ..lineTo(92, 144)
      ..quadraticBezierTo(94, 129, 112, 125)
      ..lineTo(150, 119)
      ..lineTo(182, 93)
      ..quadraticBezierTo(190, 86, 204, 86)
      ..lineTo(262, 86)
      ..quadraticBezierTo(276, 86, 286, 96)
      ..lineTo(312, 120)
      ..lineTo(338, 126)
      ..quadraticBezierTo(354, 130, 355, 146)
      ..lineTo(355, 170)
      ..quadraticBezierTo(355, 176, 349, 176)
      ..lineTo(92, 176)
      ..close();
    canvas.drawPath(body, Paint()..color = const Color(0xFF111827));
    canvas.drawLine(const Offset(96, 150), const Offset(351, 150),
        Paint()
          ..color = const Color(0x1FFFFFFF)
          ..strokeWidth = 2);

    final rear = Path()
      ..moveTo(160, 120)
      ..lineTo(186, 99)
      ..quadraticBezierTo(192, 94, 200, 94)
      ..lineTo(230, 94)
      ..lineTo(230, 120)
      ..close();
    final front = Path()
      ..moveTo(238, 94)
      ..lineTo(262, 94)
      ..quadraticBezierTo(272, 94, 280, 102)
      ..lineTo(298, 120)
      ..lineTo(238, 120)
      ..close();
    canvas.drawPath(rear, Paint()..color = const Color(0xFF93C5FD));
    canvas.drawPath(front, Paint()..color = const Color(0xFFBFDBFE));

    canvas.drawRRect(RRect.fromLTRBR(341, 134, 353, 141, const Radius.circular(3)), Paint()..color = const Color(0xFFFDE68A));
    canvas.drawRRect(RRect.fromLTRBR(92, 136, 100, 144, const Radius.circular(2)), Paint()..color = const Color(0xFFEF4444));
    final handle = Paint()..color = const Color(0x59FFFFFF);
    canvas.drawRRect(RRect.fromLTRBR(208, 130, 222, 133, const Radius.circular(1.5)), handle);
    canvas.drawRRect(RRect.fromLTRBR(262, 130, 276, 133, const Radius.circular(1.5)), handle);

    for (final wx in const [136.0, 308.0]) {
      final c = Offset(wx, 174);
      canvas.drawCircle(c, 24, Paint()..color = T.bg);
      canvas.drawCircle(c, 20, Paint()..color = const Color(0xFF1F2937));
      canvas.drawCircle(c, 9, Paint()..color = const Color(0xFFCBD5E1));
      canvas.drawCircle(c, 3, Paint()..color = const Color(0xFF475569));
    }
  }

  void _badge(Canvas canvas) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: const Offset(372, 30), width: 68, height: 34), const Radius.circular(17)),
      Paint()..color = T.brand,
    );
    final tp = TextPainter(
      text: const TextSpan(
        text: '360°',
        style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, Offset(372 - tp.width / 2, 30 - tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant _Car360Painter old) => old.anim != anim;
}
