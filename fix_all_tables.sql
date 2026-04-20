-- Полный скрипт исправления всех таблиц для Frontpad
-- Выполните в MySQL: mysql -u root -p yabudu_main

-- === ТАБЛИЦА PRODUCTS ===
ALTER TABLE products ADD COLUMN is_active INT DEFAULT 1;
ALTER TABLE products ADD COLUMN is_featured INT DEFAULT 0;
ALTER TABLE products ADD COLUMN is_combo INT DEFAULT 0;
ALTER TABLE products ADD COLUMN combo_items TEXT;
ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0;

-- === ТАБЛИЦА SIZES ===
-- Проверяем есть ли таблица sizes
CREATE TABLE IF NOT EXISTS sizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  size_value VARCHAR(50),
  price DECIMAL(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- === ТАБЛИЦА SIZE_ADDONS ===
CREATE TABLE IF NOT EXISTS size_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  size_id INT NOT NULL,
  addon_id INT NOT NULL,
  is_required INT DEFAULT 0,
  price_modifier REAL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (size_id) REFERENCES sizes(id),
  FOREIGN KEY (addon_id) REFERENCES addon_templates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- === ТАБЛИЦА ORDERS ===
ALTER TABLE orders ADD COLUMN site_order_id INT;
ALTER TABLE orders ADD COLUMN customer_id INT;
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_reason TEXT;

-- Проверяем результат
SHOW TABLES;
