-- Миграция: добавление колонок для курьеров в таблицу orders
-- Выполните этот скрипт чтобы добавить необходимые колонки

-- Добавляем колонку courier_id
ALTER TABLE orders ADD COLUMN courier_id INT DEFAULT NULL;

-- Добавляем колонку courier_name  
ALTER TABLE orders ADD COLUMN courier_name VARCHAR(255) DEFAULT NULL;

-- Добавляем колонку assigned_at
ALTER TABLE orders ADD COLUMN assigned_at DATETIME DEFAULT NULL;

-- Проверим структуру таблицы
DESCRIBE orders;
