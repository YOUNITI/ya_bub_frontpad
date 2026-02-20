-- Миграция базы данных Main Site с SQLite на MySQL
-- База данных: yabudu_main

-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS yabudu_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yabudu_main;

-- =============================================================================
-- ТАБЛИЦА: categories (Категории)
-- =============================================================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
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
    image_url VARCHAR(500),
    category_id INT,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_name (name),
    INDEX idx_sort_order (sort_order),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: customers (Клиенты)
-- =============================================================================
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50) UNIQUE,
    address TEXT,
    comment TEXT,
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: users (Пользователи для аутентификации)
-- =============================================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    customer_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_customer (customer_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: orders (Заказы)
-- =============================================================================
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT,
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
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_customer (customer_id),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_created_at (created_at),
    INDEX idx_guest_phone (guest_phone),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: messages (Сообщения чата)
-- =============================================================================
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    content TEXT,
    image_url VARCHAR(500),
    cart_data TEXT,
    cart_total DECIMAL(10, 2) DEFAULT 0,
    is_admin INT DEFAULT 0,
    read INT DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sender (sender_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_is_admin (is_admin),
    INDEX idx_read (read),
    FOREIGN KEY (sender_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: sizes (Размеры товаров)
-- =============================================================================
DROP TABLE IF EXISTS sizes;
CREATE TABLE sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_sort_order (sort_order),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: addons (Дополнительные ингредиенты)
-- =============================================================================
DROP TABLE IF EXISTS addons;
CREATE TABLE addons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product_id),
    INDEX idx_sort_order (sort_order),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: size_addons (Допы для конкретных размеров)
-- =============================================================================
DROP TABLE IF EXISTS size_addons;
CREATE TABLE size_addons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    size_id INT NOT NULL,
    addon_id INT NOT NULL,
    is_required INT DEFAULT 0,
    price_modifier DECIMAL(10, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_size (size_id),
    INDEX idx_addon (addon_id),
    FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ТАБЛИЦА: discounts (Скидки)
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
-- INSERT INTO categories (name, slug, sort_order) VALUES ('Пицца', 'pizza', 1), ('Бургеры', 'burgers', 2);
-- INSERT INTO products (name, description, price, category_id) VALUES ('Пепперони', 'Вкусная пицца', 500, 1);

-- =============================================================================
-- ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ
-- =============================================================================
-- SHOW TABLES;
