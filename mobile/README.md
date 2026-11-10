# Stackwork для Android

Мобильное приложение к сайту [stackworkjobs.vercel.app](https://stackworkjobs.vercel.app). Та же база, тот же аккаунт: лента вакансий с фильтрами, карточка вакансии, зарплаты по технологиям, компании, сохранённые, отклики на вакансии работодателей Stackwork, вход, регистрация, удаление аккаунта. Дизайн повторяет Soft UI сайта (цвета, Manrope и JetBrains Mono, выпуклые карточки и утопленные поля).

Приложение ходит только в `GET|POST|PUT|PATCH|DELETE /api/v1/*` сайта (раздел «API v1» в корневом README). Поэтому **сайт с API v1 должен быть задеплоен раньше, чем собирается релиз приложения**.

## Стек

Flutter 3.47 / Dart 3.13, Riverpod 3 (состояние), go_router 17 (маршруты повторяют адреса сайта), dio (HTTP), flutter_secure_storage (токен входа в Android Keystore), firebase_core и firebase_messaging (push), url_launcher, share_plus, cached_network_image, intl. Только Android (`minSdk 26`, `targetSdk 36`, `applicationId com.stackworkjobs.app`).

## Запуск на Windows

Одной командой: поднять эмулятор `Pixel_10_Pro_XL`, дождаться загрузки Android и запустить приложение (если эмулятор уже работает, первая часть просто сообщит об этом):

```powershell
cd "C:\Users\zakco\VS Code\stackwork\mobile"; flutter emulators --launch Pixel_10_Pro_XL; $adb = if ($env:ANDROID_HOME) { "$env:ANDROID_HOME\platform-tools\adb.exe" } else { "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }; do { Start-Sleep 3 } until ((& $adb shell getprop sys.boot_completed 2>$null) -match "1"); flutter run
```

Список эмуляторов: `flutter emulators`. По шагам:

```powershell
cd "C:\Users\zakco\VS Code\stackwork\mobile"
flutter pub get
flutter emulators --launch Pixel_10_Pro_XL
flutter run                       # телефон по USB или запущенный эмулятор
```

Другой адрес API (например, локальный сайт при разработке, эмулятор видит компьютер как 10.0.2.2):

```powershell
flutter run --dart-define=API_BASE=http://10.0.2.2:3000
```

Проверки: `flutter analyze` и `flutter test` (виджет-тесты гоняют приложение на снимках реальных ответов API из `test/fixtures`). Снимки экранов без эмулятора: `flutter test --dart-define=SCREENSHOTS=true --update-goldens test/screenshots_test.dart`, результат в `test/goldens/`.

## Структура

```
lib/
  main.dart                 ProviderScope, go_router, нижняя навигация, разбор ссылок сайта
  core/theme.dart           цвета и шрифты Soft UI, ThemeData
  core/api.dart             ApiClient: dio, токен, все методы API v1, VacancyFilters
  core/push.dart            PushService: Firebase Messaging, регистрация устройства, переходы по нажатию
  core/providers.dart       сессия, фильтры, лента с подгрузкой, сохранённые, справочники
  core/format.dart          числа, деньги, даты как на сайте
  models/models.dart        Vacancy, Company, Salary*, User, Application, AppMeta и парсинг JSON
  widgets/soft.dart         SoftCard, SoftInset, PrimaryButton, SoftChip, SoftField, StatusView…
  widgets/vacancy_card.dart карточка вакансии и закладка
  features/vacancies/       лента, поиск, быстрые чипы, окно фильтров
  features/vacancy/         карточка вакансии, окно отклика
  features/salaries/        таблица зарплат, разбор по технологии
  features/company/         страница компании
  features/profile/         профиль, сохранённые, вход, регистрация, сброс пароля, удаление аккаунта
assets/fonts/               Manrope и JetBrains Mono (variable TTF, лицензия OFL рядом)
assets/images/              исходники иконки (icon-512, adaptive foreground)
android/                    applicationId, подпись, App Links, иконка, экран запуска
```

Маршруты: `/` лента (принимает `?skill=python&format=REMOTE&q=…`), `/vacancies/:slug`, `/companies/:slug`, `/salaries`, `/salaries/:slug`, `/saved`, `/profile`, `/login?next=`, `/register`, `/forgot`, `/profile/delete`. Ссылки сайта вида `/en/...` и `/jobs/<skill>[/remote]` переводятся на эти экраны.

## Иконка

Исходники в `assets/images/`, генерация: `dart run flutter_launcher_icons` (настройки в `pubspec.yaml`).

## Подпись релиза

Один раз создайте ключ загрузки (keytool из JDK Android Studio, в PowerShell):

```powershell
keytool -genkey -v -keystore "$env:USERPROFILE\stackwork-upload.jks" -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Создайте `android/key.properties` (в `.gitignore`, в репозиторий не попадает):

```
storePassword=пароль хранилища
keyPassword=пароль ключа
keyAlias=upload
storeFile=C:/Users/zakco/stackwork-upload.jks
```

Сборка для Google Play (App Bundle):

```powershell
flutter build appbundle --release
# build\app\outputs\bundle\release\app-release.aab
```

Без `key.properties` релиз подписывается отладочным ключом: такой файл Google Play не примет, но он годится для проверки сборки. Ключ и `key.properties` храните вне репозитория и делайте резервную копию: потеря ключа загрузки решается через поддержку Play, но долго.

Версия приложения задаётся в `pubspec.yaml`: `version: 1.0.0+1`. Число после `+` (versionCode) должно расти с каждой загрузкой в Play.

## Ссылки сайта открываются в приложении (App Links)

В манифесте объявлены `https://stackworkjobs.vercel.app/vacancies/…`, `/en/vacancies/…`, `/companies/…`, `/jobs/…`, `/salaries…` с `autoVerify`. Чтобы Android доверял приложению, сайт должен отдавать `/.well-known/assetlinks.json` с отпечатком ключа подписи. Сайт уже умеет это: задайте в Vercel переменную `ANDROID_CERT_SHA256` и передеплойте.

Какие отпечатки нужны:

1. ключ, которым подписывает Google Play (Play Console, приложение, «Проверка целостности приложения» / App integrity, раздел «Подпись приложения», SHA-256);
2. ваш ключ загрузки, чтобы ссылки работали и в сборках, установленных напрямую:
   ```powershell
   keytool -list -v -keystore "$env:USERPROFILE\stackwork-upload.jks" -alias upload | Select-String SHA256
   ```

Оба значения через запятую: `ANDROID_CERT_SHA256=AA:BB:…,CC:DD:…`. Проверить: `https://stackworkjobs.vercel.app/.well-known/assetlinks.json` должен вернуть массив с `package_name` и отпечатками. Пока переменная пуста, ссылки открываются в браузере, приложение работает как обычно.

## Публикация в Google Play: что нужно подготовить

1. **Аккаунт разработчика** уже есть. Для личных аккаунтов, созданных после ноября 2023, перед выпуском в продакшен нужно закрытое тестирование: не меньше 12 тестеров, непрерывно 14 дней, затем заявка на доступ к продакшену.
2. **Карточка приложения**: название «Stackwork: IT-вакансии с зарплатой», краткое описание (до 80 знаков), полное описание, иконка 512×512 (`assets/images/icon-512.png`), баннер 1024×500, не меньше 2 скриншотов телефона (сделайте в эмуляторе Pixel: лента, вакансия, зарплаты, профиль).
3. **Политика конфиденциальности**: ссылка `https://stackworkjobs.vercel.app/privacy`. Текст на сайте описывает именно то, что собирают сайт и приложение; заполните переменную `LEGAL_OPERATOR` (реквизиты оператора) и `CONTACT_EMAIL`, иначе на странице останутся заглушки, и проверяющий Play это заметит.
4. **Удаление аккаунта** (требование Play для приложений с регистрацией): в приложении Профиль → Удалить аккаунт, на сайте `https://stackworkjobs.vercel.app/me/delete`. Эту ссылку надо вписать в Play Console в разделе «Безопасность данных» → «Удаление данных».
5. **Форма «Безопасность данных»** (Data safety). Приложение собирает: адрес электронной почты и имя (функциональность приложения, управление аккаунтом), «другая информация о пользователе» в виде текста отклика и ссылок на резюме и GitHub (функциональность), история действий внутри приложения в виде сохранённых вакансий (функциональность), «идентификаторы устройства или другие идентификаторы» в виде Firebase Installation ID для push-уведомлений (функциональность; собирается только после входа и разрешения на уведомления). Данные передаются по HTTPS, пользователь может запросить удаление. Не собирает: геолокацию, контакты, файлы, рекламные идентификаторы, финансовые данные. Сторонние SDK: Firebase Cloud Messaging (Google) для push, без аналитики и рекламы. Статистика посещений сайта строится по обезличенному хешу, в приложении отдельной аналитики нет.
6. **Анкета о контенте** (возрастной рейтинг): приложение без пользовательского контента для всех, рейтинг «3+» / Everyone. Категория: «Бизнес» или «Работа».
7. **Целевой API**: с 31 августа 2026 новые приложения должны быть собраны под API 36, в проекте так и задано (`targetSdk 36`, `compileSdk 36`).
8. **Тестовый доступ для проверяющих**: Play может попросить логин и пароль для проверки функций за авторизацией. Заведите на сайте отдельного соискателя (например, `playreview@…` с подтверждённой почтой) и укажите его в разделе «Доступ к приложению».

## Push-уведомления (Firebase Cloud Messaging)

Соискатель получает уведомление, когда работодатель меняет статус его отклика или пишет сообщение; работодатель с приложением получает уведомление о новом отклике. Письма при этом уходят как и раньше. Без настройки Firebase приложение собирается и работает, просто без push.

Что сделать один раз:

1. В [консоли Firebase](https://console.firebase.google.com) создать проект (например, `stackwork`), в нём добавить Android-приложение с именем пакета `com.stackworkjobs.app`. Аналитику при создании можно выключить, она не нужна.
2. Скачать `google-services.json` и положить в `mobile/android/app/google-services.json`. Файл можно коммитить: в нём нет секретов, только идентификаторы проекта. Пересобрать приложение (`flutter run`), в логе Gradle пропадёт строка «google-services.json не найден».
3. Настройки проекта → Сервисные аккаунты → «Создать закрытый ключ». Скачанный JSON положить в Vercel переменной `FIREBASE_SERVICE_ACCOUNT` (содержимое файла целиком; если Vercel ругается на переносы строк, вставьте base64 от файла: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\путь\ключ.json"))` в PowerShell). Этот файл секретный, в репозиторий не попадает.
4. Передеплоить сайт. Проверка: войти в приложении соискателем (появится системный запрос разрешения на уведомления), откликнуться на вакансию работодателя Stackwork, затем в кабинете работодателя на сайте сменить статус этого отклика и написать сообщение: на телефон придёт уведомление, при открытом приложении баннер внизу экрана.

Как это устроено: после входа приложение запрашивает разрешение на уведомления (Android 13+), регистрируется в FCM и отправляет на сервер Firebase Installation ID (`PUT /api/v1/me/devices`); при выходе снимает его. Сервер (`src/lib/push.ts`) шлёт сообщения через FCM HTTP v1 от имени сервисного аккаунта, мёртвые адреса удаляет. Канал уведомлений «Отклики» создаётся в `MainActivity.kt`, иконка строки состояния `res/drawable/ic_notification.xml`. Нажатие на уведомление открывает профиль (список откликов) или вакансию.

## Что сознательно не вошло в версию 1

- Подписки на новые вакансии по фильтру с push (инфраструктура теперь есть, нужна только серверная выборка).
- Кабинет работодателя: вакансии размещаются на сайте, приложение для соискателей.
- Английский интерфейс: UI на русском, вакансии показываются на языке источника, как на сайте.
- Сброс пароля завершается на сайте по ссылке из письма (приложение только отправляет письмо).
