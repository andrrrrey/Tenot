import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config.dart';
import 'models.dart';

class ApiException implements Exception {
  final int status;
  final String message;

  /// Через сколько секунд можно повторить запрос (ответ 429 при запросе SMS-кода).
  final int? retryAfter;
  ApiException(this.status, this.message, {this.retryAfter});

  @override
  String toString() => message;
}

/// HTTP-клиент к backend TENOT.
/// Ходит через тот же прокси, что и сайт: `<base>/api/proxy/<path>`,
/// токен передаётся заголовком `Authorization: Bearer ...`
/// (см. frontend/app/api/proxy/[...path]/route.ts).
class Api {
  Api({String? baseUrl, http.Client? client})
      : baseUrl = (baseUrl ?? apiBaseUrl).replaceAll(RegExp(r'/+$'), ''),
        _client = client ?? http.Client();

  /// Может поменяться, если сервер постоянно перенаправляет на другой домен (см. [_send]).
  String baseUrl;
  final http.Client _client;
  String? token;

  /// Постоянный идентификатор установки — backend учитывает его в лимитах SMS-кодов.
  String? deviceId;

  /// Вызывается при 401 на запросе с токеном — токен протух, нужно разлогинить.
  void Function()? onUnauthorized;

  static const _timeout = Duration(seconds: 60);

  Uri _uri(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('$baseUrl/api/proxy$path');
    return (query == null || query.isEmpty) ? uri : uri.replace(queryParameters: query);
  }

  Map<String, String> _headers({bool json = false}) => {
        'accept': 'application/json',
        'user-agent': appUserAgent,
        if (json) 'content-type': 'application/json',
        if (token != null) 'authorization': 'Bearer $token',
        'x-device-id': ?deviceId,
      };

  /// Абсолютный URL для медиа (`/uploads/...` → `<base>/uploads/...`).
  String? media(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return '$baseUrl${url.startsWith('/') ? '' : '/'}$url';
  }

  static const _redirects = {301, 302, 303, 307, 308};

  /// Если сервер перенаправил запрос на тот же путь другого домена
  /// (например, test.tenot.ru → tenot.ru), запоминаем новый адрес backend.
  /// GET-запросы HTTP-клиент проходит по редиректу сам, а POST/PATCH/DELETE — нет.
  bool _adoptRedirect(http.Response res) {
    final location = res.headers['location'];
    final requestUrl = res.request?.url;
    if (!_redirects.contains(res.statusCode) || location == null || requestUrl == null) return false;
    final target = requestUrl.resolve(location);
    if (target.path != requestUrl.path || !target.hasAuthority) return false;
    final newBase = target.origin;
    if (newBase == baseUrl) return false;
    baseUrl = newBase;
    return true;
  }

  Future<dynamic> _send(Future<http.Response> Function() run) async {
    final hadToken = token != null;
    http.Response res;
    try {
      res = await run().timeout(_timeout);
      // Повторяем запрос по новому адресу (запрос пересобирается с актуальным baseUrl).
      if (_adoptRedirect(res)) res = await run().timeout(_timeout);
    } on SocketException {
      throw ApiException(0, 'Нет соединения с сервером');
    } on HttpException {
      throw ApiException(0, 'Нет соединения с сервером');
    } on http.ClientException {
      throw ApiException(0, 'Нет соединения с сервером');
    } on Exception {
      throw ApiException(0, 'Сервер не отвечает');
    }
    final body = utf8.decode(res.bodyBytes);
    dynamic data;
    try {
      data = body.isEmpty ? null : jsonDecode(body);
    } catch (_) {
      data = body;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    if (res.statusCode == 401 && hadToken) onUnauthorized?.call();
    final retryAfter = data is Map ? data['retryAfter'] : null;
    throw ApiException(
      res.statusCode,
      _errorMessage(res.statusCode, data),
      retryAfter: retryAfter is num ? retryAfter.toInt() : null,
    );
  }

  static String _errorMessage(int status, dynamic data) {
    if (data is Map) {
      final m = data['message'];
      if (m is List && m.isNotEmpty) return m.join('\n');
      if (m is String && m.isNotEmpty) return m;
    }
    if (status == 429) return 'Слишком много запросов, попробуйте чуть позже';
    if (status >= 500) return 'Ошибка сервера ($status)';
    return 'Ошибка запроса ($status)';
  }

  Future<dynamic> get(String path, [Map<String, String>? query]) =>
      _send(() => _client.get(_uri(path, query), headers: _headers()));

  Future<dynamic> post(String path, [Object? body]) => _send(
      () => _client.post(_uri(path), headers: _headers(json: true), body: jsonEncode(body ?? {})));

  Future<dynamic> patch(String path, [Object? body]) => _send(
      () => _client.patch(_uri(path), headers: _headers(json: true), body: jsonEncode(body ?? {})));

  Future<dynamic> delete(String path, [Map<String, String>? query]) =>
      _send(() => _client.delete(_uri(path, query), headers: _headers()));

  Future<dynamic> upload(String path, String field, List<String> filePaths,
      {Map<String, String> fields = const {}}) {
    return _send(() async {
      final req = http.MultipartRequest('POST', _uri(path))
        ..headers.addAll(_headers())
        ..fields.addAll(fields);
      for (final p in filePaths) {
        req.files.add(await http.MultipartFile.fromPath(field, p, contentType: _mime(p)));
      }
      return http.Response.fromStream(await _client.send(req));
    });
  }

  static MediaType _mime(String path) {
    final ext = path.split('.').last.toLowerCase();
    const map = {
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'png': 'png',
      'webp': 'webp',
      'gif': 'gif',
    };
    final sub = map[ext];
    if (ext == 'm4a' || ext == 'aac') return MediaType('audio', 'mp4');
    if (ext == 'webm') return MediaType('audio', 'webm');
    if (ext == 'mp4') return MediaType('video', 'mp4');
    if (ext == 'mov') return MediaType('video', 'quicktime');
    return MediaType('image', sub ?? 'jpeg');
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  Future<String> login(String email, String password) async {
    final data = await post('/auth/login', {'email': email, 'password': password});
    return (data as Map)['access_token'] as String;
  }

  Future<String> register(String email, String password) async {
    final data = await post('/auth/register', {'email': email, 'password': password});
    return (data as Map)['access_token'] as String;
  }

  /// Отправка SMS-кода. Возвращает, через сколько секунд можно запросить код повторно.
  Future<int> requestPhoneCode(String phone) async {
    final data = await post('/auth/phone/request', {'phone': phone});
    return ((data as Map)['retryAfter'] as num?)?.toInt() ?? 60;
  }

  Future<String> loginByPhone(String phone, String code) async {
    final data = await post('/auth/phone/verify', {'phone': phone, 'code': code});
    return (data as Map)['access_token'] as String;
  }

  // ── Users ───────────────────────────────────────────────────────────────
  Future<UserProfile> me() async => UserProfile.fromJson(await get('/users/me'));

  Future<UserProfile> updateMe({String? name, String? phone, int? cityId}) async =>
      UserProfile.fromJson(await patch('/users/me', {
        'name': ?name,
        'phone': ?phone,
        'cityId': ?cityId,
      }));

  Future<UserProfile> uploadAvatar(String filePath) async =>
      UserProfile.fromJson(await upload('/users/me/avatar', 'avatar', [filePath]));

  // ── Listings ────────────────────────────────────────────────────────────
  List<Listing> _listings(dynamic data) =>
      (data as List? ?? []).whereType<Map<String, dynamic>>().map(Listing.fromJson).toList();

  Future<List<Listing>> listings([ListingFilter? f]) async =>
      _listings(await get('/listings', f?.toQuery()));

  Future<Listing> listing(int id) async => Listing.fromJson(await get('/listings/$id'));

  Future<List<Listing>> myListings() async => _listings(await get('/listings/my'));

  Future<Map<String, dynamic>> fuzzy(String q) async =>
      Map<String, dynamic>.from(await get('/listings/suggestions', {'q': q, 'fuzzy': 'true'}) ?? {});

  Future<Listing> createListing(Map<String, dynamic> payload) async =>
      Listing.fromJson(await post('/listings', payload));

  Future<Listing> updateListing(int id, Map<String, dynamic> payload) async =>
      Listing.fromJson(await patch('/listings/$id', payload));

  Future<void> toggleListing(int id, bool isActive) => patch('/listings/$id/toggle', {'isActive': isActive});

  Future<void> deleteListing(int id) => delete('/listings/$id');

  /// Файлы грузим по одному: так не упираемся в лимит nginx (25 МБ на запрос).
  Future<void> uploadListingMedia(int id, String path, {bool cover = false}) =>
      upload('/listings/$id/media', 'files', [path], fields: {if (cover) 'coverIndex': '0'});

  Future<void> deleteListingMedia(int id, int mediaId) => delete('/listings/$id/media/$mediaId');

  // ── Favorites ───────────────────────────────────────────────────────────
  Future<List<Listing>> favorites() async => (await get('/favorites') as List? ?? [])
      .whereType<Map<String, dynamic>>()
      .where((f) => f['listing'] is Map<String, dynamic>)
      .map((f) => Listing.fromJson(f['listing']))
      .toList();

  Future<void> addFavorite(int listingId) => post('/favorites', {'listingId': listingId});

  Future<void> removeFavorite(int listingId) => delete('/favorites', {'listingId': '$listingId'});

  // ── Чаты ────────────────────────────────────────────────────────────────
  Future<List<Chat>> myChats() async =>
      (await get('/chat/my') as List? ?? []).whereType<Map<String, dynamic>>().map(Chat.fromJson).toList();

  Future<List<Message>> messages(int chatId) async => (await get('/chat/$chatId/messages') as List? ?? [])
      .whereType<Map<String, dynamic>>()
      .map(Message.fromJson)
      .toList();

  Future<Message> sendMessage(int listingId, int receiverId, String text) async => Message.fromJson(
      await post('/chat/send', {'listingId': listingId, 'receiverId': receiverId, 'text': text}));

  Future<Message> sendAudio(int listingId, int receiverId, String filePath, double durationSeconds) async =>
      Message.fromJson(await upload('/chat/send/audio', 'audio', [filePath], fields: {
        'listingId': '$listingId',
        'receiverId': '$receiverId',
        'audioDuration': durationSeconds.toStringAsFixed(1),
      }));

  Future<void> markChatRead(int chatId) => patch('/chat/$chatId/read');

  // ── Справочники ─────────────────────────────────────────────────────────
  Future<List<Category>> categories() async => (await get('/categories') as List? ?? [])
      .whereType<Map<String, dynamic>>()
      .map(Category.fromJson)
      .toList();

  Future<List<CategoryField>> categoryFields(int categoryId) async =>
      (await get('/categories/$categoryId/fields') as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(CategoryField.fromJson)
          .toList();

  Future<List<City>> searchCities(String q) async => (await get('/cities/search', {'q': q}) as List? ?? [])
      .whereType<Map<String, dynamic>>()
      .map(City.fromJson)
      .toList();

  Future<List<IdName>> carMakes() async => (await get('/car-makes') as List? ?? [])
      .map(IdName.fromJson)
      .whereType<IdName>()
      .toList();

  Future<List<CarModel>> carModels(int makeId) async => (await get('/car-makes/$makeId/models') as List? ?? [])
      .whereType<Map<String, dynamic>>()
      .map(CarModel.fromJson)
      .toList();
}

