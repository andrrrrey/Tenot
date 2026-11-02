import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/session.dart';
import 'common.dart';

/// Просмотр 360°-вращения по кадрам — как components/Spin360Viewer.tsx на сайте.
///
/// Сетевой режим ([listingId] + [previewUrl]): до нажатия показывается только превью,
/// кадры загружаются после действия пользователя. Локальный режим ([localFrames]) —
/// предпросмотр только что снятых кадров, готов сразу.
class Spin360Viewer extends StatefulWidget {
  const Spin360Viewer({super.key, required int this.listingId, required String this.previewUrl})
      : localFrames = null;

  const Spin360Viewer.local({super.key, required List<String> this.localFrames})
      : listingId = null,
        previewUrl = null;

  final int? listingId;
  final String? previewUrl;
  final List<String>? localFrames;

  @override
  State<Spin360Viewer> createState() => _Spin360ViewerState();
}

enum _Phase { idle, loading, ready, error }

class _Spin360ViewerState extends State<Spin360Viewer> {
  _Phase _phase = _Phase.idle;
  List<ImageProvider> _frames = const [];
  int _loaded = 0;
  int _index = 0;
  bool _hint = true;
  double _dragStartX = 0;
  int _dragStartIndex = 0;

  @override
  void initState() {
    super.initState();
    final local = widget.localFrames;
    if (local != null) {
      _frames = [for (final p in local) FileImage(File(p))];
      _phase = _Phase.ready;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Локальные кадры — прогреваем кэш, чтобы вращение было без мерцания.
    if (widget.localFrames != null) {
      for (final f in _frames) {
        precacheImage(f, context);
      }
    }
  }

  Future<void> _start() async {
    final id = widget.listingId;
    if (id == null) return;
    setState(() {
      _phase = _Phase.loading;
      _loaded = 0;
    });
    try {
      final api = context.read<Session>().api;
      final spin = await api.listing360(id);
      if (spin == null || spin.frames.isEmpty) throw Exception('no frames');
      final providers = <ImageProvider>[
        for (final url in spin.frames)
          CachedNetworkImageProvider(api.media(url)!, headers: const {'user-agent': 'TenotApp/1.0 (Flutter)'}),
      ];
      if (!mounted) return;
      setState(() => _frames = providers);
      await Future.wait(providers.map((p) async {
        await precacheImage(p, context, onError: (_, _) {});
        if (mounted) setState(() => _loaded++);
      }));
      if (mounted) setState(() => _phase = _Phase.ready);
    } catch (_) {
      if (mounted) setState(() => _phase = _Phase.error);
    }
  }

  void _onDragStart(DragStartDetails d) {
    _dragStartX = d.localPosition.dx;
    _dragStartIndex = _index;
  }

  void _onDragUpdate(DragUpdateDetails d, double width) {
    final n = _frames.length;
    if (n == 0) return;
    final pxPerFrame = width / n; // вся ширина ≈ полный оборот
    final shift = ((_dragStartX - d.localPosition.dx) / pxPerFrame).round();
    final next = ((_dragStartIndex + shift) % n + n) % n;
    if (next != _index || (shift != 0 && _hint)) {
      setState(() {
        _index = next;
        if (shift != 0) _hint = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ready = _phase == _Phase.ready;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: LayoutBuilder(
          builder: (context, c) => GestureDetector(
            behavior: HitTestBehavior.opaque,
            onHorizontalDragStart: ready ? _onDragStart : null,
            onHorizontalDragUpdate: ready ? (d) => _onDragUpdate(d, c.maxWidth) : null,
            child: Stack(
              fit: StackFit.expand,
              children: [
                const ColoredBox(color: Color(0xFF111827)),
                if (ready && _frames.isNotEmpty)
                  Image(image: _frames[_index], fit: BoxFit.contain, gaplessPlayback: true)
                else
                  NetImage(widget.previewUrl, fit: BoxFit.contain),
                const Positioned(top: 10, left: 10, child: _Pill('360°')),
                if (_phase == _Phase.idle)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 14,
                    child: Center(
                      child: FilledButton.icon(
                        onPressed: _start,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF111827),
                          shape: const StadiumBorder(),
                        ),
                        icon: const Icon(Icons.threesixty_rounded, size: 20),
                        label: const Text('Смотреть 360°', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                if (_phase == _Phase.loading)
                  _Overlay(children: [
                    SizedBox(
                      width: 200,
                      child: LinearProgressIndicator(
                        value: _frames.isEmpty ? null : _loaded / _frames.length,
                        color: Colors.white,
                        backgroundColor: Colors.white24,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _frames.isEmpty ? 'Загружаем 360°…' : 'Загружаем 360°… $_loaded / ${_frames.length}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ]),
                if (_phase == _Phase.error)
                  _Overlay(children: [
                    const Text('Не удалось загрузить 360°',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: _start,
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
                      child: const Text('Повторить'),
                    ),
                  ]),
                if (ready && _hint)
                  const Positioned(
                    left: 0,
                    right: 0,
                    bottom: 12,
                    child: Center(child: _Pill('⟵ Проведите, чтобы повернуть ⟶')),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xB8111827), borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
      );
}

class _Overlay extends StatelessWidget {
  const _Overlay({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: const Color(0x8C111827),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: children),
      );
}
