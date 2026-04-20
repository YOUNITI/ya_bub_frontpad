-- Добавляем недостающие колонки в таблицу products
ALTER TABLE products ADD COLUMN is_active TINYINT(1) DEFAULT 1;
ALTER TABLE products ADD COLUMN is_combo TINYINT(1) DEFAULT 0;
ALTER TABLE products ADD COLUMN combo_items TEXT;
ALTER TABLE products ADD COLUMN is_featured TINYINT(1) DEFAULT 0;
ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0;

-- Проверим структуру таблицы
DESC products;
