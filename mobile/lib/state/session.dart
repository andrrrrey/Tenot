import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api.dart';
import '../api/models.dart';

/// Хранилище токена: Keychain/Keystore на телефонах,
/// shared_preferences на macOS (без подписи приложения Keychain недоступен).
class TokenStorage {
  static const _key = 'tenot_token';
  final _secure = const FlutterSecureStorage();
  bool get _usePrefs => !kIsWeb && Platform.isMacOS;

  Future<String?> read() async {
    try {
      if (_usePrefs) return (await SharedPreferences.getInstance()).getString(_key);
      return await _secure.read(key: _key);
    } catch (_) {
      return null;
    }
  }

  Future<void> write(String? token) async {
    try {
      if (_usePrefs) {
        final p = await SharedPreferences.getInstance();
        token == null ? await p.remove(_key) : await p.setString(_key, token);
      } else {
        token == null ? await _secure.delete(key: _key) : await _secure.write(key: _key, value: token);
      }
    } catch (_) {}
  }
}

/// Сессия пользователя + избранное (аналог AuthProvider и zustand-стора сайта).
class Session extends ChangeNotifier {
  Session(this.api, {TokenStorage? storage}) : _storage = storage ?? TokenStorage() {
    api.onUnauthorized = () => logout();
  }

  final Api api;
  final TokenStorage _storage;

  UserProfile? user;
  bool ready = false;
  final Set<int> favoriteIds = {};

  bool get isLoggedIn => api.token != null;

  /// Автологин при старте по сохранённому токену.
  Future<void> init() async {
    api.token = await _storage.read();
    if (api.token != null) {
      try {
        user = await api.me();
        await _loadFavorites();
      } on ApiException catch (e) {
        if (e.status == 401 || e.status == 403 || e.status == 404) {
          await logout(notify: false);
        }
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String email, String password) => _auth(api.login(email, password));

  Future<void> register(String email, String password) => _auth(api.register(email, password));

  Future<void> _auth(Future<String> request) async {
    final token = await request;
    api.token = token;
    await _storage.write(token);
    user = await api.me();
    await _loadFavorites();
    notifyListeners();
  }

  Future<void> refreshUser() async {
    if (!isLoggedIn) return;
    user = await api.me();
    notifyListeners();
  }

  void setUser(UserProfile u) {
    user = u;
    notifyListeners();
  }

  Future<void> logout({bool notify = true}) async {
    api.token = null;
    user = null;
    favoriteIds.clear();
    await _storage.write(null);
    if (notify) notifyListeners();
  }

  Future<void> _loadFavorites() async {
    try {
      final favs = await api.favorites();
      favoriteIds
        ..clear()
        ..addAll(favs.map((l) => l.id));
    } catch (_) {}
  }

  bool isFavorite(int id) => favoriteIds.contains(id);

  /// Возвращает новое состояние «в избранном».
  Future<bool> toggleFavorite(int id) async {
    final was = favoriteIds.contains(id);
    was ? favoriteIds.remove(id) : favoriteIds.add(id);
    notifyListeners();
    try {
      was ? await api.removeFavorite(id) : await api.addFavorite(id);
    } catch (e) {
      was ? favoriteIds.add(id) : favoriteIds.remove(id);
      notifyListeners();
      rethrow;
    }
    return !was;
  }
}
