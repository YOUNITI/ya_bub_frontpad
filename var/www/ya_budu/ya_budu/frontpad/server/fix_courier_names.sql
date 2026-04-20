-- Скрипт для обновления имени курьера в заказах
-- Запустите этот скрипт в MySQL для обновления всех заказов, где есть courier_id но нет courier_name

-- Сначала проверим сколько таких заказов
SELECT COUNT(*) as 'Заказов без имени курьера' 
FROM orders 
WHERE courier_id IS NOT NULL 
  AND (courier_name IS NULL OR courier_name = '' OR courier_name = 'Курьер');

-- Обновляем имена курьеров на основе данных из таблицы couriers
UPDATE orders o
INNER JOIN couriers c ON o.courier_id = c.id
SET o.courier_name = c.name
WHERE o.courier_id IS NOT NULL 
  AND (o.courier_name IS NULL OR o.courier_name = '' OR o.courier_name = 'Курьер');

-- Проверим результат
SELECT o.id, o.courier_id, c.name as 'Имя курьера из таблицы couriers', o.courier_name as 'Имя в заказе'
FROM orders o
LEFT JOIN couriers c ON o.courier_id = c.id
WHERE o.courier_id IS NOT NULL
ORDER BY o.id DESC
LIMIT 20;
