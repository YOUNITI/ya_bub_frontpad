-- =============================================================================
-- Миграция для добавления поддержки нескольких точек (фронтпадов)
-- Версия: 2.0
-- Дата: 2026-03-25
-- =============================================================================
-- Описание:
-- Добавляет поле point_id в таблицы для разделения заказов между точками
-- Каждый пользователь привязывается к точке и видит только свои заказы
-- =============================================================================

-- Используем базу данных Frontpad
USE yabudu_frontpad;

-- =============================================================================
-- ТАБЛИЦА: points (Точки/Рестораны)
-- =============================================================================
CREATE TABLE IF NOT EXISTS points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(50),
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вставляем точки (точка 1 - основная, точка 2 - новая)
INSERT INTO points (id, name, address, is_active) VALUES 
(1, 'Точка 1 (Основная)', 'ул. Примерная, 1', 1),
(2, 'Точка 2', 'ул. Примерная, 2', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================================
-- ТАБЛИЦА: users (Пользователи) - ДОБАВЛЯЕМ point_id
-- =============================================================================
-- Добавляем колонку point_id если её нет
SELECT COUNT(*) INTO @has_user_point_id 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'yabudu_frontpad' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'point_id';

SET @sql_user = IF(@has_user_point_id = 0, 
    'ALTER TABLE users ADD COLUMN point_id INT DEFAULT 1 AFTER role',
    'SELECT ''point_id already exists in users'' as result');
PREPARE stmt_user FROM @sql_user;
EXECUTE stmt_user;
DEALLOCATE PREPARE stmt_user;

-- Обновляем существующих пользователей - назначаем им point_id = 1 (основная точка)
UPDATE users SET point_id = 1 WHERE point_id IS NULL OR point_id = 0;

-- =============================================================================
-- ТАБЛИЦА: delivery_zones (Районы доставки) - ДОБАВЛЯЕМ point_id
-- =============================================================================
SELECT COUNT(*) INTO @has_zone_point_id 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'yabudu_frontpad' 
AND TABLE_NAME = 'delivery_zones' 
AND COLUMN_NAME = 'point_id';

SET @sql_zone = IF(@has_zone_point_id = 0, 
    'ALTER TABLE delivery_zones ADD COLUMN point_id INT DEFAULT 1 AFTER is_active',
    'SELECT ''point_id already exists'' as result');
PREPARE stmt_zone FROM @sql_zone;
EXECUTE stmt_zone;
DEALLOCATE PREPARE stmt_zone;

-- Добавляем индекс для быстрого поиска зон по точке
ALTER TABLE delivery_zones ADD INDEX idx_point_id (point_id);

-- Обновляем существующие зоны - назначаем им point_id = 1 (основная точка)
UPDATE delivery_zones SET point_id = 1 WHERE point_id IS NULL OR point_id = 0;

-- =============================================================================
-- ТАБЛИЦА: orders (Заказы) - ДОБАВЛЯЕМ point_id
-- =============================================================================
SELECT COUNT(*) INTO @has_order_point_id 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'yabudu_frontpad' 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'point_id';

SET @sql_order = IF(@has_order_point_id = 0, 
    'ALTER TABLE orders ADD COLUMN point_id INT DEFAULT 1 AFTER status',
    'SELECT ''point_id already exists in orders'' as result');
PREPARE stmt_order FROM @sql_order;
EXECUTE stmt_order;
DEALLOCATE PREPARE stmt_order;

-- Добавляем индекс для фильтрации заказов по точке
ALTER TABLE orders ADD INDEX idx_point_id (point_id);

-- =============================================================================
-- ТАБЛИЦА: products (Товары) - ДОБАВЛЯЕМ point_id (опционально)
-- =============================================================================
SELECT COUNT(*) INTO @has_product_point_id 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'yabudu_frontpad' 
AND TABLE_NAME = 'products' 
AND COLUMN_NAME = 'point_id';

SET @sql_product = IF(@has_product_point_id = 0, 
    'ALTER TABLE products ADD COLUMN point_id INT DEFAULT NULL',
    'SELECT ''point_id already exists in products'' as result');
PREPARE stmt_product FROM @sql_product;
EXECUTE stmt_product;
DEALLOCATE PREPARE stmt_product;

-- =============================================================================
-- ТАБЛИЦА: couriers (Курьеры) - ДОБАВЛЯЕМ point_id
-- =============================================================================
SELECT COUNT(*) INTO @has_courier_point_id 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'yabudu_frontpad' 
AND TABLE_NAME = 'couriers' 
AND COLUMN_NAME = 'point_id';

SET @sql_courier = IF(@has_courier_point_id = 0, 
    'ALTER TABLE couriers ADD COLUMN point_id INT DEFAULT 1',
    'SELECT ''point_id already exists in couriers'' as result');
PREPARE stmt_courier FROM @sql_courier;
EXECUTE stmt_courier;
DEALLOCATE PREPARE stmt_courier;

-- Обновляем существующих курьеров - назначаем им point_id = 1
UPDATE couriers SET point_id = 1 WHERE point_id IS NULL OR point_id = 0;

-- =============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =============================================================================
SELECT 'Миграция выполнена' as status;
SELECT * FROM points;
SELECT id, username, role, point_id FROM users;
SELECT id, name, point_id, min_order_amount, delivery_price, is_active FROM delivery_zones;

-- =============================================================================
-- ПРИМЕЧАНИЯ ПО ИСПОЛЬЗОВАНИЮ:
-- =============================================================================
-- 1. Каждый пользователь привязывается к точке через поле point_id в users
-- 2. При входе пользователь получает point_id в токене
-- 3. При получении заказов - фильтрация по point_id пользователя
-- 4. Курьеры также привязываются к точкам
-- 5. Зоны доставки привязываются к точкам (опционально)
-- 6. point_id = NULL или 0 означает "все точки" (для админа)
-- =============================================================================
