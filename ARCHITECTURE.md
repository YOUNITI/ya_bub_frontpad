# Архитектура проекта "Я Буду" (Ya-Budu)

## Общая структура

Проект состоит из двух основных частей:
1. **Основной сайт** (публичная часть для клиентов) - ya-budu.ru
2. **Админ-панель Frontpad** (для управления заказами) - fp.ябуду.com

---

## 1. Основной сайт (ya-budu.ru)

### Сервер
- **Порт**: 3001
- **Технология**: Node.js + Express + React (Vite)
- **Статические файлы**: `/var/www/ya_budu/ya_budu/dist`
- **Файл запуска**: `server.js`

### Nginx конфиг
- **Файл**: `nginx/ya-budu.ru.conf`
- **Domains**: ябуду.com, www.ябуду.com, xn--90ag8bb0d.com (Punycode)
- **SSL**: Let's Encrypt
- **Проксирование**:
  - `/api` → `http://localhost:3001`
  - `/ws` → `http://localhost:3001`
  - `/socket.io/` → `http://localhost:3001`

### База данных
- **Тип**: SQLite
- **Файл**: `yabudu.db`
- **Расположение**: `/var/www/ya_budu/ya_budu/yabudu.db`

---

## 2. Админ-панель Frontpad (fp.ябуду.com)

### Сервер
- **Порт**: 3005
- **Технология**: Node.js + Express + React
- **Статические файлы**: `/var/www/ya_budu/ya_budu/frontpad/static`
- **Файл запуска**: `frontpad/server/src/index.js`

### Nginx конфиг
- **Файл**: `var/www/ya_budu/ya_budu/nginx/sites-enabled/fp.xn--90ag8bb0d.com.conf`
- **Domain**: fp.xn--90ag8bb0d.com (Punycode для fp.ябуду.com)
- **SSL**: Let's Encrypt
- **Проксирование**:
  - `/api/` → `http://localhost:3005/api/`
  - `/ws` → `http://localhost:3005`
  - `/uploads/` → `http://localhost:3005/uploads/`

### База данных
- **Тип**: MySQL
- **База**: yabudu_frontpad
- **Расположение**: Локальный MySQL сервер

---

## Схема взаимодействия

```
Клиент (браузер)
       │
       ▼
 Nginx (ya-budu.ru:443)
       │
       ▼
Основной сайт (Node.js :3001)
       │
       ├──► SQLite (yabudu.db)
       │
       └──► Frontpad API (:3005) — синхронизация заказов
                    │
                    ▼
              MySQL (yabudu_frontpad)

       │
       ▼
 Nginx (fp.ябуду.com:443)
       │
       ▼
 Frontpad (Node.js :3005)
```

---

## API Endpoints

### Основной сайт (:3001)
- `GET/POST /api/products` - товары
- `GET /api/categories` - категории
- `POST /api/orders` - создание заказа
- `GET /api/orders/my` - заказы пользователя
- `WS /ws` - WebSocket чат

### Frontpad (:3005)
- `GET/POST /api/orders` - заказы
- `GET /api/products` - товары
- `POST /api/site/orders/sync` - синхронизация с основным сайтом
- `WS /ws` - WebSocket уведомления

---

## Синхронизация заказов

При создании заказа на основном сайте:
1. Заказ сохраняется в SQLite (основной сайт)
2. Данные отправляются на Frontpad через `POST /api/site/orders/sync`
3. Frontpad сохраняет заказ в MySQL
4. Автоматическая печать чека

---

## Файлы конфигурации

### Основной сайт
- `.env` - переменные окружения
- `config.js` - конфигурация подключений
- `vite.config.js` - настройки сборки Vite

### Frontpad
- `frontpad/server/.env` - переменные окружения
- `frontpad/server/src/db.js` - подключение к БД

---

## Команды запуска

### Основной сайт
```bash
cd /var/www/ya_budu/ya_budu
npm start
# или с PM2
pm2 start ecosystem.config.js
```

### Frontpad
```bash
cd /var/www/ya_budu/ya_budu/frontpad/server
npm start
# или с PM2
pm2 start frontpad.config.js
```

---

## Структура папок

```
/var/www/ya_budu/
└── ya_budu/
    ├── dist/              # Собранный React (основной сайт)
    ├── frontpad/
    │   ├── static/        # Собранный React (Frontpad)
    │   ├── server/        # Серверная часть
    │   │   ├── src/
    │   │   │   ├── index.js    # Основной сервер
    │   │   │   ├── db.js       # Работа с БД
    │   │   │   └── receipt.js  # Генерация чеков
    │   │   └── .env
    │   └── client/        # Исходники React
    ├── server.js          # Основной сайт сервер
    ├── yabudu.db         # SQLite база
    └── uploads/           # Загруженные изображения
```
