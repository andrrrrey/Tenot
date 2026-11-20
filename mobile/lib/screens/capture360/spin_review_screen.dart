import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/session.dart';
import '../../widgets/common.dart';
import '../../widgets/spin360_viewer.dart';
import 'upload360.dart';

/// Итог экрана проверки: отправлено / принято (без отправки) / переснять / отмена (null).
enum SpinReviewResult { uploaded, accepted, retake }

/// Предпросмотр снятых кадров и отправка на сервер с привязкой к объявлению.
///
/// Без [listingId] (объявление ещё не создано) кадры не отправляются: экран возвращает
/// [SpinReviewResult.accepted], а загрузку делает форма объявления после сохранения.
class SpinReviewScreen extends StatefulWidget {
  const SpinReviewScreen({super.key, this.listingId, required this.frames});
  final int? listingId;
  final List<String> frames;

  @override
  State<SpinReviewScreen> createState() => _SpinReviewScreenState();
}

class _SpinReviewScreenState extends State<SpinReviewScreen> {
  bool _sending = false;
  int _sent = 0;

  Future<void> _send() async {
    final listingId = widget.listingId;
    if (listingId == null) {
      Navigator.of(context).pop(SpinReviewResult.accepted);
      return;
    }
    final api = context.read<Session>().api;
    setState(() {
      _sending = true;
      _sent = 0;
    });
    try {
      await uploadSpin(api, listingId, widget.frames, onProgress: (n) {
        if (mounted) setState(() => _sent = n);
      });
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
                icon: Icon(widget.listingId == null ? Icons.check : Icons.cloud_upload_outlined),
                label: Text(widget.listingId == null ? 'Добавить в объявление' : 'Отправить'),
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
