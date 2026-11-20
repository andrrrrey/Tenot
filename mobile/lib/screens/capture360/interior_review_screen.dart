import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/session.dart';
import '../../widgets/common.dart';
import 'interior_capture_screen.dart';
import 'spin_review_screen.dart' show SpinReviewResult;
import 'upload360.dart';

/// Проверка снимков салона и отправка на склейку.
///
/// Возвращает [SpinReviewResult.uploaded] (склейка запущена/готова), [SpinReviewResult.retake] или null.
/// Без [listingId] (объявление ещё не создано) снимки не отправляются — возвращается
/// [SpinReviewResult.accepted], а загрузку делает форма объявления после сохранения.
class InteriorReviewScreen extends StatefulWidget {
  const InteriorReviewScreen({super.key, this.listingId, required this.shots});
  final int? listingId;
  final List<InteriorShot> shots;

  @override
  State<InteriorReviewScreen> createState() => _InteriorReviewScreenState();
}

enum _Stage { review, uploading, stitching, done, failed }

class _InteriorReviewScreenState extends State<InteriorReviewScreen> {
  static const _pollEvery = Duration(seconds: 4);
  static const _pollFor = Duration(minutes: 6);

  _Stage _stage = _Stage.review;
  int _sent = 0;
  String? _error;
  Timer? _poll;

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _send() async {
    final listingId = widget.listingId;
    if (listingId == null) {
      Navigator.of(context).pop(SpinReviewResult.accepted);
      return;
    }
    final api = context.read<Session>().api;
    setState(() {
      _stage = _Stage.uploading;
      _sent = 0;
    });
    try {
      await uploadInterior(api, listingId, widget.shots, onProgress: (n) {
        if (mounted) setState(() => _sent = n);
      });
      if (!mounted) return;
      setState(() => _stage = _Stage.stitching);
      _startPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() => _stage = _Stage.review);
      showError(context, e);
    }
  }

  void _startPolling() {
    final started = DateTime.now();
    final api = context.read<Session>().api;
    _poll = Timer.periodic(_pollEvery, (t) async {
      try {
        final interior = (await api.media360(widget.listingId!)).interior;
        if (!mounted) return;
        if (interior == null || interior.isFailed) {
          t.cancel();
          setState(() {
            _stage = _Stage.failed;
            _error = interior?.error ?? 'Не удалось склеить панораму';
          });
        } else if (!interior.isProcessing) {
          t.cancel();
          setState(() => _stage = _Stage.done);
        }
      } catch (_) {
        // сеть пропала — попробуем на следующем шаге
      }
      if (DateTime.now().difference(started) > _pollFor) t.cancel();
    });
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.shots.length;
    return PopScope(
      canPop: _stage != _Stage.uploading,
      child: Scaffold(
        appBar: AppBar(title: const Text('Салон 360°')),
        body: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            if (_stage == _Stage.review || _stage == _Stage.uploading) ...[
              Text('Снято: $total. Проверьте, что снимки резкие и без пальцев в кадре.',
                  style: const TextStyle(fontSize: 13, height: 1.35)),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 9 / 16,
                children: [
                  for (final s in widget.shots)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.file(File(s.path), fit: BoxFit.cover, cacheWidth: 200),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            switch (_stage) {
              _Stage.review => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  FilledButton.icon(
                    onPressed: _send,
                    icon: Icon(widget.listingId == null ? Icons.check : Icons.cloud_upload_outlined),
                    label: Text(widget.listingId == null ? 'Добавить в объявление' : 'Отправить на склейку'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pop(SpinReviewResult.retake),
                    icon: const Icon(Icons.replay),
                    label: const Text('Переснять'),
                  ),
                ]),
              _Stage.uploading => Column(children: [
                  LinearProgressIndicator(value: total == 0 ? null : _sent / total),
                  const SizedBox(height: 8),
                  Text(_sent < total ? 'Загружаем $_sent из $total…' : 'Отправляем на склейку…'),
                ]),
              _Stage.stitching => _Status(
                  icon: const SizedBox(width: 36, height: 36, child: CircularProgressIndicator()),
                  title: 'Склеиваем панораму',
                  text: 'Обычно 1–3 минуты. Можно закрыть этот экран — панорама появится в объявлении сама.',
                  action: FilledButton(
                    onPressed: () => Navigator.of(context).pop(SpinReviewResult.uploaded),
                    child: const Text('Закрыть'),
                  ),
                ),
              _Stage.done => _Status(
                  icon: const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 40),
                  title: 'Панорама салона готова',
                  text: 'Она уже видна в объявлении.',
                  action: FilledButton(
                    onPressed: () => Navigator.of(context).pop(SpinReviewResult.uploaded),
                    child: const Text('К объявлению'),
                  ),
                ),
              _Stage.failed => _Status(
                  icon: const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 40),
                  title: 'Не получилось склеить',
                  text: _error ?? '',
                  action: FilledButton(
                    onPressed: () => Navigator.of(context).pop(SpinReviewResult.retake),
                    child: const Text('Переснять'),
                  ),
                ),
            },
          ],
        ),
      ),
    );
  }
}

class _Status extends StatelessWidget {
  const _Status({required this.icon, required this.title, required this.text, required this.action});
  final Widget icon;
  final String title;
  final String text;
  final Widget action;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 40),
        child: Column(children: [
          icon,
          const SizedBox(height: 14),
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, height: 1.35)),
          const SizedBox(height: 18),
          action,
        ]),
      );
}
