-- Удалить товары без изображений из базы MySQL (основной сайт)

-- Удалить "Запеченный ролл барбекю" (ID: 115)
DELETE FROM products WHERE id = 115;

-- Удалить "Запеченный с омлетом и сыром" (ID: 119)
DELETE FROM products WHERE id = 119;

-- Удалить "Лосось гриль" (ID: 124)
DELETE FROM products WHERE id = 124;

-- Проверить результат - товары без изображений
SELECT id, name, price, image_url FROM products WHERE image_url IS NULL OR image_url = '' OR image_url = 'null';
