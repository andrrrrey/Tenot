import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/chat_store.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/chat_widgets.dart';
import '../widgets/common.dart';

/// Переписка — мобильный вид .chat-thread из app/chat/ChatClient.tsx.
/// Открывается либо для существующего чата, либо для нового диалога по объявлению
/// (как /chat?listingId=..&receiverId=.. на сайте).
class ChatThreadScreen extends StatefulWidget {
  const ChatThreadScreen({
    super.key,
    this.chat,
    required this.listingId,
    required this.receiverId,
    this.receiver,
    this.listingTitle,
  });

  ChatThreadScreen.fromChat(Chat c, {Key? key, ChatUser? receiver})
      : this(key: key, chat: c, listingId: c.listingId, receiverId: -1, receiver: receiver, listingTitle: c.listingTitle);

  final Chat? chat;
  final int listingId;

  /// Для нового диалога — id продавца. Для существующего чата вычисляется из чата.
  final int receiverId;
  final ChatUser? receiver;
  final String? listingTitle;

  @override
  State<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends State<ChatThreadScreen> {
  late final Session session = context.read<Session>();
  late final ChatStore store = context.read<ChatStore>();
  Api get api => session.api;
  int get myId => session.user!.id;

  Chat? _chat;
  List<Message>? _messages;
  final _text = TextEditingController();
  bool _sending = false;
  String? _sendError;
  Timer? _poll;

  /// Создаётся при первом нажатии на микрофон.
  AudioRecorder? _recorderInstance;
  AudioRecorder get _recorder => _recorderInstance ??= AudioRecorder();
  bool _recording = false;
  DateTime? _recordStart;
  Timer? _recordTicker;
  Duration _recordElapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _chat = widget.chat ?? store.findForListing(widget.listingId);
    _text.addListener(() => setState(() {}));
    _loadMessages();
    // Как на сайте: сообщения опрашиваются раз в 3 секунды.
    _poll = Timer.periodic(const Duration(seconds: 3), (_) => _loadMessages(silent: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _recordTicker?.cancel();
    _recorderInstance?.dispose();
    _text.dispose();
    super.dispose();
  }

  int get _receiverId => _chat != null ? _chat!.receiverId(myId) : widget.receiverId;

  ChatUser? get _interlocutor => _chat?.interlocutor(myId) ?? widget.receiver;

  Future<void> _loadMessages({bool silent = false}) async {
    final chat = _chat;
    if (chat == null) {
      if (_messages == null) setState(() => _messages = []);
      return;
    }
    try {
      final msgs = await api.messages(chat.id);
      if (!mounted) return;
      final prev = _messages;
      final changed = prev == null ||
          prev.length != msgs.length ||
          Iterable.generate(msgs.length).any((i) => msgs[i].id != prev[i].id || msgs[i].isRead != prev[i].isRead);
      if (changed) setState(() => _messages = msgs);
      if (msgs.any((m) => !m.isRead && m.senderId != myId)) {
        await api.markChatRead(chat.id);
        store.refresh();
      }
    } catch (e) {
      if (!silent && mounted && _messages == null) setState(() => _messages = []);
    }
  }

  /// После первого сообщения в новом диалоге находим созданный чат.
  Future<void> _afterSend() async {
    await store.refresh();
    _chat ??= store.findForListing(widget.listingId) ??
        store.chats?.where((c) => c.listingId == widget.listingId && c.receiverId(myId) == _receiverId).firstOrNull;
    await _loadMessages();
  }

  Future<void> _sendText() async {
    final text = _text.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _sendError = null;
    });
    try {
      await api.sendMessage(widget.listingId, _receiverId, text);
      _text.clear();
      await _afterSend();
    } catch (e) {
      setState(() => _sendError = e is ApiException ? e.message : 'Ошибка отправки');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      await _stopAndSend();
      return;
    }
    try {
      if (!await _recorder.hasPermission()) {
        if (mounted) showInfo(context, 'Нет доступа к микрофону');
        return;
      }
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000), path: path);
      _recordStart = DateTime.now();
      _recordTicker = Timer.periodic(const Duration(milliseconds: 250), (_) {
        setState(() => _recordElapsed = DateTime.now().difference(_recordStart!));
      });
      setState(() {
        _recording = true;
        _recordElapsed = Duration.zero;
      });
    } catch (e) {
      if (mounted) showInfo(context, 'Не удалось начать запись');
    }
  }

  Future<void> _stopAndSend() async {
    _recordTicker?.cancel();
    final duration = DateTime.now().difference(_recordStart ?? DateTime.now()).inMilliseconds / 1000;
    final path = await _recorder.stop();
    setState(() => _recording = false);
    if (path == null || duration < 0.5) return;
    setState(() {
      _sending = true;
      _sendError = null;
    });
    try {
      await api.sendAudio(widget.listingId, _receiverId, path, duration);
      await _afterSend();
    } catch (e) {
      setState(() => _sendError = e is ApiException ? e.message : 'Ошибка отправки голосового');
    } finally {
      if (mounted) setState(() => _sending = false);
      unawaited(File(path).delete().catchError((_) => File(path)));
    }
  }

  Future<void> _cancelRecording() async {
    _recordTicker?.cancel();
    final path = await _recorder.stop();
    setState(() => _recording = false);
    if (path != null) unawaited(File(path).delete().catchError((_) => File(path)));
  }

  @override
  Widget build(BuildContext context) {
    final other = _interlocutor;
    final title = _chat?.listingTitle ?? widget.listingTitle ?? 'Объявление #${widget.listingId}';
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        titleSpacing: 0,
        shape: const Border(bottom: BorderSide(color: T.line)),
        title: InkWell(
          onTap: () => openListing(context, widget.listingId),
          child: Row(children: [
            ChatAvatar(user: other, size: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(other?.displayName ?? 'Пользователь',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 1),
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: T.muted, fontWeight: FontWeight.w400)),
              ]),
            ),
          ]),
        ),
      ),
      body: Column(children: [
        Expanded(child: _messagesList()),
        if (_sendError != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFFEF2F2),
              border: Border(top: BorderSide(color: Color(0xFFFCA5A5))),
            ),
            child: Text(_sendError!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13)),
          ),
        _inputBar(),
      ]),
    );
  }

  Widget _messagesList() {
    final msgs = _messages;
    if (msgs == null) return const Center(child: CircularProgressIndicator());
    if (msgs.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.chat_bubble_outline_rounded, size: 48, color: Color(0x406B7280)),
            SizedBox(height: 12),
            Text('Нет сообщений. Напишите первым!', style: TextStyle(color: T.muted, fontSize: 14)),
          ]),
        ),
      );
    }
    // reverse: новые сообщения внизу, список сам держится у нижнего края.
    return ListView.builder(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      itemCount: msgs.length,
      itemBuilder: (_, i) {
        final m = msgs[msgs.length - 1 - i];
        return MessageBubble(key: ValueKey(m.id), message: m, isMine: m.senderId == myId);
      },
    );
  }

  Widget _inputBar() {
    final canSend = _text.text.trim().isNotEmpty && !_sending;
    return Container(
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: T.line))),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(
              child: _recording
                  ? Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0x14EF4444),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0x33EF4444), width: 1.5),
                      ),
                      child: Row(children: [
                        const Icon(Icons.fiber_manual_record, color: T.favorite, size: 12),
                        const SizedBox(width: 8),
                        Text('Запись ${formatSeconds(_recordElapsed.inMilliseconds / 1000)}',
                            style: const TextStyle(fontSize: 14, color: T.text)),
                        const Spacer(),
                        GestureDetector(
                          onTap: _cancelRecording,
                          child: const Text('Отмена',
                              style: TextStyle(fontSize: 13, color: T.muted, fontWeight: FontWeight.w600)),
                        ),
                      ]),
                    )
                  : TextField(
                      controller: _text,
                      minLines: 1,
                      maxLines: 5,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendText(),
                      style: const TextStyle(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Написать сообщение...',
                        fillColor: const Color(0xFFF8F9FB),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: T.line, width: 1.5),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: T.line, width: 1.5),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: T.brand, width: 1.5),
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 8),
            _circleButton(
              onTap: _sending ? null : _toggleRecording,
              color: _recording ? T.favorite : Colors.white,
              border: _recording ? T.favorite : T.line,
              child: Icon(_recording ? Icons.stop_rounded : Icons.mic_none_rounded,
                  size: _recording ? 18 : 20, color: _recording ? Colors.white : T.brand),
            ),
            if (!_recording) ...[
              const SizedBox(width: 8),
              Opacity(
                opacity: canSend ? 1 : 0.5,
                child: _circleButton(
                  onTap: canSend ? _sendText : null,
                  color: T.brand,
                  border: T.brand,
                  shadow: true,
                  child: _sending
                      ? const SizedBox(
                          width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                ),
              ),
            ],
          ]),
        ),
      ),
    );
  }

  Widget _circleButton({
    required VoidCallback? onTap,
    required Color color,
    required Color border,
    required Widget child,
    bool shadow = false,
  }) =>
      GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: border, width: 1.5),
            boxShadow: shadow ? T.brandShadow : null,
          ),
          child: child,
        ),
      );
}
