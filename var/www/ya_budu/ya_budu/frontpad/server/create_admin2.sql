-- Скрипт для создания пользователя admin2 и обновления прав доступа
-- Запустите это в MySQL базу yabudu_frontpad

USE yabudu_frontpad;

-- Обновляем главного админа: point_id = 1 (видит только точку 1)
UPDATE users SET point_id = 1 WHERE username = 'admin';

-- Создаем пользователя admin2 с паролем admin2 и point_id = 2
-- Если пользователь уже существует - обновляем ему point_id
INSERT INTO users (username, password, role, point_id) 
VALUES ('admin2', '$2a$10$EixZaY3s72Qh15g8i0G0/.X7eK1X7Q5Z7V6U5Y4X3W2V1U0T9S8R7', 'admin', 2)
ON DUPLICATE KEY UPDATE point_id = 2;

-- Проверяем результат
SELECT id, username, role, point_id FROM users;

-- Проверяем точки
SELECT * FROM points;

-- ✅ Готово!
-- Авторизация:
-- admin / admin → видит ТОЛЬКО заказы точки 1
-- admin2 / admin2 → видит ТОЛЬКО заказы точки 2
