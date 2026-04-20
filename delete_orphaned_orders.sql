-- Удаление заказов, которые не были синхронизированы с Frontpad
-- База данных: MySQL (основной сайт)

-- Просмотр заказов за 9 марта 2026
SELECT id, order_number, guest_name, guest_phone, total_amount, status, created_at 
FROM orders 
WHERE DATE(created_at) = '2026-03-09'
ORDER BY created_at DESC;

-- Удаление конкретных заказов (раскомментируйте нужную строку)
-- DELETE FROM orders WHERE id = 214;
-- DELETE FROM orders WHERE id = 213;

-- Удаление всех заказов за 9 марта 2026
-- DELETE FROM orders WHERE DATE(created_at) = '2026-03-09';
