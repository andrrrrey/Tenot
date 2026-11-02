import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/session.dart';
import '../../widgets/common.dart';
import '../../widgets/spin360_viewer.dart';

/// Итог экрана проверки: отправлено / переснять / отмена (null).
enum SpinReviewResult { uploaded, retake }

/// Предпросмотр снятых кадров и отправка на сервер с привязкой к объявлению.
class SpinReviewScreen extends StatefulWidget {
  const SpinReviewScreen({super.key, required this.listingId, required this.frames});
  final int listingId;
  final List<String> frames;

  @override
  State<SpinReviewScreen> createState() => _SpinReviewScreenState();
}

class _SpinReviewScreenState extends State<SpinReviewScreen> {
  static const _batch = 6; // ~2–3 МБ на запрос при 720p
  bool _sending = false;
  int _sent = 0;

  Future<void> _send() async {
    final api = context.read<Session>().api;
    final frames = widget.frames;
    final uploadId = '${DateTime.now().millisecondsSinceEpoch}-${math.Random().nextInt(1 << 32)}';
    setState(() {
      _sending = true;
      _sent = 0;
    });
    try {
      for (var i = 0; i < frames.length; i += _batch) {
        final part = frames.sublist(i, math.min(i + _batch, frames.length));
        await api.uploadSpinFrames(widget.listingId, uploadId, i, part);
        if (mounted) setState(() => _sent = i + part.length);
      }
      await api.commitSpin(widget.listingId, uploadId, frames.length);
      if (!mounted) return;
      showInfo(context, '360°-обзор добавлен');
      Navigator.of(context).pop(SpinReviewResult.uploaded);
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.frames.length;
    return PopScope(
      canPop: !_sending,
      child: Scaffold(
        appBar: AppBar(title: const Text('Проверьте 360°')),
        body: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            Spin360Viewer.local(localFrames: widget.frames),
            const SizedBox(height: 12),
            Text(
              'Снято кадров: $total. Проведите по изображению, чтобы проверить вращение. '
              'Если объект «прыгает» или уходит из кадра — лучше переснять.',
              style: const TextStyle(fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 18),
            if (_sending) ...[
              LinearProgressIndicator(value: total == 0 ? null : _sent / total),
              const SizedBox(height: 8),
              Text(_sent < total ? 'Загружаем $_sent из $total…' : 'Сохраняем…', textAlign: TextAlign.center),
            ] else ...[
              FilledButton.icon(
                onPressed: _send,
                icon: const Icon(Icons.cloud_upload_outlined),
                label: const Text('Отправить'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(SpinReviewResult.retake),
                icon: const Icon(Icons.replay),
                label: const Text('Переснять'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
