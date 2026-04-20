-- Проверить товары с is_combo = 1 в основной базе
SELECT id, name, price, is_combo, category_id FROM products WHERE is_combo = 1;

-- Посмотреть все категории
SELECT * FROM categories;

-- Посмотреть товары в категории "Комбо" (подставь ID категории)
SELECT id, name, price, image_url FROM products WHERE category_id = {ID_КАТЕГОРИИ_КОМБО};
