-- Обновление номеров телефонов в существующих чатах
-- Сопоставляем customer_id из chats с таблицей customers

UPDATE chats c
JOIN customers cu ON c.customer_id = cu.id
SET c.customer_phone = cu.phone
WHERE c.customer_phone = '' OR c.customer_phone IS NULL;

-- Проверить результат
SELECT c.id, c.customer_name, c.customer_phone, cu.phone as phone_from_customers
FROM chats c
LEFT JOIN customers cu ON c.customer_id = cu.id
LIMIT 20;
