# TENOT — мобильное приложение (Flutter)

Этап 2.1 спецификации: базовое приложение для Android/iOS в дизайне мобильной версии сайта.
Работает с **текущим backend** без изменений на сервере: все запросы идут через тот же прокси,
что и у сайта (`https://tenot.ru/api/proxy/...`), токен передаётся заголовком
`Authorization: Bearer ...`.

Что есть:
- главная (категории, свежие объявления), выбор города;
- поиск с исправлением опечаток и фильтрами (категория, город, цена, марка/модель/год авто);
- карточка объявления: галерея, характеристики, продавец, «Показать телефон»/звонок, избранное;
- вход и регистрация (email + пароль), автологин;
- личный кабинет: профиль, аватар, мои объявления (активные/черновики/снятые), снять/опубликовать, удалить;
- подача и редактирование объявления: категория, характеристики категории, авто-поля, фото из галереи/камеры, черновик;
- избранное;
- чаты как на сайте: список диалогов со счётчиком непрочитанных (бейдж на вкладке «Чаты»),
  переписка с отметками ✓/✓✓, голосовые сообщения (запись и прослушивание), «Написать в чат»
  из карточки объявления. Обновление — опросом, как на сайте: сообщения раз в 3 с, список раз в 10 с.

## Скачать готовый APK (без установки Flutter)

1. GitHub → вкладка **Actions** → workflow **Mobile APK** → последний зелёный запуск.
2. Внизу страницы в блоке **Artifacts** скачать `tenot-apk` (zip с файлом `tenot-<N>.apk`).
3. Передать APK на Android-телефон (Telegram, почта, USB), открыть и разрешить установку
   из неизвестных источников. Приложение сразу работает с `https://tenot.ru`.

Собрать APK под другой сервер: Actions → Mobile APK → **Run workflow** → указать адрес backend.

## Собрать самому на MacBook

```bash
brew install --cask flutter          # Flutter SDK (Dart >= 3.8)
flutter doctor                        # подскажет, чего не хватает

cd mobile
flutter pub get
flutter build apk --release           # → build/app/outputs/flutter-apk/app-release.apk
```

Для сборки APK нужен Android SDK (проще всего — установить Android Studio,
затем `flutter doctor --android-licenses`).

Установить на подключённый по USB телефон: `adb install -r build/app/outputs/flutter-apk/app-release.apk`.

## Запуск на MacBook для отладки

```bash
cd mobile
flutter pub get

# iOS Simulator (нужен Xcode + CocoaPods)
open -a Simulator
flutter run -d ios

# Android Emulator (Android Studio → Device Manager)
flutter run -d emulator-5554

# Без симуляторов — как окно macOS
flutter run -d macos
```

По умолчанию приложение ходит на `https://tenot.ru`. Другой backend:

```bash
# локальный docker-compose.local.yml (сайт на :3000)
flutter run -d ios   --dart-define=API_BASE_URL=http://localhost:3000
flutter run -d macos --dart-define=API_BASE_URL=http://localhost:3000
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

## Проверки

```bash
flutter analyze
flutter test
```

## Сценарий приёмки (п. 5.4)

Регистрация → вход → перезапуск приложения (автологин) → лента → поиск с опечаткой и фильтры →
карточка → избранное → «Написать в чат» и голосовое сообщение (ответ видно на сайте) → создание объявления с фото → объявление видно на сайте →
в ЛК снять с публикации / удалить → выход.

## Публикация в магазины (подготовка)

- Android: `flutter build appbundle --release`. Сейчас релиз подписан debug-ключом (подходит для
  тестовой установки). Для Google Play создать keystore и подключить через `android/key.properties`
  (файл и ключи в репозиторий не коммитятся).
- iOS: `flutter build ipa` на Mac с аккаунтом Apple Developer заказчика (Signing в Xcode → Runner).
- Bundle/Application ID: `ru.tenot.app` (Android).

## Устройство кода

```
lib/
  config.dart            адрес backend (API_BASE_URL)
  theme.dart             токены дизайна из frontend/app/globals.css
  api/api.dart           HTTP-клиент + все запросы к backend
  api/models.dart        модели (по frontend/services/*.ts)
  state/session.dart     токен, текущий пользователь, избранное
  widgets/               шапка, нижняя навигация, карточка объявления, выбор из списка
  state/chat_store.dart  список чатов и непрочитанные (опрос раз в 10 с)
  screens/               главная, поиск, карточка, вход, ЛК, избранное, подача объявления, чаты
```
