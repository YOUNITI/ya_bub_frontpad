# План миграции на MySQL

## Архитектура

```
MySQL localhost:3306
├── База: yabudu_main
│   ├── categories (id, name, slug, sort_order)
│   ├── products (id, name, description, price, category_id, image_url)
│   ├── customers
│   ├── orders
│   ├── messages
│   ├── users
│   ├── sizes
│   ├── addons
│   ├── size_addons
│   ├── discounts
│   └── settings
│
└── База: yabudu_frontpad
    ├── categories (id, name, sort_order, slug, created_at, updated_at)
    ├── products (id, name, description, price, category_id, image_url, is_active, is_hidden, discount_price, sort_order, is_combo)
    ├── sizes
    ├── addons (addon_templates)
    ├── size_addons (product_addons)
    ├── ingredients
    ├── recipes
    ├── inventory_movements
    ├── addon_templates
    ├── product_addons
    ├── discounts
    ├── order_discounts
    ├── product_discounts
    ├── combo_products
    ├── combo_items
    └── settings
```

## Файлы для создания

### 1. SQL Схемы

- `var/www/ya_budu/ya_budu/frontpad/server/mysql_schema_main.sql` - схема для yabudu_main
- `var/www/ya_budu/ya_budu/frontpad/server/mysql_schema_frontpad.sql` - схема для yabudu_frontpad (существующая)

### 2. Скрипты миграции

- `var/www/ya_budu/ya_budu/migrate_to_mysql_main.cjs` - миграция main site
- `var/www/ya_budu/ya_budu/frontpad/server/migrate_to_mysql.cjs` - миграция frontpad (обновить)

### 3. Обновления серверов

- `var/www/ya_budu/ya_budu/server.js` - добавить mysql2, обновить инициализацию БД
- `var/www/ya_budu/ya_budu/frontpad/server/src/index.js` - обновить для MySQL

### 4. Конфигурация

- `var/www/ya_budu/ya_budu/.env.example` - добавить MySQL настройки
- `var/www/ya_budu/ya_budu/frontpad/server/.env.example` - добавить MySQL настройки

## Порядок выполнения

### Шаг 1: Создать SQL схемы
- Создать mysql_schema_main.sql с таблицами для main site
- Проверить mysql_schema.sql для frontpad

### Шаг 2: Создать скрипты миграции
- migrate_to_mysql_main.cjs - из yabudu.db в yabudu_main
- migrate_to_mysql.cjs - из frontpad.db в yabudu_frontpad

### Шаг 3: Обновить server.js (порт 3001)
- Добавить require('mysql2/promise')
- Заменить sqlite3 на mysql2
- Обновить initializeDb()
- Добавить поддержку пула соединений

### Шаг 4: Обновить frontpad/server/src/index.js
- Аналогичные изменения для MySQL

### Шаг 5: Тестирование
- Запустить миграцию main site
- Запустить миграцию frontpad
- Проверить работу обоих серверов

## Переменные окружения

### Для main site (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=yabudu_main
DB_TYPE=mysql  # или sqlite для совместимости
```

### Для frontpad (.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=yabudu_frontpad
DB_TYPE=mysql
```

## Команда миграции

```bash
# Миграция main site
cd var/www/ya_budu/ya_budu
node migrate_to_mysql_main.cjs

# Миграция frontpad
cd var/www/ya_budu/ya_budu/frontpad/server
node migrate_to_mysql.cjs
```

## Production деплой

На production сервере:
1. Установить MySQL
2. Создать базы: yabudu_main, yabudu_frontpad
3. Запустить миграцию
4. Обновить .env на сервере
5. Перезапустить сервисы через PM2

## Откат (если что-то пойдет не так)

Для отката достаточно:
1. Остановить сервер
2. Удалить/переименовать базы MySQL
3. Запустить сервер - он создаст SQLite базы заново
4. Восстановить данные из бэкапа SQLite
