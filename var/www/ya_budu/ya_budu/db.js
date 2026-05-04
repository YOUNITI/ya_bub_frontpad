/**
 * Унифицированный модуль работы с базой данных
 * Поддерживает SQLite и MySQL
 * 
 * Конфигурация через .env:
 * DB_TYPE=sqlite|mysql (по умолчанию sqlite)
 * DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (для MySQL)
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let pool = null;
let dbType = 'sqlite'; // 'sqlite' или 'mysql'

// MySQL конфигурация
const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yabudu_main',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

/**
 * Инициализация базы данных
 */
export async function initDb() {
    dbType = process.env.DB_TYPE || 'sqlite';
    console.log(`[DB] Инициализация базы данных (${dbType})...`);

    if (dbType === 'mysql') {
        return await initMySQL();
    } else {
        return await initSQLite();
    }
}

/**
 * Инициализация SQLite
 */
async function initSQLite() {
    db = await open({
        filename: './yabudu.db',
        driver: sqlite3.Database,
    });
    
    console.log('[DB] SQLite подключен');
    
    // Создание таблиц (из server.js)
    await createTables();
    
    return db;
}

/**
 * Инициализация MySQL
 */
async function initMySQL() {
    try {
        pool = mysql.createPool(mysqlConfig);
        
        // Проверка подключения
        const conn = await pool.getConnection();
        console.log('[DB] MySQL подключен:', mysqlConfig.database);
        conn.release();
        
        // Создание таблиц
        await createMySQLTables();
        
        return pool;
    } catch (err) {
        console.error('[DB] Ошибка подключения к MySQL:', err.message);
        console.log('[DB] Переключаемся на SQLite...');
        dbType = 'sqlite';
        return await initSQLite();
    }
}

/**
 * Создание таблиц в SQLite
 */
async function createTables() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_url TEXT,
            category_id INTEGER,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            address TEXT,
            comment TEXT,
            total_orders INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            customer_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            guest_name TEXT,
            guest_phone TEXT,
            guest_email TEXT,
            order_type TEXT DEFAULT 'delivery',
            address TEXT,
            street TEXT,
            building TEXT,
            apartment TEXT,
            entrance TEXT,
            floor TEXT,
            intercom TEXT,
            is_asap INTEGER DEFAULT 1,
            delivery_date TEXT,
            delivery_time TEXT,
            custom_time TEXT,
            payment TEXT DEFAULT 'cash',
            comment TEXT,
            items TEXT NOT NULL,
            total_amount REAL DEFAULT 0,
            zone_id INTEGER,
            delivery_price INTEGER DEFAULT 0,
            zone_name TEXT,
            status TEXT DEFAULT 'pending',
            ready_time TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER,
            content TEXT,
            image_url TEXT,
            cart_data TEXT,
            cart_total REAL DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            read INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES customers(id)
        );

        CREATE TABLE IF NOT EXISTS sizes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price_modifier REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS addons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS size_addons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            size_id INTEGER NOT NULL,
            addon_id INTEGER NOT NULL,
            is_required INTEGER DEFAULT 0,
            price_modifier REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE CASCADE,
            FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS discounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'percent',
            value REAL NOT NULL,
            min_order_amount REAL DEFAULT 0,
            max_discount_amount REAL,
            code TEXT UNIQUE,
            is_active INTEGER DEFAULT 1,
            valid_from TEXT,
            valid_to TEXT,
            usage_limit INTEGER,
            usage_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS delivery_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pickup_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            schedule TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Миграция: добавить колонку location_id в таблицу orders
    try {
      await get("SELECT location_id FROM orders LIMIT 1");
    } catch (err) {
      console.log('[DB] Добавление колонки location_id в таблицу orders...');
      await run('ALTER TABLE orders ADD COLUMN location_id INTEGER');
      console.log('[DB] Колонка location_id добавлена в таблицу orders');
    }

    console.log('[DB] Таблицы SQLite созданы');
}

/**
 * Создание таблиц в MySQL
 */
async function createMySQLTables() {
    const tables = `
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            slug VARCHAR(255) NOT NULL UNIQUE,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            image_url VARCHAR(500),
            category_id INT,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_category (category_id),
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(50) UNIQUE,
            address TEXT,
            comment TEXT,
            total_orders INT DEFAULT 0,
            total_spent DECIMAL(10, 2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            customer_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS orders (
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
            zone_id INT NULL,
            delivery_price INT DEFAULT 0,
            zone_name VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'pending',
            ready_time VARCHAR(10),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_customer (customer_id),
            INDEX idx_status (status),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS messages (
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
            FOREIGN KEY (sender_id) REFERENCES customers(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS sizes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            price_modifier DECIMAL(10, 2) DEFAULT 0,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_product (product_id),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS addons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) DEFAULT 0,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_product (product_id),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS size_addons (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS discounts (
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS settings (
            \`key\` VARCHAR(255) PRIMARY KEY,
            value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS pickup_points (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address TEXT NOT NULL,
            schedule TEXT,
            is_active INT DEFAULT 1,
            sort_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    // Миграция: добавить колонку location_id в таблицу orders
    try {
      await pool.query("SELECT location_id FROM orders LIMIT 1");
    } catch (err) {
      console.log('[DB] Добавление колонки location_id в таблицу orders MySQL...');
      await pool.query('ALTER TABLE orders ADD COLUMN location_id INT NULL');
      console.log('[DB] Колонка location_id добавлена в таблицу orders MySQL');
    }

    console.log('[DB] Таблицы MySQL созданы');
}

/**
 * Унифицированные методы для работы с БД
 */

// Получить все записи
export async function all(sql, params = []) {
    if (dbType === 'mysql') {
        const [rows] = await pool.query(sql, params);
        return rows;
    } else {
        return await db.all(sql, params);
    }
}

// Получить одну запись
export async function get(sql, params = []) {
    if (dbType === 'mysql') {
        const [rows] = await pool.query(sql, params);
        return rows[0] || null;
    } else {
        return await db.get(sql, params);
    }
}

// Выполнить запрос (INSERT, UPDATE, DELETE)
export async function run(sql, params = []) {
    if (dbType === 'mysql') {
        const [result] = await pool.query(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
    } else {
        return await db.run(sql, params);
    }
}

// Выполнить произвольный запрос (для сложных случаев)
export async function query(sql, params = []) {
    if (dbType === 'mysql') {
        return await pool.query(sql, params);
    } else {
        return await db.all(sql, params);
    }
}

// Получить объект БД для миграций
export function getDb() {
    return db;
}

// Получить пул MySQL
export function getPool() {
    return pool;
}

// Закрыть соединение
export async function close() {
    if (pool) {
        await pool.end();
        console.log('[DB] MySQL пул закрыт');
    }
    if (db) {
        await db.close();
        console.log('[DB] SQLite соединение закрыто');
    }
}
