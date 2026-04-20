-- Миграция для добавления таблицы районов доставки в Frontpad

-- SQLite
CREATE TABLE IF NOT EXISTS delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  delivery_price INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- MySQL
-- CREATE TABLE IF NOT EXISTS delivery_zones (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   min_order_amount INT DEFAULT 0,
--   delivery_price INT DEFAULT 0,
--   is_active INT DEFAULT 1,
--   sort_order INT DEFAULT 0,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
