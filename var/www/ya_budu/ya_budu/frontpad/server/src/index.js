import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Определяем __dirname ДО импорта db.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env ПЕРЕД импортом db.js
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../frontpad/server/.env'), override: true });

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import multer from 'multer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import serveStatic from 'serve-static';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Импорт унифицированного модуля базы данных (после загрузки .env!)
import { initDb, all, get, run, exec, close, getDbType } from './db.js';
import { generateReceiptHTML, printReceiptSync, PRINTER_CONFIG, getReceiptSettings } from './receipt.js';

// Импорт конфигурации
import { 
  JWT_SECRET, 
  SITE_URL, 
  SITE_SYNC_TOKEN, 
  FRONTPAD_PORT,
  SYNC_ENABLED
} from '../../../config.js';

// __dirname уже определён в начале файла

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = FRONTPAD_PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Статика для загруженных изображений - используем абсолютный путь
const uploadsPath = path.resolve(__dirname, '../uploads');
console.log('[Static] Путь к uploads:', uploadsPath);
app.use('/uploads', serveStatic(uploadsPath));

// Статика для React build - используем абсолютный путь
const staticPath = path.resolve(__dirname, '../../static');
console.log('[Static] Путь к статике:', staticPath);
app.use('/', serveStatic(staticPath));

// Инициализация базы данных
const initializeDb = async () => {
  await initDb();
  console.log('Frontpad база данных инициализирована');
  
  // Миграция - добавить колонки для скидки если их нет
  try {
    const dbType = getDbType();
    
    if (dbType === 'sqlite') {
      // Миграция: добавить колонку is_featured если её нет
      try {
        const productsTableInfo = await all("PRAGMA table_info(products)");
        const hasIsFeatured = productsTableInfo.find(col => col.name === 'is_featured');
        
        if (!hasIsFeatured) {
          await run('ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0');
          console.log('Колонка is_featured добавлена в таблицу products (SQLite)');
        }
      } catch (e) {
        console.log('Миграция is_featured не требуется (SQLite):', e.message);
      }
      
      // Для SQLite проверяем через PRAGMA
      const tableInfo = await all("PRAGMA table_info(orders)");
      const hasDiscountAmount = tableInfo.find(col => col.name === 'discount_amount');
      const hasDiscountReason = tableInfo.find(col => col.name === 'discount_reason');
      const hasReadyTime = tableInfo.find(col => col.name === 'ready_time');
      
      if (!hasDiscountAmount) {
        await run('ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0');
        console.log('Колонка discount_amount добавлена в таблицу orders');
      }
      if (!hasDiscountReason) {
        await run('ALTER TABLE orders ADD COLUMN discount_reason TEXT');
        console.log('Колонка discount_reason добавлена в таблицу orders');
      }
      if (!hasReadyTime) {
        await run('ALTER TABLE orders ADD COLUMN ready_time TEXT');
        console.log('Колонка ready_time добавлена в таблицу orders');
      }
      
      // Миграция: добавить таблицу couriers для SQLite
      try {
        const couriersTableExists = tableInfo.find(col => col.name === 'courier_id');
        if (!couriersTableExists) {
          await run('ALTER TABLE orders ADD COLUMN courier_id INTEGER DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN courier_name TEXT');
          await run('ALTER TABLE orders ADD COLUMN assigned_at TEXT');
          await run('ALTER TABLE orders ADD COLUMN delivery_started_at TEXT');
          await run('ALTER TABLE orders ADD COLUMN delivered_at TEXT');
          await run('ALTER TABLE orders ADD COLUMN courier_comment TEXT');
          console.log('Колонки для курьера добавлены в таблицу orders (SQLite)');
        }
      } catch (e) {
        console.log('Миграция couriers не требуется (SQLite):', e.message);
      }
    } else if (dbType === 'mysql') {
      // Для MySQL используем информационную схему
      try {
        await get("SELECT discount_amount FROM orders LIMIT 1");
      } catch (e) {
        // Колонки нет, добавляем
        try {
          await run('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0');
          console.log('Колонка discount_amount добавлена в таблицу orders (MySQL)');
        } catch (err) {}
      }
      try {
        await get("SELECT discount_reason FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN discount_reason TEXT');
          console.log('Колонка discount_reason добавлена в таблицу orders (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку price в таблицу sizes
      try {
        await get("SELECT price FROM sizes LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE sizes ADD COLUMN price DECIMAL(10,2) DEFAULT 0');
          console.log('Колонка price добавлена в таблицу sizes (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку is_featured для MySQL
      try {
        await get("SELECT is_featured FROM products LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE products ADD COLUMN is_featured INT DEFAULT 0');
          console.log('Колонка is_featured добавлена в таблицу products (MySQL)');
        } catch (err) {}
      }

      // Миграция: добавить колонку location_id в таблицу orders
      try {
        await get("SELECT location_id FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN location_id INTEGER');
          console.log('Колонка location_id добавлена в таблицу orders');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку is_combo и combo_items в таблицу products
      try {
        await get("SELECT is_combo FROM products LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE products ADD COLUMN is_combo INT DEFAULT 0');
          await run('ALTER TABLE products ADD COLUMN combo_items TEXT');
          console.log('Колонки is_combo и combo_items добавлены в таблицу products (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку ready_time в таблицу orders
      try {
        await get("SELECT ready_time FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN ready_time VARCHAR(10)');
          console.log('Колонка ready_time добавлена в таблицу orders (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку customer_id в таблицу orders
      try {
        await get("SELECT customer_id FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN customer_id INT');
          console.log('Колонка customer_id добавлена в таблицу orders (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить колонку email в таблицу users
      try {
        await get("SELECT email FROM users LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
          console.log('Колонка email добавлена в таблицу users (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить таблицу couriers
      try {
        await get("SELECT id FROM couriers LIMIT 1");
      } catch (e) {
        try {
          await run(`CREATE TABLE IF NOT EXISTS couriers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            login VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            is_active INT DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
          console.log('Таблица couriers создана (MySQL)');
        } catch (err) {
          console.log('Ошибка создания таблицы couriers:', err.message);
        }
      }
      
      // Миграция: добавить колонку login в таблицу couriers (если её нет)
      try {
        await get("SELECT login FROM couriers LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE couriers ADD COLUMN login VARCHAR(50) UNIQUE');
          console.log('Колонка login добавлена в таблицу couriers (MySQL)');
        } catch (err) {
          console.log('Миграция login для couriers не требуется:', err.message);
        }
      }
      
      // Миграция: добавить поля для курьера в таблицу orders
      try {
        await get("SELECT courier_id FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN courier_id INT DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN courier_name VARCHAR(255) DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN assigned_at DATETIME DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN delivery_started_at DATETIME DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN delivered_at DATETIME DEFAULT NULL');
          await run('ALTER TABLE orders ADD COLUMN courier_comment TEXT DEFAULT NULL');
          console.log('Колонки для курьера добавлены в таблицу orders (MySQL)');
        } catch (err) {
          console.log('Ошибка добавления колонок для курьера:', err.message);
        }
      }
      
      // Миграция: добавить роль в таблицу users
      try {
        await get("SELECT role FROM users LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT "admin"');
          console.log('Колонка role добавлена в таблицу users (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить point_id в таблицу users
      try {
        await get("SELECT point_id FROM users LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE users ADD COLUMN point_id INT DEFAULT 1');
          console.log('Колонка point_id добавлена в таблицу users (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: создать таблицу points
      try {
        await get("SELECT id FROM points LIMIT 1");
      } catch (e) {
        try {
          await run(`CREATE TABLE IF NOT EXISTS points (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address VARCHAR(500),
            phone VARCHAR(50),
            is_active INT DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
          console.log('Таблица points создана (MySQL)');
          
          // Создаем точки по умолчанию
          await run('INSERT INTO points (id, name, address, is_active) VALUES (1, "Точка 1 (Основная)", "ул. Примерная, 1", 1) ON DUPLICATE KEY UPDATE name = VALUES(name)');
          await run('INSERT INTO points (id, name, address, is_active) VALUES (2, "Точка 2", "ул. Примерная, 2", 1) ON DUPLICATE KEY UPDATE name = VALUES(name)');
          console.log('Точки по умолчанию созданы');
        } catch (err) {
          console.log('Ошибка создания таблицы points:', err.message);
        }
      }
      
      // Миграция: добавить point_id в таблицу orders
      try {
        await get("SELECT point_id FROM orders LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE orders ADD COLUMN point_id INT DEFAULT 1');
          console.log('Колонка point_id добавлена в таблицу orders (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить point_id в таблицу delivery_zones
      try {
        await get("SELECT point_id FROM delivery_zones LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE delivery_zones ADD COLUMN point_id INT DEFAULT 1');
          console.log('Колонка point_id добавлена в таблицу delivery_zones (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: добавить point_id в таблицу couriers
      try {
        await get("SELECT point_id FROM couriers LIMIT 1");
      } catch (e) {
        try {
          await run('ALTER TABLE couriers ADD COLUMN point_id INT DEFAULT 1');
          console.log('Колонка point_id добавлена в таблицу couriers (MySQL)');
        } catch (err) {}
      }
      
      // Миграция: сделать order_number nullable
      try {
        await run('ALTER TABLE orders MODIFY order_number VARCHAR(100) NULL');
        console.log('Колонка order_number изменена на NULL (MySQL)');
      } catch (err) {
        console.log('Миграция order_number не требуется:', err.message);
      }
    }
  } catch (e) {
    console.log('Миграция скидок не требуется:', e.message);
  }
  
  // Создаем таблицы если они не существуют
  const dbType = getDbType();
  
  // Создаем таблицы для обеих баз данных
  if (dbType === 'sqlite') {
    await exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
      );
      
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT,
        customer_phone TEXT,
        last_message TEXT,
        last_message_at TEXT,
        unread_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        message TEXT,
        sender TEXT,
        sender_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL DEFAULT 0,
        image_url TEXT,
        category_id INTEGER,
        is_active INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        is_combo INTEGER DEFAULT 0,
        combo_items TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_order_id INTEGER,
        order_number TEXT,
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
        items TEXT,
        total_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        discount_reason TEXT,
        ready_time TEXT,
        status TEXT DEFAULT 'новый',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS addon_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        default_price REAL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        unit TEXT DEFAULT 'шт',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT DEFAULT 'шт',
        current_quantity REAL DEFAULT 0,
        min_quantity REAL DEFAULT 0,
        cost_per_unit REAL DEFAULT 0,
        supplier TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT DEFAULT 'шт',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      );
      
      CREATE TABLE IF NOT EXISTS discounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'percent',
        value REAL DEFAULT 0,
        min_order_amount REAL DEFAULT 0,
        max_discount_amount REAL,
        code TEXT,
        valid_from TEXT,
        valid_to TEXT,
        usage_limit INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        min_order_amount INTEGER DEFAULT 0,
        delivery_price INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        size_value TEXT,
        price REAL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      
      CREATE TABLE IF NOT EXISTS product_discounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'percent',
        value REAL DEFAULT 0,
        valid_from TEXT,
        valid_to TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      
      CREATE TABLE IF NOT EXISTS product_addons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        addon_template_id INTEGER NOT NULL,
        custom_price REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id)
      );
      
      CREATE TABLE IF NOT EXISTS size_addons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        size_id INTEGER NOT NULL,
        addon_id INTEGER NOT NULL,
        is_required INTEGER DEFAULT 0,
        price_modifier REAL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (size_id) REFERENCES sizes(id),
        FOREIGN KEY (addon_id) REFERENCES addon_templates(id)
      );
    `);
    
    // Создаем первого пользователя admin/admin если его нет
    try {
      const existingUser = await get('SELECT * FROM users WHERE username = ?', ['admin']);
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await run('INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)', 
          ['admin', hashedPassword, 'admin', 'admin@yabudu.local']);
        console.log('Создан пользователь admin/admin');
      }
    } catch (e) {
      console.log('Пользователь уже существует или ошибка:', e.message);
    }
    
    // Создаем тестовые районы доставки если таблица пуста
    try {
      const zonesCount = await get('SELECT COUNT(*) as count FROM delivery_zones');
      if (!zonesCount || zonesCount.count === 0) {
        await run(`INSERT INTO delivery_zones (name, min_order_amount, delivery_price, is_active, sort_order) VALUES 
          ('Центральный район', 1000, 150, 1, 1),
          ('Северный район', 1200, 200, 1, 2),
          ('Южный район', 1000, 150, 1, 3),
          ('Восточный район', 1500, 250, 1, 4),
          ('Западный район', 1000, 150, 1, 5)`);
        console.log('Созданы тестовые районы доставки');
      }
    } catch (e) {
      console.log('Районы уже существуют или ошибка:', e.message);
    }
    
    console.log('Все таблицы готовы (SQLite)');
  } else if (dbType === 'mysql') {
    // Для MySQL создаем таблицы отдельно
    await exec(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        last_message TEXT,
        last_message_at DATETIME,
        unread_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chat_id INT,
        message TEXT,
        sender VARCHAR(50),
        sender_name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        email VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        image_url TEXT,
        category_id INT,
        is_active INT DEFAULT 1,
        is_featured INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_order_id INT,
        order_number VARCHAR(100),
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
        custom_time VARCHAR(50),
        payment VARCHAR(50) DEFAULT 'cash',
        comment TEXT,
        items TEXT,
        total_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        discount_reason TEXT,
        ready_time VARCHAR(10),
        status VARCHAR(50) DEFAULT 'новый',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS addon_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        default_price DECIMAL(10,2) DEFAULT 0,
        sort_order INT DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'шт',
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) DEFAULT 'шт',
        current_quantity DECIMAL(10,2) DEFAULT 0,
        min_quantity DECIMAL(10,2) DEFAULT 0,
        cost_per_unit DECIMAL(10,2) DEFAULT 0,
        supplier VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'шт',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'percent',
        value DECIMAL(10,2) DEFAULT 0,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        max_discount_amount DECIMAL(10,2),
        code VARCHAR(100),
        valid_from DATE,
        valid_to DATE,
        usage_limit INT,
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        min_order_amount INT DEFAULT 0,
        delivery_price INT DEFAULT 0,
        is_active INT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS sizes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        size_value VARCHAR(50),
        price DECIMAL(10,2) DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS product_discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'percent',
        value DECIMAL(10,2) DEFAULT 0,
        valid_from DATE,
        valid_to DATE,
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS product_addons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        addon_template_id INT NOT NULL,
        custom_price DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      
      CREATE TABLE IF NOT EXISTS size_addons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        size_id INT NOT NULL,
        addon_id INT NOT NULL,
        is_required INT DEFAULT 0,
        price_modifier REAL DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (size_id) REFERENCES sizes(id),
        FOREIGN KEY (addon_id) REFERENCES addon_templates(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Создаем первого пользователя admin/admin если его нет
    try {
      const existingUser = await get('SELECT * FROM users WHERE username = ?', ['admin']);
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('admin', 10);
        await run('INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)', 
          ['admin', hashedPassword, 'admin', 'admin@yabudu.local']);
        console.log('Создан пользователь admin/admin');
      }
    } catch (e) {
      console.log('Пользователь уже существует или ошибка:', e.message);
    }
    
    console.log('Все таблицы готовы (MySQL)');
  }
};

initializeDb();

// WebSocket соединения
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('Frontpad клиент подключен');
  
  // Извлекаем токен из параметров запроса
  const token = req.url?.split('token=')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.pointId = decoded.point_id;
      ws.userId = decoded.id;
      ws.role = decoded.role;
      console.log(`Клиент авторизован: user_id=${ws.userId}, point_id=${ws.pointId}, role=${ws.role}`);
    } catch (e) {
      console.log('Клиент подключен без валидного токена');
    }
  }
  
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Рассылка уведомлений с фильтрацией по точкам
const broadcast = (data) => {
  try {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      try {
        if (client.readyState !== 1) return;
        
        // Для новых заказов - фильтруем по точке
        if (data.type === 'new_order' && data.order) {
          // Администратор получает все
          if (client.role === 'admin' || client.pointId === 0 || client.pointId === null) {
            client.send(message);
            return;
          }
          
          // Если заказ привязан к точке - отправляем только этой точке
          if (data.order.point_id && client.pointId === data.order.point_id) {
            client.send(message);
            return;
          }
          
          // Если заказ не привязан ни к какой точке - отправляем всем
          if (!data.order.point_id) {
            client.send(message);
            return;
          }
        } else {
          // Все остальные уведомления отправляем всем
          client.send(message);
        }
      } catch (e) {
        console.error('Error sending to client:', e.message);
      }
    });
  } catch (e) {
    console.error('Error in broadcast:', e.message);
  }
};

// Генерация номера заказа для Frontpad
const generateOrderNumber = () => {
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FP-${date}-${random}`;
};

// Универсальная функция парсинга items - защита от повторного парсинга (MySQL драйвер может уже распарсить JSON)
const parseOrderItems = (items) => {
  if (!items) return [];
  if (typeof items === 'object' && Array.isArray(items)) return items; // Уже массив
  if (typeof items === 'object') return items; // Уже объект
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch (e) { return []; }
  }
  return [];
};

// ============ FILE UPLOAD ============

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Изображение не предоставлено' });
    }
    
    const { product_id } = req.body;
    const buffer = req.file.buffer;
    const imageType = req.file.mimetype.split('/')[1];
    
    // Создаем директорию для изображений если не существует
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const ext = imageType === 'jpeg' ? 'jpg' : imageType;
    const filename = `product_${product_id || 'new'}_${timestamp}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    
    // Сохраняем файл
    await writeFile(filepath, buffer);
    
    // Возвращаем URL изображения
    const imageUrl = `/uploads/products/${filename}`;
    
    res.json({ url: imageUrl, filename: `/uploads/products/${filename}` });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: err.message });
  }
});

// API Routes для Frontpad

// ============ AUTH ============

// Получить всех пользователей (с point_id)
app.get('/api/users', async (req, res) => {
  try {
    const users = await all('SELECT id, username, role, point_id, email, created_at FROM users ORDER BY username');
    res.json(users || []);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.json([]);
  }
});

// Обновить point_id пользователя
app.put('/api/users/:id/point', async (req, res) => {
  const { id } = req.params;
  const { point_id } = req.body;
  
  if (point_id === undefined) {
    return res.status(400).json({ error: 'point_id обязателен' });
  }
  
  try {
    await run('UPDATE users SET point_id = ? WHERE id = ?', [point_id, id]);
    const user = await get('SELECT id, username, role, point_id FROM users WHERE id = ?', [id]);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error updating user point_id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { username, password, point_id } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username и password обязательны' });
  }
  
  try {
    // Проверяем существует ли пользователь
    const existingUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя с point_id (по умолчанию 1)
    const userPointId = point_id || 1;
    
    const result = await run(
      'INSERT INTO users (username, password, role, point_id) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, 'admin', userPointId]
    );
    
    // Генерируем токен
    const token = jwt.sign(
      { id: result.lastID, username, role: 'admin', point_id: userPointId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token, user: { id: result.lastID, username, role: 'admin', point_id: userPointId } });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: err.message });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username и password обязательны' });
  }
  
  try {
    // Ищем пользователя
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    // Получаем point_id пользователя (по умолчанию 1)
    const pointId = user.point_id || 1;
    
    // Генерируем токен с point_id
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, point_id: pointId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, point_id: pointId } });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: err.message });
  }
});

// Проверка токена
app.get('/api/auth/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

// ============ COURiERS API ============

// Регистрация курьера (только для админов)
app.post('/api/couriers', async (req, res) => {
  const { name, login, password, can_take_orders } = req.body;
  
  if (!name || !login || !password) {
    return res.status(400).json({ error: 'Имя, логин и пароль обязательны' });
  }
  
  try {
    // Проверяем существует ли логин
    const existingCourier = await get('SELECT * FROM couriers WHERE login = ?', [login]);
    if (existingCourier) {
      return res.status(400).json({ error: 'Курьер с таким логином уже существует' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // is_active = 1 если can_take_orders = true, иначе 0
    const isActive = can_take_orders !== false ? 1 : 0;
    
    // Создаем курьера с point_id
    const pointId = req.body.point_id || 1;
    const result = await run(
      'INSERT INTO couriers (name, login, password_hash, is_active, point_id) VALUES (?, ?, ?, ?, ?)',
      [name, login, hashedPassword, isActive, pointId]
    );
    
    res.json({ success: true, id: result.lastID, name, login, is_active: isActive });
  } catch (err) {
    console.error('Ошибка регистрации курьера:', err);
    res.status(500).json({ error: err.message });
  }
});

// Вход курьера
app.post('/api/couriers/login', async (req, res) => {
  const { login, password } = req.body;
  
  if (!login || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }
  
  try {
    // Ищем курьера по логину
    const courier = await get('SELECT * FROM couriers WHERE login = ?', [login]);
    if (!courier) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    if (!courier.is_active) {
      return res.status(401).json({ error: 'Доступ курьера заблокирован. Обратитесь к администратору.' });
    }
    
    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, courier.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    
    // Генерируем токен с point_id
    const token = jwt.sign(
      { id: courier.id, name: courier.name, login: courier.login, role: 'courier', can_take_orders: courier.is_active, point_id: courier.point_id || 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token, courier: { id: courier.id, name: courier.name, login: courier.login, point_id: courier.point_id || 1 } });
  } catch (err) {
    console.error('Ошибка входа курьера:', err);
    res.status(500).json({ error: err.message });
  }
});

// Получить список курьеров (только для админов)
app.get('/api/couriers', async (req, res) => {
  try {
    const { point_id } = req.query;
    let query = 'SELECT id, name, login, is_active, point_id, created_at FROM couriers';
    const params = [];
    
    if (point_id && point_id !== '0') {
      query += ' WHERE point_id = ?';
      params.push(parseInt(point_id));
    }
    
    query += ' ORDER BY name';
    const couriers = await all(query, params);
    res.json(couriers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить курьера (только для админов)
app.delete('/api/couriers/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Проверяем существует ли курьер
    const courier = await get('SELECT * FROM couriers WHERE id = ?', [id]);
    if (!courier) {
      return res.status(404).json({ error: 'Курьер не найден' });
    }
    
    await run('DELETE FROM couriers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Курьер удалён' });
  } catch (err) {
    console.error('Ошибка удаления курьера:', err);
    res.status(500).json({ error: err.message });
  }
});

// Переключить активность курьера (только для админов)
app.put('/api/couriers/:id/toggle-active', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  
  try {
    // Проверяем существует ли курьер
    const courier = await get('SELECT * FROM couriers WHERE id = ?', [id]);
    if (!courier) {
      return res.status(404).json({ error: 'Курьер не найден' });
    }
    
    const newStatus = is_active === 1 ? 1 : 0;
    await run('UPDATE couriers SET is_active = ? WHERE id = ?', [newStatus, id]);
    
    res.json({ success: true, id, is_active: newStatus });
  } catch (err) {
    console.error('Ошибка переключения активности курьера:', err);
    res.status(500).json({ error: err.message });
  }
});

// Изменить пароль курьера (только для админов)
app.put('/api/couriers/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) return res.status(400).json({ error: 'Пароль обязателен' });
    
    const courier = await get('SELECT * FROM couriers WHERE id = ?', [id]);
    if (!courier) return res.status(404).json({ error: 'Курьер не найден' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await run('UPDATE couriers SET password_hash = ? WHERE id = ?', [hashedPassword, id]);
    
    res.json({ success: true, message: 'Пароль изменен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить point_id курьера
app.put('/api/couriers/:id/point', async (req, res) => {
  try {
    const { id } = req.params;
    const { point_id } = req.body;
    
    if (point_id === undefined) {
      return res.status(400).json({ error: 'point_id обязателен' });
    }
    
    await run('UPDATE couriers SET point_id = ? WHERE id = ?', [point_id, id]);
    const courier = await get('SELECT id, name, login, point_id FROM couriers WHERE id = ?', [id]);
    
    res.json(courier);
  } catch (err) {
    console.error('Error updating courier point_id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получить заказы для конкретного курьера
app.get('/api/couriers/orders', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'courier') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const { status } = req.query;
    let query = 'SELECT * FROM orders WHERE courier_id = ?';
    const params = [decoded.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const orders = await all(query, params);
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Назначить заказ на курьера
app.put('/api/orders/:id/assign-courier', async (req, res) => {
  const { id } = req.params;
  const { courier_id, courier_name } = req.body;
  
  const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  
  try {
    await run(
      'UPDATE orders SET courier_id = ?, courier_name = ?, assigned_at = ? WHERE id = ?',
      [courier_id, courier_name, moscowTime, id]
    );
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    // Уведомляем курьера через WebSocket
    broadcast({ type: 'courier_assigned', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Курьер начал доставку
app.put('/api/orders/:id/start-delivery', async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'courier') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    
    await run(
      'UPDATE orders SET delivery_started_at = ?, status = ? WHERE id = ? AND courier_id = ?',
      [moscowTime, 'в доставке', id, decoded.id]
    );
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    broadcast({ type: 'order_updated', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Курьер отметил доставку
app.put('/api/orders/:id/delivered', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'courier') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    
    await run(
      'UPDATE orders SET delivered_at = ?, status = ?, courier_comment = ? WHERE id = ? AND courier_id = ?',
      [moscowTime, 'доставлен', comment || null, id, decoded.id]
    );
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    broadcast({ type: 'order_delivered', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Отмена назначения курьера (только админ)
app.put('/api/orders/:id/unassign-courier', async (req, res) => {
  const { id } = req.params;
  
  try {
    await run(
      'UPDATE orders SET courier_id = NULL, courier_name = NULL, assigned_at = NULL, delivery_started_at = NULL WHERE id = ?',
      [id]
    );
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    broadcast({ type: 'order_updated', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Категории
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    const category = await get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    broadcast({ type: 'category_created', category });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление порядка категорий (ДО :id чтобы Express не matching'ил reorder как id)
app.put('/api/categories/reorder', async (req, res) => {
  const { categories } = req.body;
  try {
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories is required and must be an array' });
    }
    console.log('[/api/categories/reorder] Обновление порядка категорий:', categories.length);
    for (const cat of categories) {
      await run('UPDATE categories SET sort_order = ? WHERE id = ?', [cat.sort_order, cat.id]);
    }
    const updatedCategories = await all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    console.log('[/api/categories/reorder] Отправка broadcast categories_reordered');
    broadcast({ type: 'categories_reordered', categories: updatedCategories });
    
    // Синхронизируем порядок с основным сайтом (без await - не блокирует)
    syncOrderToSite('/api/site/categories/reorder', { categories });
    
    res.json({ success: true, categories: updatedCategories });
  } catch (err) {
    console.error('Ошибка обновления порядка категорий:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    await run('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    const category = await get('SELECT * FROM categories WHERE id = ?', [id]);
    broadcast({ type: 'category_updated', category });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM categories WHERE id = ?', [id]);
    broadcast({ type: 'category_deleted', id });
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Товары
app.get('/api/products/featured', async (req, res) => {
  try {
    // Получаем только избранные товары (максимум 3)
    const products = await all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_featured = 1 AND p.is_active = 1 ORDER BY p.sort_order ASC LIMIT 3`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order ASC, p.created_at DESC`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SORT ORDER ENDPOINTS ============

// Токен синхронизации с сайтом - импортируется из config.js
const SYNC_TOKEN = SITE_SYNC_TOKEN;

// Функция синхронизации порядка с основным сайтом (без await - не блокирует основной запрос)
function syncOrderToSite(endpoint, data) {
  // Если синхронизация отключена - пропускаем
  if (!SYNC_ENABLED) {
    console.log(`[Sync] Синхронизация отключена (SYNC_ENABLED=false)`);
    return;
  }
  
  console.log(`[Sync] Начало синхронизации ${endpoint}, SITE_URL=${SITE_URL}, NODE_ENV=${process.env.NODE_ENV}`);
  
  // Если SITE_URL не настроен - пропускаем
  if (!SITE_URL) {
    console.log(`[Sync] Пропущена синхронизация ${endpoint} (SITE_URL не настроен)`);
    return;
  }
  
  // В production режиме проверяем что URL не localhost
  if (process.env.NODE_ENV === 'production' && SITE_URL.includes('localhost')) {
    console.log(`[Sync] Пропущена синхронизация ${endpoint} (localhost запрещён в production)`);
    return;
  }
  
  console.log(`[Sync] Выполняем fetch к ${SITE_URL}${endpoint}`);
  
  fetch(`${SITE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': SYNC_TOKEN
    },
    body: JSON.stringify(data)
  })
    .then(res => {
      console.log(`[Sync] Ответ от ${endpoint}: статус=${res.status}`);
      if (!res.ok) {
        console.error(`[Sync] Ошибка синхронизации ${endpoint}: статус=${res.status}`);
      }
    })
    .then(() => console.log(`Синхронизация ${endpoint} с сайтом выполнена`))
    .catch(err => console.error(`Ошибка синхронизации ${endpoint}:`, err.message));
}

// Обновление порядка товаров
app.put('/api/products/reorder', async (req, res) => {
  const { products } = req.body;
  try {
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'products is required and must be an array' });
    }
    console.log('[/api/products/reorder] Обновление порядка товаров:', products.length);
    for (const product of products) {
      await run('UPDATE products SET sort_order = ? WHERE id = ?', [product.sort_order, product.id]);
    }
    const updatedProducts = await all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order ASC, p.created_at DESC`);
    console.log('[/api/products/reorder] Отправка broadcast products_reordered');
    broadcast({ type: 'products_reordered', products: updatedProducts });
    
    // Синхронизируем порядок с основным сайтом (без await - не блокирует)
    syncOrderToSite('/api/site/products/reorder', { products });
    
    res.json({ success: true, products: updatedProducts });
  } catch (err) {
    console.error('Ошибка обновления порядка товаров:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, image_url, category_id, is_combo, combo_items } = req.body;
  
  // Логирование для отладки
  console.log('[/api/products POST] Получены данные:', { name, description, price, image_url, category_id, is_combo });
  console.log('[/api/products POST] req.body:', JSON.stringify(req.body));
  
  // Валидация обязательного поля name
  if (!name || (typeof name === 'string' && name.trim() === '')) {
    console.log('[/api/products POST] Ошибка: название товара пустое или не передано');
    return res.status(400).json({ error: 'Название товара обязательно' });
  }
  
  try {
    const comboItemsJson = combo_items ? JSON.stringify(combo_items) : '[]';
    console.log('[/api/products POST] Вставка в БД с name:', name.trim());
    const result = await run('INSERT INTO products (name, description, price, image_url, category_id, is_combo, combo_items) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [name.trim(), description || '', price || 0, image_url || '', category_id || null, is_combo || 0, comboItemsJson]);
    const product = await get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.lastID]);
    broadcast({ type: 'product_created', product });
    res.json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  console.log('[/api/products/:id] Обновление товара ID:', id);
  console.log('[/api/products/:id] Данные:', JSON.stringify(updates));
  console.log('[/api/products/:id] combo_items из запроса:', updates.combo_items);
  console.log('[/api/products/:id] is_combo из запроса:', updates.is_combo);
  
  try {
    // Получаем текущие данные товара
    const currentProduct = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!currentProduct) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    // Объединяем текущие данные с новыми (обновляем только переданные поля)
    // ПРИМЕЧАНИЕ: преобразуем boolean в integer для SQL
    const isComboValue = updates.is_combo !== undefined ? (updates.is_combo ? 1 : 0) : (currentProduct.is_combo || 0);
    const comboItemsValue = updates.combo_items !== undefined ? JSON.stringify(updates.combo_items) : (currentProduct.combo_items || '[]');
    
    const name = updates.name !== undefined ? updates.name : currentProduct.name;
    const description = updates.description !== undefined ? updates.description : currentProduct.description;
    const price = updates.price !== undefined ? updates.price : (currentProduct.price || 0);
    const image_url = updates.image_url !== undefined ? updates.image_url : currentProduct.image_url;
    const category_id = updates.category_id !== undefined ? updates.category_id : currentProduct.category_id;
    const is_active = updates.is_active !== undefined ? updates.is_active : currentProduct.is_active;
    
    // Обработка is_featured - ограничение максимум 3 товара
    let isFeaturedValue = currentProduct.is_featured || 0;
    if (updates.is_featured !== undefined) {
      const newIsFeatured = updates.is_featured ? 1 : 0;
      
      if (newIsFeatured === 1 && currentProduct.is_featured !== 1) {
        // Пытаемся включить is_featured - проверяем лимит
        const featuredCount = await get('SELECT COUNT(*) as count FROM products WHERE is_featured = 1');
        if (featuredCount.count >= 3) {
          return res.status(400).json({ 
            error: 'Нельзя добавить более 3 избранных товаров. Сначала уберите галочку с другого товара.' 
          });
        }
        isFeaturedValue = 1;
      } else if (newIsFeatured === 0) {
        // Выключаем is_featured
        isFeaturedValue = 0;
      }
    }
    
    console.log('[/api/products/:id] Подготовленные данные для сохранения:', { is_combo: isComboValue, combo_items: comboItemsValue, is_featured: isFeaturedValue });
    
    await run(
      'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?, is_active = ?, is_combo = ?, combo_items = ?, is_featured = ? WHERE id = ?',
      [name, description, price, image_url, category_id || null, is_active, isComboValue, comboItemsValue, isFeaturedValue, id]
    );
    
    const product = await get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [id]);
    // Парсим combo_items если это строка (для корректного ответа клиенту)
    if (product.combo_items && typeof product.combo_items === 'string') {
      try {
        product.combo_items = JSON.parse(product.combo_items);
      } catch (e) {
        product.combo_items = [];
      }
    }
    
    broadcast({ type: 'product_updated', product });
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM products WHERE id = ?', [id]);
    broadcast({ type: 'product_deleted', id });
    res.json({ message: 'Товар удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Заказы
app.get('/api/orders', async (req, res) => {
  const { status, date, point_id } = req.query;
  
  console.log('[/api/orders] Запрос получен - date:', date, 'status:', status, 'point_id:', point_id);
  
  try {
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];
    
    // Фильтр по точке (point_id)
    // Если point_id передан в запросе - используем его
    // Иначе пытаемся получить из токена
    let filterPointId = point_id;
    if (!filterPointId) {
      // Пробуем получить из токена
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET);
          filterPointId = decoded.point_id;
        } catch (e) {
          // Токен невалиден, не фильтруем
        }
      }
    }
    
    // Фильтруем по точке если point_id указан и не равен 0 (0 = все точки для админа)
    if (filterPointId && filterPointId !== 0 && filterPointId !== '0') {
      conditions.push('point_id = ?');
      params.push(parseInt(filterPointId));
      console.log('[/api/orders] Фильтр по точке:', filterPointId);
    }
    
    // Фильтр по дате
    if (date && date.trim() !== '') {
      // Логика:
      // - Если запрошен сегодняшний день (is_asap = 1) - показываем по created_at
      // - Для предзаказов (is_asap = 0) - показываем по delivery_date
      // Сравниваем даты с учётом того что delivery_date может содержать время
      // Используем DATE() для извлечения даты или LIKE для частичного совпадения
      // ВАЖНО: фильтруем пустые значения ДО применения DATE() чтобы избежать ошибки MySQL
      const dbType = getDbType();
      if (dbType === 'mysql') {
        // ВАЖНО: используем CASE для преобразования пустых строк в NULL ДО применения DATE()
        // чтобы избежать ошибки "Incorrect DATE value: ''"
        conditions.push('(DATE(created_at) = ? AND (is_asap = 1 OR is_asap IS NULL)) OR (is_asap = 0 AND delivery_date IS NOT NULL AND delivery_date != \'\' AND delivery_date != \'NULL\' AND TRIM(delivery_date) != \'\' AND LENGTH(TRIM(delivery_date)) > 0 AND DATE(CASE WHEN delivery_date IS NOT NULL AND TRIM(delivery_date) != \'\' THEN TRIM(delivery_date) ELSE NULL END) = ?)');
      } else {
        // SQLite - используем substr для сравнения даты
        conditions.push('(DATE(created_at) = ? AND (is_asap = 1 OR is_asap IS NULL)) OR (is_asap = 0 AND delivery_date IS NOT NULL AND delivery_date != \'\' AND delivery_date != \'NULL\' AND TRIM(delivery_date) != \'\' AND LENGTH(TRIM(delivery_date)) > 0 AND substr(TRIM(delivery_date), 1, 10) = ?)');
      }
      params.push(date, date);
      console.log('[/api/orders] Фильтр по дате:', date);
    }
    
    // Фильтр по статусу
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    console.log('[/api/orders] SQL:', query);
    console.log('[/api/orders] Params:', params);
    
    const orders = await all(query, params);
    console.log('[/api/orders] Найдено заказов:', orders.length);
    
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    order.items = parseOrderItems(order.items);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создание заказа из Frontpad
app.post('/api/orders', async (req, res) => {
  const {
    guest_name, guest_phone, guest_email,
    order_type, payment, comment, items, total_amount,
    address, street, building, apartment, entrance, floor, intercom,
    is_asap, delivery_date, delivery_time, custom_time, location_id
  } = req.body;
  
  console.log('[/api/orders] Получен запрос на создание заказа:', {
    guest_name, guest_phone, order_type, total_amount,
    items_count: items?.length
  });
  
  try {
    // Проверяем items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Товары обязательны для заказа' });
    }
    
    if (total_amount === undefined || total_amount === null) {
      return res.status(400).json({ error: 'Сумма заказа обязательна' });
    }
    
    // Рассчитываем скидку на товары
    let totalDiscount = 0;
    const discountDetails = [];
    const today = new Date().toISOString().slice(0, 10);
    
    for (const item of items) {
      const productId = item.product_id || item.id;
      if (productId) {
        // Получаем активные скидки для товара
        const productDiscounts = await all(
          'SELECT * FROM product_discounts WHERE product_id = ? AND is_active = 1 AND valid_from <= ? AND valid_to >= ?',
          [productId, today, today]
        );
        
        if (productDiscounts.length > 0) {
          // Применяем наибольшую скидку
          const bestDiscount = productDiscounts.reduce((max, d) => d.value > max.value ? d : max, productDiscounts[0]);
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          let discount = 0;
          
          if (bestDiscount.type === 'percent') {
            discount = itemTotal * (bestDiscount.value / 100);
          } else {
            discount = bestDiscount.value * (item.quantity || 1);
          }
          
          totalDiscount += discount;
          discountDetails.push({
            product_id: productId,
            product_name: item.name,
            discount_name: bestDiscount.name,
            discount_value: bestDiscount.value,
            discount_type: bestDiscount.type,
            discount_amount: discount
          });
          
          // Обновляем цену товара в заказе
          item.original_price = item.price;
          item.price = Math.max(0, item.price - (discount / (item.quantity || 1)));
          item.discount_applied = discount;
          item.discount_name = bestDiscount.name;
        }
      }
    }
    
    console.log('[/api/orders] Рассчитанная скидка:', totalDiscount, discountDetails);
    
    // Используем московское время (UTC+3)
    const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    
    // Формируем полный адрес
    const fullAddress = address || 
      (street ? street + (building ? ', д.' + building : '') + (apartment ? ', кв.' + apartment : '') : '');
    
    // Пересчитываем сумму с учётом скидки
    const finalAmount = Math.max(0, total_amount - totalDiscount);
    const discountReason = discountDetails.length > 0 
      ? discountDetails.map(d => d.discount_name).join(', ')
      : '';
    
    console.log('[/api/orders] Итоговая сумма:', finalAmount, '(была', total_amount, ', скидка:', totalDiscount, ')');
    
    // Определяем point_id для заказа
    let orderPointId = 1; // По умолчанию основная точка
    
    // Пытаемся получить point_id из токена авторизации
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.point_id && decoded.point_id !== 0) {
          orderPointId = decoded.point_id;
        }
      } catch (e) {
        // Токен невалиден, используем точку по умолчанию
      }
    }
    
    // Если point_id передан в теле запроса - используем его
    if (req.body.point_id && req.body.point_id !== 0) {
      orderPointId = parseInt(req.body.point_id);
    }

    const result = await run(
      `INSERT INTO orders
       (order_number, customer_id, guest_name, guest_phone, guest_email, order_type, payment, comment, items, total_amount,
        discount_amount, discount_reason, status, created_at, address, street, building, apartment, entrance, floor, intercom,
        is_asap, delivery_date, delivery_time, custom_time, point_id, location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'новый', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        null, null,
        guest_name, guest_phone, guest_email || null, 
        order_type || 'delivery', payment || 'cash', comment || null, 
        JSON.stringify(items), finalAmount,
        totalDiscount, discountReason,
        moscowTime,
        fullAddress || null, street || null, building || null, apartment || null, 
        entrance || null, floor || null, intercom || null,
        is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
        delivery_date || null, delivery_time || null, custom_time || null,
        orderPointId,
        location_id || null
      ]
    );
    const order = await get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
    order.items = parseOrderItems(order.items);
    
    // Отправляем уведомление всем клиентам Frontpad
    console.log(`[NEW_ORDER] Создан новый заказ #${order.id}, отправлен broadcast new_order`);
    console.log(`[AUTO_PRINT] Запущена автоматическая печать чека для заказа #${order.id}`);
    broadcast({ type: 'new_order', order });
    broadcast({ type: 'print_receipt', receipt: { orderId: order.id, autoPrint: true } });
    
    console.log('[/api/orders] Заказ создан успешно, ID:', result.lastID);
    
    res.json(order);
  } catch (err) {
    console.error('[/api/orders] Ошибка создания заказа:', err);
    res.status(500).json({ error: err.message });
  }
});

// Обновление заказа полностью
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const {
    guest_name, guest_phone, guest_email,
    order_type, payment, comment, items, total_amount, status,
    address, street, building, apartment, entrance, floor, intercom,
    is_asap, delivery_date, delivery_time, custom_time, location_id
  } = req.body;
  try {
    // Формируем полный адрес
    const fullAddress = address || 
      (street ? street + (building ? ', д.' + building : '') + (apartment ? ', кв.' + apartment : '') : '');
    
    // Собираем поля для обновления
    let updateFields = [
      'guest_name = ?', 'guest_phone = ?', 'guest_email = ?',
      'order_type = ?', 'payment = ?', 'comment = ?', 'items = ?', 'total_amount = ?', 'status = ?',
      'address = ?', 'street = ?', 'building = ?', 'apartment = ?', 'entrance = ?', 'floor = ?', 'intercom = ?',
      'is_asap = ?', 'delivery_date = ?', 'delivery_time = ?', 'custom_time = ?', 'location_id = ?'
    ];
    
    let updateParams = [
      guest_name, guest_phone, guest_email || null,
      order_type || 'delivery', payment || 'cash', comment || null,
      JSON.stringify(items), total_amount, status || 'новый',
      fullAddress || null, street || null, building || null, apartment || null,
      entrance || null, floor || null, intercom || null,
      is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
      delivery_date || null, delivery_time || null, custom_time || null,
      location_id || null
    ];
    
    // Если point_id передан - добавляем в обновление
    if (req.body.point_id !== undefined) {
      updateFields.push('point_id = ?');
      updateParams.push(parseInt(req.body.point_id));
    }
    
    updateParams.push(id);

    await run(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    broadcast({ type: 'order_updated', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление статуса заказа
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // Получаем заказ для проверки и получения site_order_id
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    await run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    order.items = parseOrderItems(order.items);
    
    console.log(`[STATUS_CHANGE] Статус заказа #${id} (site_order_id: ${order.site_order_id}) изменён на "${status}"`);
    
    // Синхронизируем статус с основным сайтом
    // ВАЖНО: используем site_order_id если есть, иначе id
    const orderIdForSync = order.site_order_id || id;
    syncOrderToSite('/api/site/orders/status-sync', {
      order_id: orderIdForSync,
      status: status,
      customer_id: order.customer_id
    });
    
    // Автоматическая печать при изменении статуса
    if (status === 'в производстве' || status === 'произведен') {
      console.log(`[AUTO_PRINT] Автоматическая печать чека при смене статуса на "${status}" для заказа #${id}`);
      broadcast({ type: 'print_receipt', receipt: { orderId: order.id, autoPrint: true, reason: `status_change_${status}` } });
    }
    
    broadcast({ type: 'order_status_changed', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ПРИНЯТИЕ ЗАКАЗА (С ВРЕМЕНЕМ ГОТОВНОСТИ) ============

app.put('/api/orders/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { ready_time } = req.body;
  
  console.log(`[ACCEPT_ORDER] Запрос на принятие заказа #${id}, ready_time: ${ready_time}`);
  
  try {
    // Проверяем обязательный параметр ready_time
    if (!ready_time) {
      return res.status(400).json({ error: 'Параметр ready_time обязателен (формат HH:mm)' });
    }
    
    // Валидируем формат времени (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(ready_time)) {
      return res.status(400).json({ error: 'Неверный формат времени. Используйте HH:mm (например, 15:30)' });
    }
    
    // Получаем заказ для проверки
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    // Обновляем статус на "в производстве" и сохраняем ready_time
    const newStatus = 'в производстве';
    await run('UPDATE orders SET status = ?, ready_time = ? WHERE id = ?', [newStatus, ready_time, id]);
    
    // Получаем обновлённый заказ
    const updatedOrder = await get('SELECT * FROM orders WHERE id = ?', [id]);
    updatedOrder.items = parseOrderItems(updatedOrder.items);
    
    console.log(`[ACCEPT_ORDER] Заказ #${id} принят, статус: ${newStatus}, ready_time: ${ready_time}`);
    
    // Синхронизируем статус с основным сайтом
    const orderIdForSync = order.site_order_id || id;
    syncOrderToSite('/api/site/orders/status-sync', {
      order_id: orderIdForSync,
      status: newStatus,
      ready_time: ready_time,
      customer_id: order.customer_id
    });
    
    // Автоматическая печать при принятии заказа
    console.log(`[AUTO_PRINT] Автоматическая печать чека при принятии заказа #${id}`);
    broadcast({ type: 'print_receipt', receipt: { orderId: updatedOrder.id, autoPrint: true, reason: 'order_accepted' } });
    
    broadcast({ type: 'order_accepted', order: updatedOrder });
    
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error(`[ACCEPT_ORDER] Ошибка при принятии заказа #${id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ ОТКЛОНЕНИЕ ЗАКАЗА ============

app.put('/api/orders/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  console.log(`[REJECT_ORDER] Запрос на отклонение заказа #${id}, причина: ${reason}`);
  
  try {
    // Получаем заказ для проверки
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    // Обновляем статус на "отклонён"
    const newStatus = 'отклонён';
    
    // Если есть причина отклонения, добавляем её в комментарий
    const updatedComment = reason ? `[ОТКЛОНЁН: ${reason}] ${order.comment || ''}` : order.comment;
    
    await run('UPDATE orders SET status = ?, comment = ? WHERE id = ?', [newStatus, updatedComment, id]);
    
    // Получаем обновлённый заказ
    const updatedOrder = await get('SELECT * FROM orders WHERE id = ?', [id]);
    updatedOrder.items = parseOrderItems(updatedOrder.items);
    
    console.log(`[REJECT_ORDER] Заказ #${id} отклонён, статус: ${newStatus}`);
    
    // Синхронизируем статус с основным сайтом
    const orderIdForSync = order.site_order_id || id;
    syncOrderToSite('/api/site/orders/status-sync', {
      order_id: orderIdForSync,
      status: newStatus,
      reason: reason || null,
      customer_id: order.customer_id
    });
    
    broadcast({ type: 'order_rejected', order: updatedOrder });
    
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error(`[REJECT_ORDER] Ошибка при отклонении заказа #${id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Обновление скидки заказа
app.put('/api/orders/:id/discount', async (req, res) => {
  const { id } = req.params;
  const { discount_amount, discount_reason } = req.body;
  
  console.log(`[DISCOUNT] Обновление скидки для заказа #${id}: сумма=${discount_amount}, причина=${discount_reason}`);
  
  try {
    const discountVal = parseFloat(discount_amount) || 0;
    const reason = discount_reason || '';
    
    await run('UPDATE orders SET discount_amount = ?, discount_reason = ? WHERE id = ?', [discountVal, reason, id]);
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = parseOrderItems(order.items);
    
    // Отправляем broadcast об обновлении заказа
    broadcast({ type: 'order_updated', order });
    
    console.log(`[DISCOUNT] Скидка для заказа #${id} обновлена: ${discountVal} руб.`);
    
    res.json(order);
  } catch (err) {
    console.error('[DISCOUNT] Ошибка обновления скидки:', err);
    res.status(500).json({ error: err.message });
  }
});

// Удаление заказа
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Получаем данные заказа перед удалением
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    
    await run('DELETE FROM orders WHERE id = ?', [id]);
    broadcast({ type: 'order_deleted', id });
    
    // Синхронизируем удаление с основным сайтом
    try {
      // Используем site_order_id если есть, чтобы основной сайт мог найти заказ
      const orderIdForSync = order?.site_order_id || id;
      syncOrderToSite('/api/site/orders/delete-sync', {
        order_id: orderIdForSync
      });
      console.log(`[DELETE_SYNC] Удаление заказа #${id} синхронизировано с основным сайтом (ID: ${orderIdForSync})`);
    } catch (syncErr) {
      console.error(`[DELETE_SYNC] Ошибка синхронизации удаления:`, syncErr.message);
    }
    
    res.json({ message: 'Заказ удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Клиенты
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await all('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  const email = phone + '@younitipad.local';
  try {
    const result = await run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', [name, email, phone, address || null]);
    const customer = await get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить заказы клиента по телефону
app.get('/api/customers/:phone/orders', async (req, res) => {
  const { phone } = req.params;
  try {
    const orders = await all('SELECT * FROM orders WHERE guest_phone = ? ORDER BY created_at DESC', [phone]);
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить рекомендации для клиента (товары из предыдущих заказов)
app.get('/api/customers/:phone/recommendations', async (req, res) => {
  const { phone } = req.params;
  try {
    // Получаем все заказы клиента
    const orders = await all('SELECT items FROM orders WHERE guest_phone = ?', [phone]);
    
    // Собираем все product_id из заказов
    const productIds = new Set();
    orders.forEach(order => {
      const items = parseOrderItems(order.items);
      items.forEach(item => {
        if (item.product_id) {
          productIds.add(item.product_id);
        }
      });
    });
    
    // Получаем рекомендации - товары из тех же категорий, что клиент заказывал
    if (productIds.size > 0) {
      // Находим категории, которые клиент заказывал
      const products = await all(`SELECT DISTINCT category_id FROM products WHERE id IN (${Array.from(productIds).join(',')})`);
      const categoryIds = products.map(p => p.category_id).filter(Boolean);
      
      if (categoryIds.length > 0) {
        // Получаем похожие товары (из тех же категорий, исключая уже заказанные)
        const recommendations = await all(
          `SELECT p.*, c.name as category_name FROM products p 
           LEFT JOIN categories c ON p.category_id = c.id 
           WHERE p.category_id IN (${categoryIds.join(',')}) AND p.id NOT IN (${Array.from(productIds).join(',')})
           ORDER BY p.sort_order ASC LIMIT 10`
        );
        return res.json(recommendations);
      }
    }
    
    // Если нет данных - возвращаем популярные товары
    const popularProducts = await all(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order ASC LIMIT 10'
    );
    res.json(popularProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Отчёты
app.get('/api/reports/sales', async (req, res) => {
  const { date_from, date_to, point_id } = req.query;
  try {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE status != 'cancelled'
    `;
    const params = [];
    
    // Фильтр по точке
    if (point_id && point_id !== '0') {
      query += ' AND point_id = ?';
      params.push(parseInt(point_id));
    }
    
    if (date_from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    const data = await all(query, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/top-products', async (req, res) => {
  const { date_from, date_to, limit = 10 } = req.query;
  try {
    let whereClause = "WHERE o.status != 'отменён'";
    const params = [];
    if (date_from) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }
    
    // Получаем все заказы за период
    const orders = await all(`SELECT items FROM orders ${whereClause}`, params);
    
    if (!orders || orders.length === 0) {
      return res.json([]);
    }
    
    // Подсчитываем популярность товаров
    const productStats = {};
    orders.forEach(order => {
      if (!order || !order.items) return;
      const items = parseOrderItems(order.items);
      if (!Array.isArray(items)) return;
      items.forEach(item => {
        const name = item.name || item.product_name;
        if (!name) return;
        if (!productStats[name]) {
          productStats[name] = { product_name: name, total_quantity: 0, total_revenue: 0 };
        }
        productStats[name].total_quantity += parseFloat(item.quantity || 1);
        productStats[name].total_revenue += (parseFloat(item.price || 0) * parseFloat(item.quantity || 1));
      });
    });
    
    const result = Object.values(productStats)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, parseInt(limit));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching top-products:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');
    
    const todayOrders = await get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ? AND status != 'отменён'`, [today]);
    const yesterdayOrders = await get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ? AND status != 'отменён'`, [yesterday]);
    const monthOrders = await get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE LEFT(created_at, 7) = ? AND status != 'отменён'`, [thisMonth]);
    const pendingOrders = await get(`SELECT COUNT(*) as count FROM orders WHERE status IN ('новый', 'в производстве')`);
    const totalProducts = await get('SELECT COUNT(*) as count FROM products');
    const totalCustomers = await get('SELECT COUNT(*) as count FROM customers');
    
    res.json({
      today_orders: { count: todayOrders.count || 0, total: todayOrders.total || 0 },
      yesterday_orders: { count: yesterdayOrders.count || 0, total: yesterdayOrders.total || 0 },
      month_orders: { count: monthOrders.count || 0, total: monthOrders.total || 0 },
      pending_orders: { count: pendingOrders.count || 0 },
      total_products: { count: totalProducts.count || 0 },
      total_customers: { count: totalCustomers.count || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Печать чека
app.post('/api/orders/:id/print', async (req, res) => {
  const { id } = req.params;
  console.log(`[PRINT] Запрос на печать чека для заказа #${id}`);
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    console.log(`[PRINT] Найден заказ:`, order ? `ID=${order.id}, total=${order.total_amount}` : 'НЕ НАЙДЕН');
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    
    // Защита от повторного парсинга - MySQL драйвер может уже распарсить JSON
    order.items = parseOrderItems(order.items);
    console.log(`[PRINT] Items:`, order.items.length);
    
    // Формируем HTML чек для печати
    const shopName = 'Я Буду';
    const shopAddress = 'ул. Примерная, 1';
    const shopPhone = '+7 (999) 123-45-67';
    
    const itemsHtml = order.items.map(item => `
      <tr>
        <td>${item.name} ×${item.quantity}</td>
        <td>${(item.price * item.quantity).toFixed(2)} ₽</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Чек #${order.id}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 14px; margin: 0; padding: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { text-align: center; margin-bottom: 20px; }
          .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #000; }
          .order-info { margin-bottom: 15px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 4px 0; border-bottom: 1px solid #ccc; }
          td:last-child { text-align: right; font-weight: bold; }
          .total { font-weight: bold; font-size: 18px; margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; color: #000; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div>${shopAddress}</div>
          <div>${shopPhone}</div>
        </div>
        <div class="order-info">
          <strong>Заказ #${order.id}</strong><br>
          Дата: ${new Date(order.created_at).toLocaleString('ru-RU')}<br>
          Клиент: ${order.guest_name || 'Гость'}<br>
          Телефон: ${order.guest_phone || '-'}<br>
          ${order.address ? 'Адрес: ' + order.address + '<br>' : ''}
          Тип: ${order.order_type === 'delivery' ? 'Доставка' : 'Самовывоз'}<br>
          Оплата: ${order.payment === 'cash' ? 'Наличные' : order.payment === 'card' ? 'Карта' : 'Онлайн'}
        </div>
        <table>
          ${itemsHtml}
        </table>
        <div class="total">
          ИТОГО: ${order.total_amount} ₽
        </div>
        <div class="footer">
          Спасибо за заказ!
        </div>
      </body>
      </html>
    `;
    
    // Отправляем HTML клиенту
    res.json({ html, message: 'Чек сформирован' });
    
    // НЕ отправляем broadcast - клиент уже сделал печать сам
    // broadcast вызывал бесконечный цикл
    console.log(`[PRINT] Чек сформирован для заказа #${order.id}, ответ отправлен клиенту`);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для получения новых заказов с сайта (для мгновенного отображения)
app.get('/api/orders/new/check', async (req, res) => {
  try {
    const lastCheck = req.query.since || moment().subtract(5, 'minutes').toISOString();
    const orders = await all(
      'SELECT * FROM orders WHERE created_at > ? ORDER BY created_at DESC',
      [lastCheck]
    );
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADDON TEMPLATES ============

app.get('/api/addon-templates', async (req, res) => {
  try {
    const addons = await all('SELECT * FROM addon_templates WHERE is_active = 1 ORDER BY name');
    res.json(addons || []);
  } catch (err) {
    console.error('Error fetching addon templates:', err.message);
    res.json([]);
  }
});

app.get('/api/addon-templates/:id', async (req, res) => {
  try {
    const addon = await get('SELECT * FROM addon_templates WHERE id = ?', [req.params.id]);
    if (!addon) return res.status(404).json({ error: 'Шаблон дополнения не найден' });
    res.json(addon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/addon-templates', async (req, res) => {
  const { name, description, default_price, sort_order, unit, is_active } = req.body;
  try {
    const result = await run(
      'INSERT INTO addon_templates (name, description, default_price, sort_order, unit, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', default_price || 0, sort_order || 0, unit || 'шт', is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );
    res.json({ id: result.lastID, name, description, default_price, sort_order, unit, is_active: is_active || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/addon-templates/:id', async (req, res) => {
  const { name, description, default_price, sort_order, is_active, unit } = req.body;
  try {
    await run(
      'UPDATE addon_templates SET name = ?, description = ?, default_price = ?, sort_order = ?, is_active = ?, unit = ? WHERE id = ?',
      [name, description || '', default_price || 0, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, unit || 'шт', req.params.id]
    );
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/addon-templates/:id', async (req, res) => {
  try {
    await run('DELETE FROM addon_templates WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ INVENTORY ============

// Получить сводку по себестоимости товаров
app.get('/api/inventory/summary', async (req, res) => {
  try {
    // Получаем все товары с рецептами
    const products = await all(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.price as selling_price
      FROM products p
      WHERE p.is_active = 1
      ORDER BY p.name
    `);
    
    const summary = [];
    
    for (const product of products) {
      // Получаем рецепт товара
      const recipes = await all(`
        SELECT r.quantity, r.unit, 
               i.name as ingredient_name, i.cost_per_unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.product_id = ?
      `, [product.product_id]);
      
      let costPrice = 0;
      let profit = 0;
      
      if (recipes.length > 0) {
        costPrice = recipes.reduce((sum, r) => sum + (parseFloat(r.cost_per_unit || 0) * parseFloat(r.quantity || 0)), 0);
        profit = parseFloat(product.selling_price || 0) - costPrice;
      }
      
      const profitPercent = product.selling_price > 0 ? (profit / product.selling_price) * 100 : 0;
      
      summary.push({
        product_id: product.product_id,
        product_name: product.product_name,
        selling_price: product.selling_price,
        cost_price: costPrice.toFixed(2),
        profit: profit.toFixed(2),
        profit_percent: profitPercent.toFixed(1)
      });
    }
    
    res.json(summary);
  } catch (err) {
    console.error('Error fetching inventory summary:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Получить движения склада
app.get('/api/inventory-movements', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Пока возвращаем пустой массив - таблица inventory_movements не создана
    // Можно расширить позже
    res.json([]);
  } catch (err) {
    console.error('Error fetching inventory movements:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ INGREDIENTS ============

app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await all('SELECT * FROM ingredients ORDER BY name');
    res.json(ingredients || []);
  } catch (err) {
    console.error('Error fetching ingredients:', err.message);
    res.json([]);
  }
});

app.get('/api/ingredients/critical', async (req, res) => {
  try {
    // Ингредиенты где current_quantity <= min_quantity (или min_quantity = 0)
    const ingredients = await all(
      'SELECT * FROM ingredients WHERE current_quantity <= COALESCE(min_quantity, 0) ORDER BY current_quantity ASC'
    );
    res.json(ingredients || []);
  } catch (err) {
    console.error('Error fetching critical ingredients:', err.message);
    res.json([]);
  }
});

app.get('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredient = await get('SELECT * FROM ingredients WHERE id = ?', [req.params.id]);
    if (!ingredient) return res.status(404).json({ error: 'Ингредиент не найден' });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingredients', async (req, res) => {
  const { name, unit, current_quantity, min_quantity, cost_per_unit, supplier } = req.body;
  try {
    const result = await run(
      'INSERT INTO ingredients (name, unit, current_quantity, min_quantity, cost_per_unit, supplier) VALUES (?, ?, ?, ?, ?, ?)',
      [name, unit || 'шт', current_quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier || null]
    );
    res.json({ id: result.lastID, name, unit, current_quantity, min_quantity, cost_per_unit, supplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  const { name, unit, current_quantity, min_quantity, cost_per_unit, supplier } = req.body;
  try {
    await run(
      'UPDATE ingredients SET name = ?, unit = ?, current_quantity = ?, min_quantity = ?, cost_per_unit = ?, supplier = ? WHERE id = ?',
      [name, unit || 'шт', current_quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier || null, req.params.id]
    );
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    await run('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ RECIPES ============

app.get('/api/recipes/product/:productId', async (req, res) => {
  try {
    const recipes = await all('SELECT r.*, i.name as ingredient_name, i.unit FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id WHERE r.product_id = ?', [req.params.productId]);
    res.json(recipes || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await all('SELECT r.*, p.name as product_name, i.name as ingredient_name FROM recipes r JOIN products p ON r.product_id = p.id JOIN ingredients i ON r.ingredient_id = i.id ORDER BY p.name');
    res.json(recipes || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/recipes', async (req, res) => {
  const { product_id, ingredient_name, ingredient_unit, ingredient_cost, quantity, unit } = req.body;
  
  try {
    // Ищем или создаём ингредиент
    let ingredient;
    if (ingredient_name) {
      ingredient = await get('SELECT * FROM ingredients WHERE name = ?', [ingredient_name]);
      if (!ingredient) {
        const result = await run(
          'INSERT INTO ingredients (name, unit, cost_per_unit) VALUES (?, ?, ?)',
          [ingredient_name, ingredient_unit || 'шт', ingredient_cost || 0]
        );
        ingredient = { id: result.lastID, name: ingredient_name, unit: ingredient_unit || 'шт' };
      }
    } else {
      ingredient = await get('SELECT * FROM ingredients WHERE id = ?', [req.body.ingredient_id]);
    }
    
    if (!ingredient) {
      return res.status(400).json({ error: 'Ингредиент не найден' });
    }
    
    const result = await run(
      'INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
      [product_id, ingredient.id, quantity || 1, unit || ingredient.unit]
    );
    res.json({ id: result.lastID, product_id, ingredient_id: ingredient.id, quantity: quantity || 1, unit: unit || ingredient.unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    await run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PREORDER DATES ============

// Endpoint для получения списка дат с предзаказами
app.get('/api/preorder-dates', async (req, res) => {
  try {
    // Используем MySQL совместимую дату
    const dbType = getDbType();
    let today;
    
    if (dbType === 'mysql') {
      // Для MySQL используем CURDATE()
      const result = await get('SELECT CURDATE() as today');
      today = result?.today || new Date().toISOString().slice(0, 10);
    } else {
      // Для SQLite используем moment
      today = moment().format('YYYY-MM-DD');
    }
    
    console.log('[/api/preorder-dates] Today:', today);
    
    // Получаем даты предзаказов (is_asap = 0) с будущей датой доставки
    // ВАЖНО: используем подзапрос для фильтрации ДО агрегации, чтобы избежать ошибки MySQL
    let dates;
    if (dbType === 'mysql') {
      // Используем подзапрос - сначала фильтруем записи, потом группируем
      // CAST(order_count AS UNSIGNED) для возврата числа вместо строки
      dates = await all(
        `SELECT delivery_date, CAST(SUM(order_count) AS UNSIGNED) as order_count FROM (
          SELECT 
            TRIM(delivery_date) as delivery_date,
            COUNT(*) as order_count
          FROM orders
          WHERE is_asap = 0 
            AND delivery_date IS NOT NULL 
            AND TRIM(delivery_date) != ''
            AND TRIM(delivery_date) != 'NULL'
            AND LENGTH(TRIM(delivery_date)) > 0
            AND status NOT IN ('delivered', 'cancelled')
          GROUP BY TRIM(delivery_date)
        ) AS filtered 
        WHERE delivery_date >= ? 
        GROUP BY delivery_date
        ORDER BY delivery_date ASC`,
        [today]
      );
    } else {
      // SQLite - добавляем проверку delivery_date != '' и TRIM()
      dates = await all(
        `SELECT MIN(delivery_date) as delivery_date, COUNT(*) as order_count FROM orders 
         WHERE is_asap = 0 AND delivery_date IS NOT NULL AND delivery_date != '' AND delivery_date != 'NULL' AND TRIM(delivery_date) != '' AND LENGTH(TRIM(delivery_date)) > 0 AND substr(TRIM(delivery_date), 1, 10) >= ? 
         AND status NOT IN ('delivered', 'cancelled') 
         GROUP BY substr(TRIM(delivery_date), 1, 10) ORDER BY delivery_date ASC`,
        [today]
      );
    }
    
    console.log('[/api/preorder-dates] Found dates:', dates);
    res.json(dates || []);
  } catch (err) {
    console.error('[/api/preorder-dates] Error:', err.message);
    res.json([]);
  }
});

app.get('/api/preorders/:date', async (req, res) => {
  try {
    const dbType = getDbType();
    let today;
    
    if (dbType === 'mysql') {
      const result = await get('SELECT CURDATE() as today');
      today = result?.today || new Date().toISOString().slice(0, 10);
    } else {
      today = moment().format('YYYY-MM-DD');
    }
    
    // Получаем предзаказы (is_asap = 0) на конкретную дату
    const orders = await all(
      `SELECT * FROM orders WHERE is_asap = 0 AND delivery_date = ? 
       AND status NOT IN ('delivered', 'cancelled') ORDER BY created_at DESC`,
      [req.params.date]
    );
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    res.json(orders);
  } catch (err) {
    console.error('[/api/preorders] Error:', err.message);
    res.json([]);
  }
});

// ============ DELIVERY ZONES ============

// Получить все точки
app.get('/api/points', async (req, res) => {
  try {
    const points = await all('SELECT * FROM points WHERE is_active = 1 ORDER BY id ASC');
    res.json(points || []);
  } catch (err) {
    console.error('Error fetching points:', err.message);
    res.json([]);
  }
});

// Получить точку по ID
app.get('/api/points/:id', async (req, res) => {
  try {
    const point = await get('SELECT * FROM points WHERE id = ?', [req.params.id]);
    if (!point) return res.status(404).json({ error: 'Точка не найдена' });
    res.json(point);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать новую точку
app.post('/api/points', async (req, res) => {
  try {
    const { name, address, phone, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Название точки обязательно' });
    
    const result = await run(
      'INSERT INTO points (name, address, phone, is_active) VALUES (?, ?, ?, ?)',
      [name, address || null, phone || null, is_active !== undefined ? is_active : 1]
    );
    
    const point = await get('SELECT * FROM points WHERE id = ?', [result.lastID]);
    res.json(point);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить точку
app.put('/api/points/:id', async (req, res) => {
  try {
    const { name, address, phone, is_active } = req.body;
    const point = await get('SELECT * FROM points WHERE id = ?', [req.params.id]);
    if (!point) return res.status(404).json({ error: 'Точка не найдена' });
    
    await run(
      'UPDATE points SET name = ?, address = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || point.name, address !== undefined ? address : point.address, phone !== undefined ? phone : point.phone, is_active !== undefined ? is_active : point.is_active, req.params.id]
    );
    
    const updatedPoint = await get('SELECT * FROM points WHERE id = ?', [req.params.id]);
    res.json(updatedPoint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить точку
app.delete('/api/points/:id', async (req, res) => {
  try {
    await run('UPDATE points SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1, message: 'Точка деактивирована' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить все районы доставки
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const { point_id } = req.query;
    let query = 'SELECT * FROM delivery_zones WHERE 1=1';
    const params = [];
    
    // ✅ Фильтр по точке: если пользователь авторизован - используем его point_id
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.point_id && decoded.point_id !== 0) {
          query += ' AND point_id = ?';
          params.push(decoded.point_id);
        }
      } catch (e) {
        // Токен невалиден, не фильтруем
      }
    }
    
    // Если point_id явно передан в запросе - он имеет приоритет
    if (point_id && point_id !== '0') {
      query += ' AND point_id = ?';
      params.push(parseInt(point_id));
    }
    
    query += ' ORDER BY sort_order ASC, name ASC';
    
    const zones = await all(query, params);
    res.json(zones || []);
  } catch (err) {
    console.error('Error fetching delivery zones:', err.message);
    res.json([]);
  }
});

// Получить район доставки по ID
app.get('/api/delivery-zones/:id', async (req, res) => {
  try {
    const zone = await get('SELECT * FROM delivery_zones WHERE id = ?', [req.params.id]);
    if (!zone) return res.status(404).json({ error: 'Район доставки не найден' });
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать район доставки
app.post('/api/delivery-zones', async (req, res) => {
  const { name, min_order_amount, delivery_price, is_active, sort_order, point_id } = req.body;
  try {
    // Определяем point_id для района
    let zonePointId = point_id || 1;
    
    // Если пользователь авторизован и у него есть своя точка - используем её
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.point_id && decoded.point_id !== 0) {
          zonePointId = decoded.point_id;
        }
      } catch (e) {}
    }
    
    const result = await run(
      'INSERT INTO delivery_zones (name, min_order_amount, delivery_price, is_active, sort_order, point_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, min_order_amount || 0, delivery_price || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, sort_order || 0, zonePointId]
    );
    res.json({ 
      id: result.lastID, 
      name, 
      min_order_amount: min_order_amount || 0, 
      delivery_price: delivery_price || 0, 
      is_active: is_active || 1, 
      sort_order: sort_order || 0,
      point_id: zonePointId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить район доставки
app.put('/api/delivery-zones/:id', async (req, res) => {
  const { name, min_order_amount, delivery_price, is_active, sort_order, point_id } = req.body;
  try {
    // Получаем текущие данные района
    const existingZone = await get('SELECT * FROM delivery_zones WHERE id = ?', [req.params.id]);
    if (!existingZone) return res.status(404).json({ error: 'Район не найден' });
    
    // Собираем поля для обновления
    const updateFields = [];
    const params = [];
    
    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (min_order_amount !== undefined) { updateFields.push('min_order_amount = ?'); params.push(min_order_amount || 0); }
    if (delivery_price !== undefined) { updateFields.push('delivery_price = ?'); params.push(delivery_price || 0); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (sort_order !== undefined) { updateFields.push('sort_order = ?'); params.push(sort_order || 0); }
    if (point_id !== undefined) { updateFields.push('point_id = ?'); params.push(parseInt(point_id)); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }
    
    params.push(req.params.id);
    
    await run(
      `UPDATE delivery_zones SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    const zone = await get('SELECT * FROM delivery_zones WHERE id = ?', [req.params.id]);
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить район доставки
app.delete('/api/delivery-zones/:id', async (req, res) => {
  try {
    await run('DELETE FROM delivery_zones WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DISCOUNTS ============

app.get('/api/discounts', async (req, res) => {
  try {
    const discounts = await all('SELECT * FROM discounts WHERE is_active = 1 ORDER BY created_at DESC');
    res.json(discounts || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/discounts', async (req, res) => {
  const { name, description, type, value, min_order_amount, max_discount_amount, code, valid_from, valid_to, usage_limit } = req.body;
  try {
    const result = await run(
      `INSERT INTO discounts (name, description, type, value, min_order_amount, max_discount_amount, code, valid_from, valid_to, usage_limit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', type || 'percent', value, min_order_amount || 0, max_discount_amount || null, code || null, valid_from || null, valid_to || null, usage_limit || null]
    );
    res.json({ id: result.lastID, name, type, value, is_active: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SIZES ============

app.get('/api/sizes', async (req, res) => {
  try {
    const sizes = await all('SELECT * FROM sizes ORDER BY sort_order');
    res.json(sizes || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/products/:productId/sizes', async (req, res) => {
  try {
    const sizes = await all('SELECT * FROM sizes WHERE product_id = ? ORDER BY sort_order', [req.params.productId]);
    res.json(sizes || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/sizes', async (req, res) => {
  const { name, size_value, price } = req.body;
  try {
    const result = await run(
      'INSERT INTO sizes (product_id, name, size_value, price) VALUES (?, ?, ?, ?)',
      [req.params.productId, name, size_value || name, price || 0]
    );
    res.json({ id: result.lastID, product_id: req.params.productId, name, size_value, price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:productId/sizes/:sizeId', async (req, res) => {
  const { productId, sizeId } = req.params;
  const { name, size_value, price } = req.body;
  try {
    await run(
      'UPDATE sizes SET name = ?, size_value = ?, price = ? WHERE id = ? AND product_id = ?',
      [name, size_value || name, price || 0, sizeId, productId]
    );
    const size = await get('SELECT * FROM sizes WHERE id = ?', [sizeId]);
    res.json(size);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:productId/sizes', async (req, res) => {
  try {
    await run('DELETE FROM sizes WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SIZE ADDONS ============

// Получить все size_addons для товара
app.get('/api/products/:productId/size-addons', async (req, res) => {
  try {
    const sizesWithAddons = await all(`
      SELECT s.id as size_id, s.name as size_name, s.product_id, s.price as size_price,
             sa.id as size_addon_id, sa.addon_id, sa.is_required, sa.price_modifier, sa.sort_order as sa_sort_order,
             at.name as addon_name, at.default_price as addon_price, at.unit as addon_unit
      FROM sizes s
      LEFT JOIN size_addons sa ON s.id = sa.size_id
      LEFT JOIN addon_templates at ON sa.addon_id = at.id
      WHERE s.product_id = ?
      ORDER BY s.sort_order, sa.sort_order
    `, [req.params.productId]);
    
    // Группируем по размерам
    const result = {};
    sizesWithAddons.forEach(row => {
      if (!result[row.size_id]) {
        result[row.size_id] = {
          size_id: row.size_id,
          size_name: row.size_name,
          size_price: row.size_price,
          addons: []
        };
      }
      if (row.size_addon_id) {
        result[row.size_id].addons.push({
          id: row.size_addon_id,
          addon_id: row.addon_id,
          name: row.addon_name,
          price: row.addon_price,
          unit: row.addon_unit,
          is_required: row.is_required,
          price_modifier: row.price_modifier
        });
      }
    });
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching size-addons:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Удалить все size_addons для размера
app.delete('/api/products/:productId/sizes/:sizeId/addons', async (req, res) => {
  try {
    const { productId, sizeId } = req.params;
    await run('DELETE FROM size_addons WHERE size_id = ?', [sizeId]);
    res.json({ deleted: 1, message: 'Все допы для размера удалены' });
  } catch (err) {
    console.error('Error deleting size-addons:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Добавить допы к размеру (массив дополнений)
app.post('/api/products/:productId/sizes/:sizeId/addons', async (req, res) => {
  try {
    const { productId, sizeId } = req.params;
    const addons = req.body; // Массив дополнений: [{name: '', price: 0}, ...]

    // Проверяем, существует ли размер
    const size = await get('SELECT id FROM sizes WHERE id = ? AND product_id = ?', [sizeId, productId]);
    if (!size) {
      return res.status(400).json({ 
        error: 'Размер не найден', 
        message: 'Невозможно добавить дополнение: указанный размер не существует в базе данных или не принадлежит продукту' 
      });
    }

    // Удаляем старые дополнения для этого размера
    await run('DELETE FROM size_addons WHERE size_id = ?', [sizeId]);

    // Добавляем новые дополнения
    for (const addon of addons) {
      await run(`
        INSERT INTO size_addons (size_id, addon_name, addon_price) 
        VALUES (?, ?, ?)
      `, [sizeId, addon.name, addon.price || 0]);
    }

    res.json({ success: true, message: 'Дополнения сохранены' });
  } catch (err) {
    console.error('Error adding size-addons:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Устаревший маршрут для совместимости (удалить в будущем)
app.post('/api/sizes/:sizeId/addons', async (req, res) => {
  try {
    const { sizeId } = req.params;
    const { addon_id, is_required, price_modifier, sort_order } = req.body;
    
    // ✅ ПРОВЕРКА: Сначала проверяем что размер действительно существует!
    const size = await get('SELECT id FROM sizes WHERE id = ?', [sizeId]);
    if (!size) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    
    const result = await run(
      'INSERT INTO size_addons (size_id, addon_id, is_required, price_modifier, sort_order) VALUES (?, ?, ?, ?, ?)',
      [sizeId, addon_id, is_required || 0, price_modifier || 0, sort_order || 0]
    );
    
    res.json({ 
      id: result.lastID, 
      size_id: sizeId, 
      addon_id, 
      is_required: is_required || 0, 
      price_modifier: price_modifier || 0,
      message: 'Доп добавлен к размеру'
    });
  } catch (err) {
    if (err.message.includes('foreign key')) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    console.error('Error adding size-addon:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCT DISCOUNTS ============

app.get('/api/products/:productId/discounts', async (req, res) => {
  try {
    const discounts = await all('SELECT * FROM product_discounts WHERE product_id = ?', [req.params.productId]);
    res.json(discounts || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/discounts', async (req, res) => {
  const { name, type, value, valid_from, valid_to, is_active } = req.body;
  try {
    const result = await run(
      'INSERT INTO product_discounts (product_id, name, type, value, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.productId, name, type || 'percent', value, valid_from || null, valid_to || null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );
    res.json({ id: result.lastID, product_id: req.params.productId, name, type, value, is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:productId/discounts', async (req, res) => {
  try {
    await run('DELETE FROM product_discounts WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCT ADDONS ============

app.get('/api/products/:productId/addons', async (req, res) => {
  try {
    const addons = await all('SELECT pa.*, at.name as addon_name, at.default_price FROM product_addons pa JOIN addon_templates at ON pa.addon_template_id = at.id WHERE pa.product_id = ?', [req.params.productId]);
    res.json(addons || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/addons', async (req, res) => {
  const { addon_template_id, custom_price } = req.body;
  try {
    const result = await run(
      'INSERT INTO product_addons (product_id, addon_template_id, custom_price) VALUES (?, ?, ?)',
      [req.params.productId, addon_template_id, custom_price || null]
    );
    res.json({ id: result.lastID, product_id: req.params.productId, addon_template_id, custom_price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:productId/addons', async (req, res) => {
  try {
    await run('DELETE FROM product_addons WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SETTINGS ============

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await all('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.json({
      auto_print_enabled: false,
      auto_print_mode: 'browser',
      server_print_enabled: 'false',
      sound_notifications: true,
      print_receipt_on_status_change: false,
      shop_name: 'Я Буду',
      shop_address: '',
      shop_phone: ''
    });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  try {
    await run(
      `INSERT INTO settings (\`key\`, value) VALUES (?, ?)\n       ON DUPLICATE KEY UPDATE value = ?`,
      [key, value, value]
    );
    res.json({ key, value });
  } catch (err) {
    console.error('Error updating setting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ CHATS ============

app.get('/api/chats', async (req, res) => {
  try {
    const chats = await all(`
      SELECT 
        c.id,
        c.customer_id,
        c.customer_name,
        c.customer_phone,
        c.last_message,
        c.last_message_at,
        c.unread_count,
        c.status
      FROM chats c
      ORDER BY c.last_message_at DESC
    `);
    res.json(chats || []);
  } catch (err) {
    console.error('Error fetching chats:', err.message);
    res.json([]);
  }
});

app.get('/api/chats/:id', async (req, res) => {
  try {
    const chat = await get('SELECT * FROM chats WHERE id = ?', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    
    const messages = await all(
      'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    
    res.json({ ...chat, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// URL основного сайта для синхронизации - импортируется из config.js
// SITE_URL уже импортирован из config.js

app.post('/api/chats/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { message, sender, sender_name } = req.body;
  
  // Московское время
  const timestamp = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  
  try {
    // Проверяем существует ли чат
    let chat = await get('SELECT * FROM chats WHERE id = ?', [id]);
    let actualChatId = id;
    
    if (!chat) {
      // Создаём чат если его нет
      const result = await run(
        `INSERT INTO chats (customer_id, customer_name, customer_phone, last_message, last_message_at, unread_count, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [null, 'Клиент', '', message || '', timestamp, 0]
      );
      actualChatId = result.lastID;
      chat = await get('SELECT * FROM chats WHERE id = ?', [actualChatId]);
      console.log(`[CHAT] Создан новый чат с ID: ${actualChatId}`);
    }
    
    const result = await run(
      `INSERT INTO chat_messages (chat_id, message, sender, sender_name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [actualChatId, message, sender, sender_name || 'Admin', timestamp]
    );
    
    await run(
      `UPDATE chats SET last_message = ?, last_message_at = ?, unread_count = ? WHERE id = ?`,
      [message, timestamp, sender === 'admin' ? 0 : 1, actualChatId]
    );
    
    // Если сообщение от админа - синхронизируем с основным сайтом
    if (sender === 'admin') {
      try {
        // Получаем данные чата (уже получили выше)
        if (chat) {
          await fetch(`${SITE_URL}/api/site/messages/sync-from-frontpad`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Token': SITE_SYNC_TOKEN
            },
            body: JSON.stringify({
              chat_id: chat.id,
              customer_id: chat.customer_id,
              customer_name: chat.customer_name,
              customer_phone: chat.customer_phone,
              message: message,
              sender: sender,
              sender_name: sender_name || 'Admin',
              timestamp: timestamp
            })
          });
        }
      } catch (syncErr) {
        console.error('Ошибка синхронизации сообщения с сайтом:', syncErr.message);
      }
    }
    
    res.json({ id: result.lastID, chat_id: actualChatId, message, sender, sender_name, created_at: timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для сброса unread_count при открытии чата
app.post('/api/chats/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await run('UPDATE chats SET unread_count = 0 WHERE id = ?', [id]);
    res.json({ success: true, chat_id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Endpoint для проверки заказов с предзаказами
app.get('/api/debug/preorders-check', async (req, res) => {
  console.log('[/api/debug/preorders-check] DEBUG endpoint called');
  try {
    const dbType = getDbType();
    let today;
    
    if (dbType === 'mysql') {
      const result = await get('SELECT CURDATE() as today');
      today = result?.today || new Date().toISOString().slice(0, 10);
    } else {
      today = moment().format('YYYY-MM-DD');
    }
    
    // Получаем все заказы с is_asap = 0
    const allPreorders = await all('SELECT id, site_order_id, order_number, is_asap, delivery_date, delivery_time, status, created_at FROM orders WHERE is_asap = 0 ORDER BY created_at DESC LIMIT 20');
    
    // Получаем все заказы с delivery_date
    const allWithDeliveryDate = await all('SELECT id, site_order_id, order_number, is_asap, delivery_date, delivery_time, status, created_at FROM orders WHERE delivery_date IS NOT NULL AND delivery_date != "" ORDER BY created_at DESC LIMIT 20');
    
    // Получаем результат preorder-dates - используем подзапрос для избежания ошибки MySQL
    // CAST(order_count AS UNSIGNED) для возврата числа вместо строки
    let dates = [];
    if (dbType === 'mysql') {
      // Используем подзапрос - сначала фильтруем записи, потом группируем
      dates = await all(
        `SELECT delivery_date, CAST(SUM(order_count) AS UNSIGNED) as order_count FROM (
          SELECT 
            TRIM(delivery_date) as delivery_date,
            COUNT(*) as order_count
          FROM orders
          WHERE is_asap = 0 
            AND delivery_date IS NOT NULL 
            AND TRIM(delivery_date) != ''
            AND TRIM(delivery_date) != 'NULL'
            AND LENGTH(TRIM(delivery_date)) > 0
            AND status NOT IN ('delivered', 'cancelled')
          GROUP BY TRIM(delivery_date)
        ) AS filtered 
        WHERE delivery_date >= ? 
        GROUP BY delivery_date
        ORDER BY delivery_date ASC`,
        [today]
      );
    } else {
      dates = await all(
        `SELECT MIN(delivery_date) as delivery_date, COUNT(*) as order_count FROM orders 
         WHERE is_asap = 0 AND delivery_date IS NOT NULL AND delivery_date != '' AND delivery_date != 'NULL' AND TRIM(delivery_date) != '' AND LENGTH(TRIM(delivery_date)) > 0 AND substr(TRIM(delivery_date), 1, 10) >= ? 
         AND status NOT IN ('delivered', 'cancelled') 
         GROUP BY substr(TRIM(delivery_date), 1, 10) ORDER BY delivery_date ASC`,
        [today]
      );
    }
    
    console.log('[/api/debug/preorders-check] Today:', today);
    console.log('[/api/debug/preorders-check] All preorders (is_asap=0):', allPreorders.length);
    console.log('[/api/debug/preorders-check] All with delivery_date:', allWithDeliveryDate.length);
    console.log('[/api/debug/preorders-check] Preorder dates:', dates.length);
    
    res.json({ 
      today,
      preorders_count: allPreorders.length,
      preorders: allPreorders,
      with_delivery_date_count: allWithDeliveryDate.length,
      with_delivery_date: allWithDeliveryDate,
      preorder_dates_count: dates.length,
      preorder_dates: dates
    });
  } catch (err) {
    console.error('[/api/debug/preorders-check] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Endpoint для проверки заказов за 14 февраля
app.get('/api/debug/orders-feb14', async (req, res) => {
  console.log('[/api/debug/orders-feb14] DEBUG endpoint called');
  try {
    const orders = await all('SELECT * FROM orders WHERE DATE(created_at) = ? ORDER BY created_at DESC', ['2026-02-14']);
    console.log('[/api/debug/orders-feb14] Найдено заказов:', orders.length);
    orders.forEach(order => {
      order.items = parseOrderItems(order.items);
    });
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ СИНХРОНИЗАЦИЯ ЗАКАЗОВ С САЙТА ============

// Endpoint для синхронизации заказов с основного сайта
app.post('/api/site/orders/sync', async (req, res) => {
  const {
    order_id, order_number, customer_id,
    guest_name, guest_phone, guest_email,
    order_type, address, entrance, floor, intercom,
    building, street, apartment,
    is_asap, delivery_date, delivery_time, custom_time,
    payment, comment, items, total_amount, status, created_at,
    point_id
  } = req.body;
  
  try {
    // Проверяем токен синхронизации
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = SITE_SYNC_TOKEN;
    
    console.log(`[SYNC] Получен запрос синхронизации заказа`);
    console.log(`[SYNC] Токен в запросе: ${syncToken ? syncToken.substring(0, 5) + '...' : 'отсутствует'}`);
    console.log(`[SYNC] Ожидаемый токен: ${expectedToken ? expectedToken.substring(0, 5) + '...' : 'отсутствует'}`);
    console.log(`[SYNC] Токены совпадают: ${syncToken === expectedToken}`);
    
    if (syncToken !== expectedToken) {
      console.error(`[SYNC] ОШИБКА: Неверный токен синхронизации! Получен: ${syncToken}, Ожидался: ${expectedToken}`);
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    const existingOrder = await get('SELECT * FROM orders WHERE site_order_id = ?', [order_id]);
    
    // Определяем point_id для заказа с сайта (по умолчанию 1)
    let orderPointId = req.body.point_id || 1;
    
    if (existingOrder) {
      // Заказ уже существует, обновляем его
      // ВАЖНО: находим или создаём клиента по guest_phone, чтобы избежать ошибки foreign key
      let frontpadCustomerId = null;
      if (guest_phone) {
        let customer = await get('SELECT id FROM customers WHERE phone = ?', [guest_phone]);
        if (!customer) {
          const result = await run(
            'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
            [guest_name || 'Клиент', guest_phone, guest_email || null, address || null]
          );
          frontpadCustomerId = result.lastID;
        } else {
          frontpadCustomerId = customer.id;
        }
      }
      
      // Обновляем point_id только если он передан
      let updateQuery = `
        UPDATE orders SET
          customer_id = ?,
          guest_name = ?, guest_phone = ?, guest_email = ?,
          order_type = ?, address = ?, entrance = ?, floor = ?, intercom = ?,
          building = ?, street = ?, apartment = ?,
          is_asap = ?, delivery_date = ?, delivery_time = ?, custom_time = ?,
          payment = ?, comment = ?, items = ?, total_amount = ?, status = ?,
          created_at = ?`;
      
      let updateParams = [
        frontpadCustomerId,
        guest_name, guest_phone, guest_email || null,
        order_type || 'delivery', address || null, entrance || null, floor || null, intercom || null,
        building || null, street || null, apartment || null,
        is_asap ? 1 : 0, delivery_date || null, delivery_time || null, custom_time || null,
        payment || 'cash', comment || null, JSON.stringify(items), total_amount, status || 'новый',
        created_at || new Date().toISOString()
      ];
      
      // Если point_id передан - добавляем в обновление
      if (point_id !== undefined) {
        updateQuery += `, point_id = ?`;
        updateParams.push(parseInt(point_id));
      }
      
      updateQuery += ` WHERE site_order_id = ?`;
      updateParams.push(order_id);
      
      await run(updateQuery, updateParams);
      
      const updatedOrder = await get('SELECT * FROM orders WHERE site_order_id = ?', [order_id]);
      // Проверяем тип данных перед парсингом - MySQL уже может вернуть объект
      if (updatedOrder.items && typeof updatedOrder.items === 'string') {
        updatedOrder.items = JSON.parse(updatedOrder.items);
      }
      
      // Отправляем уведомление об обновлении
      broadcast({ type: 'order_updated', order: updatedOrder });
      
      res.json({ message: 'Заказ обновлён', order: updatedOrder });
    } else {
      // Создаём новый заказ
      // ВАЖНО: находим или создаём клиента по guest_phone, чтобы избежать ошибки foreign key
      let frontpadCustomerId = null;
      if (guest_phone) {
        // Ищем клиента по телефону
        let customer = await get('SELECT id FROM customers WHERE phone = ?', [guest_phone]);
        if (!customer) {
          // Создаём нового клиента
          const result = await run(
            'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
            [guest_name || 'Клиент', guest_phone, guest_email || null, address || null]
          );
          frontpadCustomerId = result.lastID;
        } else {
          frontpadCustomerId = customer.id;
        }
      }
      
      const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      
      const result = await run(`
        INSERT INTO orders
        (site_order_id, order_number, customer_id, guest_name, guest_phone, guest_email,
         order_type, address, entrance, floor, intercom,
         building, street, apartment,
         is_asap, delivery_date, delivery_time, custom_time,
         payment, comment, items, total_amount, status, created_at, point_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order_id, order_number, frontpadCustomerId, guest_name, guest_phone, guest_email || null,
        order_type || 'delivery', address || null, entrance || null, floor || null, intercom || null,
        building || null, street || null, apartment || null,
        is_asap ? 1 : 0, delivery_date || null, delivery_time || null, custom_time || null,
        payment || 'cash', comment || null, JSON.stringify(items), total_amount, status || 'новый',
        created_at || moscowTime, orderPointId
      ]);
      
      const order = await get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
      // Проверяем тип данных перед парсингом - MySQL уже может вернуть объект
      order.items = parseOrderItems(order.items);
      
      // Отправляем уведомление о новом заказе через WebSocket
      console.log(`[NEW_ORDER] Заказ ${order_number} синхронизирован с сайта, отправлен broadcast new_order`);
      console.log(`[AUTO_PRINT] Автоматическая печать чека для синхронизированного заказа #${order.id}`);
      
      // Проверяем настройку автопечати
      const autoPrintSetting = await get('SELECT value FROM settings WHERE \`key\` = ?', ['auto_print_mode']);
      const serverPrintEnabled = await get('SELECT value FROM settings WHERE \`key\` = ?', ['server_print_enabled']);
      const autoPrintMode = autoPrintSetting?.value || 'browser'; // 'browser' или 'server'
      const isServerPrintEnabled = serverPrintEnabled?.value === 'true' || process.env.SERVER_PRINT_ENABLED === 'true';
      
      console.log(`[AUTO_PRINT] Режим автопечати: ${autoPrintMode}, Серверная печать: ${isServerPrintEnabled}`);
      
      // Серверная печать (если настроено)
      if (autoPrintMode === 'server' && isServerPrintEnabled) {
        console.log(`[SERVER_PRINT] Запуск серверной печати для заказа #${order.id}`);
        const receiptSettings = await getReceiptSettings();
        const receiptHTML = generateReceiptHTML(order, order.items, receiptSettings);
        const printResult = printReceiptSync(receiptHTML, order.id, true); // forceEnabled = true
        console.log(`[SERVER_PRINT] Результат:`, printResult);
        broadcast({ type: 'new_order', order, autoPrint: true, serverPrintResult: printResult });
      } else {
        // Браузерная печать (обычная)
        broadcast({ type: 'new_order', order, autoPrint: true });
      }
      
      res.json({ message: 'Заказ создан', order });
    }
  } catch (err) {
    console.error('Ошибка синхронизации заказа:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ СИНХРОНИЗАЦИОННЫЕ ENDPOINTS ============

// Синхронизация сообщений с основного сайта
app.post('/api/site/messages/sync', async (req, res) => {
  const {
    message_id, sender_id, customer_name, customer_phone,
    content, is_admin, timestamp, cart_data, cart_total
  } = req.body;
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = SITE_SYNC_TOKEN;
    
    if (syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Найти или создать чат для этого клиента
    let chat = await get('SELECT * FROM chats WHERE customer_id = ?', [sender_id]);
    
    if (!chat) {
      const result = await run(
        `INSERT INTO chats (customer_id, customer_name, customer_phone, last_message, last_message_at, unread_count, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [sender_id, customer_name || 'Клиент', customer_phone || '', content || '', timestamp || new Date().toISOString(), is_admin ? 0 : 1]
      );
      chat = await get('SELECT * FROM chats WHERE id = ?', [result.lastID]);
    } else {
      // Обновить последнее сообщение, имя и телефон клиента
      await run(
        `UPDATE chats SET customer_name = ?, customer_phone = ?, last_message = ?, last_message_at = ?, unread_count = ? WHERE id = ?`,
        [customer_name || chat.customer_name, customer_phone || chat.customer_phone, content || '', timestamp || new Date().toISOString(), is_admin ? 0 : 1, chat.id]
      );
    }
    
    // Сохранить сообщение
    const messageResult = await run(
      `INSERT INTO chat_messages (chat_id, message, sender, sender_name, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [chat.id, content || '', is_admin ? 'admin' : 'customer', is_admin ? 'Администратор' : (customer_name || 'Клиент'), timestamp || new Date().toISOString()]
    );
    
    // Если сообщение от клиента (не от админа), отправляем уведомление через WebSocket
    if (!is_admin) {
      broadcast({
        type: 'new_message',
        chat_id: chat.id,
        customer_id: sender_id,
        customer_name: customer_name || 'Клиент',
        customer_phone: customer_phone || '',
        message: content || '',
        cart_data: cart_data ? JSON.parse(cart_data) : null,
        cart_total: cart_total || 0,
        timestamp: timestamp || new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      chat_id: chat.id,
      message_id: messageResult.lastID
    });
  } catch (err) {
    console.error('Ошибка синхронизации сообщения:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для обновления статуса чата в YounitiPad (когда админ отвечает)
app.post('/api/site/chats/update', async (req, res) => {
  const { customer_id, status } = req.body;
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = SITE_SYNC_TOKEN;
    
    if (syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    await run('UPDATE chats SET status = ? WHERE customer_id = ?', [status || 'closed', customer_id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DELIVERY ZONES SYNC FOR MAIN SITE ============

// Endpoint for main site to fetch delivery zones (public with sync token)
app.get('/api/site/delivery-zones', async (req, res) => {
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = SITE_SYNC_TOKEN;
    
    // Allow access if sync token matches OR if no token is required (for development)
    if (syncToken && syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    const zones = await all('SELECT id, name, min_order_amount, delivery_price, is_active, sort_order, point_id FROM delivery_zones WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
    res.json(zones || []);
  } catch (err) {
    console.error('Error fetching delivery zones for site:', err.message);
    res.json([]);
  }
});

// ============ СИНХРОНИЗАЦИЯ КАТЕГОРИЙ ============

// Синхронизация категорий с основного сайта
app.post('/api/categories/sync-from-site', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Нет категорий для синхронизации' });
    }
    let synced = 0;
    for (const cat of categories) {
      const existing = await get('SELECT * FROM categories WHERE id = ?', [cat.id]);
      if (existing) {
        await run('UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?',
          [cat.name, cat.slug, cat.sort_order || 0, cat.id]);
      } else {
        await run('INSERT INTO categories (id, name, slug, sort_order) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.slug, cat.sort_order || 0]);
      }
      synced++;
    }
    res.json({ success: true, synced });
  } catch (error) {
    console.error('Ошибка sync-from-site:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DEBUG ENDPOINTS ============

// Debug endpoint to list all unique statuses in orders table
app.get('/api/debug/order-statuses', async (req, res) => {
  try {
    const dbType = getDbType();
    let query;
    if (dbType === 'mysql') {
      query = `SELECT DISTINCT status FROM orders ORDER BY status`;
    } else {
      query = `SELECT DISTINCT status FROM orders ORDER BY status`;
    }
    const statuses = await all(query);
    console.log('[/api/debug/order-statuses] Found statuses:', statuses);
    res.json({ statuses: statuses.map(s => s.status) });
  } catch (err) {
    console.error('[/api/debug/order-statuses] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ SPA FALLBACK ============

// Явный маршрут для статических файлов
app.use('/static', express.static(staticPath));

// SPA маршрут для index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../static/index.html'));
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes, uploads and static
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/static')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../../static/index.html'));
});

// ============ ГЛОБАЛЬНЫЙ ERROR HANDLER ============

// Необработанные ошибки - не крашим сервер
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

server.listen(PORT, () => {
  console.log(`YounitiPad Server запущен на порту ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
