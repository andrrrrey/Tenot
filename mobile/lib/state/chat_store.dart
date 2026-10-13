import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/models.dart';
import 'session.dart';

/// Список чатов и счётчик непрочитанных (как ChatWidget/ChatClient на сайте:
/// список обновляется раз в 10 секунд, пока пользователь залогинен).
class ChatStore extends ChangeNotifier {
  ChatStore(this.session) {
    session.addListener(_onSession);
    _onSession();
  }

  final Session session;
  static const pollInterval = Duration(seconds: 10);

  List<Chat>? chats;
  Object? error;
  Timer? _timer;
  int? _userId;

  int get unreadTotal => (chats ?? const <Chat>[]).fold(0, (sum, c) => sum + c.unread);

  void _onSession() {
    final id = session.user?.id;
    if (id == _userId) return;
    _userId = id;
    _timer?.cancel();
    chats = null;
    error = null;
    if (id != null) {
      refresh();
      _timer = Timer.periodic(pollInterval, (_) => refresh());
    }
    notifyListeners();
  }

  Future<void> refresh() async {
    if (!session.isLoggedIn) return;
    try {
      // Диалоги со свежими сообщениями — вверху (сервер отдаёт по дате создания чата).
      chats = (await session.api.myChats())..sort(_byLastMessage);
      error = null;
    } catch (e) {
      error = e;
    }
    notifyListeners();
  }

  static int _byLastMessage(Chat a, Chat b) {
    final at = a.lastMessage?.createdAt, bt = b.lastMessage?.createdAt;
    if (at != null && bt != null && at != bt) return bt.compareTo(at);
    if ((at == null) != (bt == null)) return at == null ? 1 : -1;
    return b.id.compareTo(a.id);
  }

  /// Существующий чат текущего пользователя по объявлению (если он покупатель).
  Chat? findForListing(int listingId) {
    final me = session.user?.id;
    return chats?.where((c) => c.listingId == listingId && c.initiatorId == me).firstOrNull;
  }

  @override
  void dispose() {
    _timer?.cancel();
    session.removeListener(_onSession);
    super.dispose();
  }
}
