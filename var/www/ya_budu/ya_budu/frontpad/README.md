# Frontpad - Интегрированная система управления заказами

Система управления заказами, интегрированная с сайтом YaBudu. Использует общую базу данных SQLite.

## Возможности

### 📋 Управление заказами
- Создание заказов на доставку и самовывоз
- Отслеживание статусов (pending → processing → ready → delivered)
- **Автоматическое получение заказов с сайта через WebSocket**
- **Автоматическая печать чеков при новом заказе**
- Управление оплатой (наличные, карта, онлайн)

### 🍔 Меню и товары
- **Общее меню с сайтом** - изменения синхронизируются
- Управление категориями
- Цены и описания
- Изображения товаров

### 📊 Отчёты и аналитика
- Продажи по дням
- Топ продаваемых товаров
- Средний чек
- Общая выручка

## Технологии

- **Backend**: Node.js + Express + SQLite + WebSocket
- **Frontend**: React + React Router
- **База данных**: Общая с сайтом (`yabudu.db`)

## Запуск системы

### 1. Убедитесь что сайт запущен

Сайт должен быть запущен на порту 3001:
```bash
node server.js
```

### 2. Установка зависимостей Frontpad сервера

```bash
cd frontpad/server
npm install
```

### 3. Установка зависимостей Frontpad клиента

```bash
cd frontpad/client
npm install
```

### 4. Запуск сервера Frontpad

```bash
cd frontpad/server
npm start
```

Сервер запустится на http://localhost:3002
WebSocket: ws://localhost:3002

### 5. Запуск клиента Frontpad (в новом терминале)

```bash
cd frontpad/client
npm start
```

Клиент запустится на http://localhost:3000

## Использование

1. Откройте http://localhost:3000 в браузере
2. Frontpad автоматически подключится к общей базе сайта
3. Все заказы с сайта будут появляться в реальном времени
4. Чеки будут автоматически печататься при новых заказах

## Интеграция с сайтом

### Как это работает:

1. **Общая база данных**: Frontpad использует ту же SQLite базу (`yabudu.db`) что и основной сайт
2. **WebSocket**: При создании заказа на сайте, Frontpad получает уведомление в реальном времени
3. **Синхронизация меню**: Категории и товары общие для сайта и Frontpad
4. **Автопечать**: При получении нового заказа автоматически открывается окно печати чека

### Порты:
- Сайт: http://localhost:3001
- Frontpad API: http://localhost:3002
- Frontpad WebSocket: ws://localhost:3002
- Frontpad UI: http://localhost:3000

## API Endpoints

### Категории
- `GET /api/categories` - список категорий
- `POST /api/categories` - создать категорию
- `PUT /api/categories/:id` - обновить категорию
- `DELETE /api/categories/:id` - удалить категорию

### Товары
- `GET /api/products` - список товаров
- `POST /api/products` - создать товар
- `PUT /api/products/:id` - обновить товар
- `DELETE /api/products/:id` - удалить товар

### Заказы
- `GET /api/orders` - список заказов
- `POST /api/orders` - создать заказ
- `PUT /api/orders/:id/status` - обновить статус
- `DELETE /api/orders/:id` - удалить заказ
- `POST /api/orders/:id/print` - напечатать чек

### Отчёты
- `GET /api/reports/dashboard` - данные для дашборда
- `GET /api/reports/sales` - продажи по дням
- `GET /api/reports/top-products` - топ товаров

## WebSocket события

- `new_order` - новый заказ (с сайта или Frontpad)
- `order_status_changed` - изменение статуса заказа
- `order_deleted` - заказ удалён
- `print_receipt` - команда на печать чека

## Структура проекта

```
frontpad/
├── server/
│   ├── src/
│   │   └── frontpad-server.js  # Сервер с WebSocket
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Orders.jsx      # + WebSocket + печать чеков
│   │   │   ├── Products.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Customers.jsx
│   │   │   └── Reports.jsx
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Печать чеков

Чеки форматируются для термопринтера 80мм. При получении нового заказа:
1. Появляется уведомление о новом заказе
2. Автоматически открывается окно печати
3. Чек можно перепечатать через кнопку в списке заказов

## Безопасность

В текущей версии не реализована аутентификация. Для production использования рекомендуется:
1. Добавить JWT аутентификацию
2. Ограничить доступ по IP
3. Использовать HTTPS