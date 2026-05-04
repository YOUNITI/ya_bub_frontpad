-- Тест изоляции системы двух точек
-- Выполните эти запросы в MySQL для проверки работы системы

USE yabudu_frontpad;

-- 1. Проверяем пользователей
SELECT 'Пользователи:' as info;
SELECT id, username, role, point_id FROM users ORDER BY id;

-- 2. Проверяем точки
SELECT 'Точки:' as info;
SELECT id, name, address FROM points WHERE is_active = 1 ORDER BY id;

-- 3. Проверяем районы доставки
SELECT 'Районы доставки:' as info;
SELECT dz.id, dz.name, dz.point_id, p.name as point_name
FROM delivery_zones dz
LEFT JOIN points p ON dz.point_id = p.id
WHERE dz.is_active = 1
ORDER BY dz.id;

-- 4. Проверяем последние заказы
SELECT 'Последние 10 заказов:' as info;
SELECT o.id, o.order_number, o.guest_name, o.point_id, p.name as point_name, o.status, o.created_at
FROM orders o
LEFT JOIN points p ON o.point_id = p.id
ORDER BY o.id DESC
LIMIT 10;

-- 5. Проверяем распределение заказов по точкам
SELECT 'Распределение заказов по точкам:' as info;
SELECT
    p.name as point_name,
    COUNT(o.id) as orders_count,
    GROUP_CONCAT(DISTINCT o.status) as statuses
FROM points p
LEFT JOIN orders o ON p.id = o.point_id
WHERE p.is_active = 1
GROUP BY p.id, p.name
ORDER BY p.id;

-- 6. Проверяем районы по точкам
SELECT 'Районы по точкам:' as info;
SELECT
    p.name as point_name,
    COUNT(dz.id) as zones_count,
    GROUP_CONCAT(dz.name) as zone_names
FROM points p
LEFT JOIN delivery_zones dz ON p.id = dz.point_id AND dz.is_active = 1
WHERE p.is_active = 1
GROUP BY p.id, p.name
ORDER BY p.id;
