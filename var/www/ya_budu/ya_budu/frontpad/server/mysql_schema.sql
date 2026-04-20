-- Миграция базы данных Frontpad с SQLite на MySQL
-- База данных: yabudu_frontpad

-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS yabudu_frontpad CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yabudu_frontpad;

-- =============================================================================
-- ТАБЛИЦА: categories (Категории)
-- =============================================================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    slug VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sort_order (sort_order),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: products (Товары)
-- =============================================================================
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    category_id INT,
    image_url VARCHAR(500),
    is_active INT DEFAULT 1,
    is_hidden INT DEFAULT 0,
    discount_price DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_combo INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_active (is_active),
    INDEX idx_name (name),
    INDEX idx_is_combo (is_combo),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: customers (Клиенты)
-- =============================================================================
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50) UNIQUE,
    address TEXT,
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: orders (Заказы)
-- =============================================================================
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_email VARCHAR(255),
    order_type VARCHAR(50) DEFAULT 'delivery',
    address TEXT,
    street VARCHAR(255),
    building VARCHAR(50),
    apartment VARCHAR(50),
    entrance VARCHAR(50),
    floor VARCHAR(50),
    intercom VARCHAR(50),
    is_asap INT DEFAULT 1,
    delivery_date DATE,
    delivery_time VARCHAR(50),
    custom_time DATETIME,
    payment VARCHAR(50) DEFAULT 'cash',
    comment TEXT,
    items JSON,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_reason TEXT,
    ready_time VARCHAR(10),
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_created_at (created_at),
    INDEX idx_guest_phone (guest_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: sizes (Размеры товаров)
-- =============================================================================
DROP TABLE IF EXISTS sizes;
CREATE TABLE sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    size_value VARCHAR(50),
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_default INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: ingredients (Ингредиенты)
-- =============================================================================
DROP TABLE IF EXISTS ingredients;
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'шт',
    current_quantity DECIMAL(10, 3) DEFAULT 0,
    min_quantity DECIMAL(10, 3) DEFAULT 0,
    cost_per_unit DECIMAL(10, 2) DEFAULT 0,
    supplier VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: recipes (Рецептуры)
-- =============================================================================
DROP TABLE IF EXISTS recipes;
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'шт',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_ingredient (ingredient_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_ingredient (product_id, ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: inventory_movements (Движения по складу)
-- =============================================================================
DROP TABLE IF EXISTS inventory_movements;
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    reason TEXT,
    order_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ingredient (ingredient_id),
    INDEX idx_order (order_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: addon_templates (Шаблоны дополнений)
-- =============================================================================
DROP TABLE IF EXISTS addon_templates;
CREATE TABLE addon_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    default_price DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active INT DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'шт',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: product_addons (Связь товаров с дополнениями)
-- =============================================================================
DROP TABLE IF EXISTS product_addons;
CREATE TABLE product_addons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    addon_template_id INT NOT NULL,
    custom_price DECIMAL(10, 2),
    sort_order INT DEFAULT 0,
    is_required INT DEFAULT 0,
    min_select INT DEFAULT 0,
    max_select INT DEFAULT 0,
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_addon (addon_template_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_addon (product_id, addon_template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: discounts (Общие скидки)
-- =============================================================================
DROP TABLE IF EXISTS discounts;
CREATE TABLE discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'percent',
    value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    code VARCHAR(50) UNIQUE,
    is_active INT DEFAULT 1,
    valid_from DATETIME,
    valid_to DATETIME,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: order_discounts (Скидки в заказах)
-- =============================================================================
DROP TABLE IF EXISTS order_discounts;
CREATE TABLE order_discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    discount_id INT NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_discount (discount_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: product_discounts (Скидки на товары)
-- =============================================================================
DROP TABLE IF EXISTS product_discounts;
CREATE TABLE product_discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'percent',
    value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    code VARCHAR(50),
    is_active INT DEFAULT 1,
    valid_from DATETIME,
    valid_to DATETIME,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: combo_products (Комбо-наборы)
-- =============================================================================
DROP TABLE IF EXISTS combo_products;
CREATE TABLE combo_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    image_url VARCHAR(500),
    is_active INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: combo_items (Состав комбо-наборов)
-- =============================================================================
DROP TABLE IF EXISTS combo_items;
CREATE TABLE combo_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    combo_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_combo (combo_id),
    INDEX idx_product (product_id),
    FOREIGN KEY (combo_id) REFERENCES combo_products(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: settings (Настройки)
-- =============================================================================
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    `key` VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ПРИМЕРЫ ДАННЫХ ДЛЯ ПРОВЕРКИ
-- =============================================================================
-- INSERT INTO categories (name, sort_order) VALUES ('Пицца', 1), ('Напитки', 2);
-- INSERT INTO products (name, price, category_id) VALUES ('Пепперони', 500, 1);

-- =============================================================================
-- ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ
-- =============================================================================
-- SHOW TABLES;
