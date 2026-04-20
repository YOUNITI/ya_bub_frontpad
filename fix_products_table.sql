-- Скрипт для исправления таблицы products в MySQL
-- Выполните в MySQL: mysql -u root -p yabudu_main

-- Добавляем все недостающие колонки (если ошибка "Duplicate column" - игнорируем)
ALTER TABLE products ADD COLUMN is_active INT DEFAULT 1;
ALTER TABLE products ADD COLUMN is_featured INT DEFAULT 0;
ALTER TABLE products ADD COLUMN is_combo INT DEFAULT 0;
ALTER TABLE products ADD COLUMN combo_items TEXT;
ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0;

-- Проверяем результат
DESCRIBE products;
