-- Проверка и создание таблицы size_addons
-- Если таблица не существует - создаём

CREATE TABLE IF NOT EXISTS size_addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  size_id INT NOT NULL,
  addon_id INT NOT NULL,
  is_required INT DEFAULT 0,
  price_modifier DECIMAL(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 0,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);

-- Проверим есть ли таблица
SHOW TABLES LIKE 'size_addons';
