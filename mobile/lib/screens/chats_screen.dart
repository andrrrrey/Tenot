import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../state/chat_store.dart';
import '../state/session.dart';
import '../theme.dart';
import '../widgets/chat_widgets.dart';
import '../widgets/common.dart';
import 'auth_screen.dart';
import 'chat_thread_screen.dart';

/// Список диалогов — мобильный вид app/chat/ChatClient.tsx (.chat-sidebar карточкой).
class ChatsScreen extends StatelessWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final store = context.watch<ChatStore>();
    final me = session.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Чаты')),
      body: me == null
          ? ListView(padding: const EdgeInsets.all(14), children: const [AuthForm()])
          : RefreshIndicator(
              onRefresh: store.refresh,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                children: [_card(context, store, me.id)],
              ),
            ),
    );
  }

  Widget _card(BuildContext context, ChatStore store, int myId) {
    final chats = store.chats;
    Widget body;
    if (chats == null && store.error != null) {
      body = Padding(padding: const EdgeInsets.all(16), child: ErrorBox(error: store.error!, onRetry: store.refresh));
    } else if (chats == null) {
      body = const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()));
    } else if (chats.isEmpty) {
      body = const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 40),
        child: Column(children: [
          Icon(Icons.chat_bubble_outline_rounded, size: 32, color: Color(0x4D6B7280)),
          SizedBox(height: 10),
          Text('Диалогов пока нет.\nНапишите продавцу из карточки товара.',
              textAlign: TextAlign.center, style: TextStyle(color: T.muted, fontSize: 13, height: 1.8)),
        ]),
      );
    } else {
      body = Column(children: [for (final c in chats) _ChatRow(chat: c, myId: myId)]);
    }

    return Container(
      decoration: T.cardDecoration(),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
            decoration: const BoxDecoration(
              color: Color(0xFFF0F1FF),
              border: Border(bottom: BorderSide(color: Color(0xFFE5E7F0))),
            ),
            child: Row(children: [
              const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: T.brand),
              const SizedBox(width: 10),
              const Expanded(child: Text('Чаты', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
              if ((chats?.length ?? 0) > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: T.brand, borderRadius: BorderRadius.circular(999)),
                  child: Text('${chats!.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
            ]),
          ),
          body,
        ],
      ),
    );
  }
}

class _ChatRow extends StatelessWidget {
  const _ChatRow({required this.chat, required this.myId});
  final Chat chat;
  final int myId;

  @override
  Widget build(BuildContext context) {
    final other = chat.interlocutor(myId);
    final last = chat.lastMessage;
    final unread = chat.unread;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatThreadScreen.fromChat(chat))),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFECECF8)))),
          child: Row(children: [
            ChatAvatar(user: other, size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(other?.displayName ?? 'Пользователь',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 14, fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w600)),
                const SizedBox(height: 2),
                Text(chat.listingTitle ?? 'Объявление #${chat.listingId}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Color(0x99111827))),
                if (last != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '${last.senderId == myId ? 'Вы: ' : ''}${last.audioUrl != null ? 'Голосовое сообщение' : last.text ?? ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Color(0x80111827)),
                  ),
                ],
              ]),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              if (last != null)
                Text(formatChatTime(last.createdAt), style: const TextStyle(fontSize: 10, color: Color(0x80111827))),
              if (unread > 0) ...[
                const SizedBox(height: 5),
                UnreadBadge(count: unread),
              ],
            ]),
          ]),
        ),
      ),
    );
  }
}
