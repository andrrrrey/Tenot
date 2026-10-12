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
      chats = await session.api.myChats();
      error = null;
    } catch (e) {
      error = e;
    }
    notifyListeners();
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
