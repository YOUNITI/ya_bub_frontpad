-- Создание таблицы курьеров
CREATE TABLE IF NOT EXISTS couriers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  login VARCHAR(50) UNIQUE DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT DEFAULT 1 COMMENT '1 - может брать заказы, 0 - заблокирован',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Проверим что таблица создалась
DESCRIBE couriers;

-- Добавим тестового курьера (пароль: 123456)
INSERT INTO couriers (name, phone, login, password_hash, is_active) 
VALUES ('Тестовый курьер', '+79001234567', 'courier1', '$2a$10$YourHashHere', 1);
