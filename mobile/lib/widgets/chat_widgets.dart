import 'dart:async';

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../config.dart';
import '../state/session.dart';
import '../theme.dart';
import 'common.dart';

String _two(int n) => n.toString().padLeft(2, '0');

String formatClock(DateTime d) => '${_two(d.hour)}:${_two(d.minute)}';

/// Как formatTime в ChatClient.tsx: сегодня — время, иначе дата.
String formatChatTime(DateTime d) {
  final now = DateTime.now();
  final today = d.year == now.year && d.month == now.month && d.day == now.day;
  return today ? formatClock(d) : formatDate(d);
}

String formatSeconds(double s) {
  if (!s.isFinite || s <= 0) return '0:00';
  final total = s.floor();
  return '${total ~/ 60}:${_two(total % 60)}';
}

String _initials(String? name) {
  if (name == null || name.trim().isEmpty) return '?';
  return name.trim().split(RegExp(r'\s+')).map((w) => w.characters.first).join().characters.take(2).toString().toUpperCase();
}

/// Аватар собеседника: фото или инициалы на фирменном фоне.
class ChatAvatar extends StatelessWidget {
  const ChatAvatar({super.key, required this.user, this.size = 40});
  final ChatUser? user;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (user?.avatarUrl != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xCCFFFFFF), width: 2)),
        child: ClipOval(child: NetImage(user!.avatarUrl, iconSize: size * 0.4)),
      );
    }
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: T.brand,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: T.brandGlow, blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Text(_initials(user?.name),
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: size * 0.35)),
    );
  }
}

class UnreadBadge extends StatelessWidget {
  const UnreadBadge({super.key, required this.count});
  final int count;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minWidth: 18),
        height: 18,
        padding: const EdgeInsets.symmetric(horizontal: 5),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: T.favorite, borderRadius: BorderRadius.circular(10)),
        child: Text(count > 99 ? '99+' : '$count',
            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
      );
}

/// Пузырь сообщения — как в ChatClient.tsx.
class MessageBubble extends StatelessWidget {
  const MessageBubble({super.key, required this.message, required this.isMine});
  final Message message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    final m = message;
    final fg = isMine ? Colors.white : T.text;
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
          decoration: BoxDecoration(
            color: isMine ? T.brand : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMine ? 18 : 4),
              bottomRight: Radius.circular(isMine ? 4 : 18),
            ),
            border: isMine ? null : Border.all(color: const Color(0xFFEBEBEB)),
            boxShadow: isMine
                ? const [BoxShadow(color: T.brandGlow, blurRadius: 12, offset: Offset(0, 4))]
                : const [BoxShadow(color: Color(0x12000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (m.audioUrl != null)
                VoicePlayer(url: m.audioUrl!, isMine: isMine, initialDuration: m.audioDuration ?? 0)
              else
                Align(
                  alignment: Alignment.centerLeft,
                  widthFactor: 1,
                  child: Text(m.text ?? '', style: TextStyle(fontSize: 14, height: 1.5, color: fg)),
                ),
              const SizedBox(height: 4),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text(formatClock(m.createdAt), style: TextStyle(fontSize: 10, color: fg.withValues(alpha: 0.65))),
                if (isMine) ...[
                  const SizedBox(width: 4),
                  Text(
                    m.isRead ? '✓✓' : '✓',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: m.isRead ? -1 : 0,
                      color: Colors.white.withValues(alpha: m.isRead ? 0.9 : 0.55),
                    ),
                  ),
                ],
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

/// Плеер голосового сообщения (AudioPlayer в ChatClient.tsx).
/// Плеер создаётся только при первом нажатии — чтобы не держать десятки плееров на экране.
class VoicePlayer extends StatefulWidget {
  const VoicePlayer({super.key, required this.url, required this.isMine, this.initialDuration = 0});
  final String url;
  final bool isMine;
  final double initialDuration;

  @override
  State<VoicePlayer> createState() => _VoicePlayerState();
}

class _VoicePlayerState extends State<VoicePlayer> {
  AudioPlayer? _player;
  final List<StreamSubscription> _subs = [];
  late double _duration = widget.initialDuration;
  double _position = 0;
  bool _playing = false;
  bool _loading = false;

  Future<void> _ensurePlayer() async {
    if (_player != null) return;
    final url = context.read<Session>().api.media(widget.url)!;
    final p = AudioPlayer();
    _player = p;
    _subs
      ..add(p.positionStream.listen((d) => setState(() => _position = d.inMilliseconds / 1000)))
      ..add(p.durationStream.listen((d) {
        if (d != null && d.inMilliseconds > 0) setState(() => _duration = d.inMilliseconds / 1000);
      }))
      ..add(p.playerStateStream.listen((s) {
        if (s.processingState == ProcessingState.completed) {
          p.pause();
          p.seek(Duration.zero);
          setState(() {
            _playing = false;
            _position = 0;
          });
        }
      }));
    await p.setUrl(url, headers: {'user-agent': appUserAgent});
  }

  Future<void> _toggle() async {
    if (_loading) return;
    try {
      if (_player == null) {
        setState(() => _loading = true);
        await _ensurePlayer();
      }
      final p = _player!;
      if (_playing) {
        await p.pause();
        setState(() => _playing = false);
      } else {
        setState(() => _playing = true);
        unawaited(p.play());
      }
    } catch (e) {
      if (mounted) showInfo(context, 'Не удалось воспроизвести голосовое сообщение');
      await _disposePlayer();
      setState(() => _playing = false);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _disposePlayer() async {
    for (final s in _subs) {
      await s.cancel();
    }
    _subs.clear();
    await _player?.dispose();
    _player = null;
  }

  @override
  void dispose() {
    _disposePlayer();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accent = widget.isMine ? Colors.white : T.brand;
    final max = _duration > 0 ? _duration : 0.001;
    return SizedBox(
      width: 200,
      child: Row(children: [
        GestureDetector(
          onTap: _toggle,
          child: SizedBox(
            width: 26,
            height: 26,
            child: _loading
                ? Padding(padding: const EdgeInsets.all(4), child: CircularProgressIndicator(strokeWidth: 2, color: accent))
                : Icon(_playing ? Icons.pause_rounded : Icons.play_arrow_rounded, color: accent, size: 24),
          ),
        ),
        Expanded(
          child: SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 3,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
              activeTrackColor: accent,
              inactiveTrackColor: accent.withValues(alpha: 0.3),
              thumbColor: accent,
            ),
            child: Slider(
              min: 0,
              max: max,
              value: _position.clamp(0, max),
              onChanged: _player == null
                  ? null
                  : (v) {
                      setState(() => _position = v);
                      _player!.seek(Duration(milliseconds: (v * 1000).round()));
                    },
            ),
          ),
        ),
        SizedBox(
          width: 34,
          child: Text(formatSeconds(_playing ? _position : _duration),
              textAlign: TextAlign.right, style: TextStyle(fontSize: 11, color: accent)),
        ),
      ]),
    );
  }
}
