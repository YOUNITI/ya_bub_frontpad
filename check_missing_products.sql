-- ============================================
-- ПРОВЕРКА ТОВАРОВ И КАТЕГОРИЙ В MySQL
-- Выполни эти запросы в базе yabudu_main
-- ============================================

-- 1. Показать все категории
SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC;

-- 2. Показать все товары с их категориями
SELECT p.id, p.name, p.price, p.image_url, p.category_id, c.name as category_name 
FROM products p 
LEFT JOIN categories c ON p.category_id = c.id 
ORDER BY c.name ASC, p.name ASC;

-- 3. Поиск товара "бургер" (или "bacon")
SELECT id, name, price, category_id, image_url FROM products WHERE name LIKE '%бургер%' OR name LIKE '%bacon%';

-- 4. Поиск товаров по категории "Комбо"
SELECT p.id, p.name, p.price, p.image_url, c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.name LIKE '%комбо%' OR c.name LIKE '%комб%';

-- 5. Показать все товары у которых нет категории (category_id = NULL)
SELECT id, name, price, image_url, category_id FROM products WHERE category_id IS NULL OR category_id = 0;

-- 6. Количество товаров по категориям
SELECT c.name as category_name, COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.sort_order ASC, c.name ASC;