/// Адрес backend TENOT. По умолчанию — текущий сервер сайта.
/// Переопределяется при сборке/запуске:
///   flutter run --dart-define=API_BASE_URL=http://localhost:3000
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://tenot.ru',
);

/// Nginx отсекает пустой и «ботовый» User-Agent, поэтому шлём свой.
const String appUserAgent = 'TenotApp/1.0 (Flutter)';
