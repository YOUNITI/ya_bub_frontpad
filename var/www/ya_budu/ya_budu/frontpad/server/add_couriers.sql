-- Миграция для добавления функционала курьеров
-- Выполнить этот файл в MySQL

-- 1. Создаем таблицу курьеров (с login вместо phone)
CREATE TABLE IF NOT EXISTS couriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Если таблица уже существует с phone, добавляем колонку login
-- ALTER TABLE couriers ADD COLUMN login VARCHAR(50) UNIQUE;

-- 3. Добавляем поля для курьера в таблицу заказов
ALTER TABLE orders 
ADD COLUMN courier_id INT DEFAULT NULL,
ADD COLUMN courier_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN assigned_at DATETIME DEFAULT NULL,
ADD COLUMN delivery_started_at DATETIME DEFAULT NULL,
ADD COLUMN delivered_at DATETIME DEFAULT NULL,
ADD COLUMN courier_comment TEXT DEFAULT NULL;

-- 4. Добавляем индекс для быстрого поиска заказов курьера
ALTER TABLE orders ADD INDEX idx_courier_status (courier_id, status);
