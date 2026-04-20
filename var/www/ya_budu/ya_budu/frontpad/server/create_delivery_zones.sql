-- Миграция для добавления районов доставки и связанных полей

-- Создать таблицу районов доставки
CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Добавить колонки зон в таблицу заказов (SQLite)
-- ALTER TABLE orders ADD COLUMN zone_id INTEGER;
-- ALTER TABLE orders ADD COLUMN delivery_price INTEGER DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN zone_name TEXT;

-- Добавить колонки зон в таблицу заказов (MySQL)
-- ALTER TABLE orders ADD COLUMN zone_id INT;
-- ALTER TABLE orders ADD COLUMN delivery_price INT DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN zone_name VARCHAR(255);

-- Пример данных районов (раскомментируйте для заполнения)
-- INSERT INTO delivery_zones (name, price, sort_order) VALUES 
--   ('Центр', 0, 1),
--   ('Западный', 0, 2),
--   ('Восточный', 0, 3),
--   ('Северный', 100, 4),
--   ('Южный', 150, 5),
--   ('Пригород', 200, 6);
