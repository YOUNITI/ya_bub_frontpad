/**
 * Миграция для добавления таблиц размеров, допов и скидок к товарам
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Правильный путь к базе
const dbPath = 'c:/Project/ya_budu/yabudu.db';
console.log('Путь к базе:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка открытия БД:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('Начало миграции...');
  
  // Проверяем какие таблицы уже есть
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Ошибка получения списка таблиц:', err.message);
      return;
    }
    console.log('Существующие таблицы:', tables.map(t => t.name).join(', '));
  });
  
  // 1. Создаём таблицу addon_templates
  db.run(`CREATE TABLE IF NOT EXISTS addon_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    default_price REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания addon_templates:', err.message);
    } else {
      console.log('Таблица addon_templates создана/уже существует');
    }
  });
  
  // 2. Создаём таблицу product_addons
  db.run(`CREATE TABLE IF NOT EXISTS product_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    addon_template_id INTEGER NOT NULL,
    custom_price REAL,
    sort_order INTEGER DEFAULT 0,
    is_required INTEGER DEFAULT 0,
    min_select INTEGER DEFAULT 0,
    max_select INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id) ON DELETE CASCADE,
    UNIQUE(product_id, addon_template_id)
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания product_addons:', err.message);
    } else {
      console.log('Таблица product_addons создана/уже существует');
    }
  });
  
  // 3. Создаём таблицу product_discounts
  db.run(`CREATE TABLE IF NOT EXISTS product_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'percent',
    value REAL NOT NULL,
    min_order_amount REAL DEFAULT 0,
    max_discount_amount REAL,
    code TEXT,
    is_active INTEGER DEFAULT 1,
    valid_from TEXT,
    valid_to TEXT,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания product_discounts:', err.message);
    } else {
      console.log('Таблица product_discounts создана/уже существует');
    }
  });
  
  // 4. Создаём таблицу sizes
  db.run(`CREATE TABLE IF NOT EXISTS sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price_modifier REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Ошибка создания sizes:', err.message);
    } else {
      console.log('Таблица sizes создана/уже существует');
    }
  });
  
  // 5. Добавляем колонки в products
  const colsToAdd = [
    { name: 'is_active', type: 'INTEGER DEFAULT 1' },
    { name: 'is_hidden', type: 'INTEGER DEFAULT 0' },
    { name: 'discount_price', type: 'REAL' },
    { name: 'sort_order', type: 'INTEGER DEFAULT 0' }
  ];
  
  db.all("PRAGMA table_info(products)", (err, columns) => {
    if (err) {
      console.error('Ошибка проверки products:', err.message);
      return;
    }
    
    const colNames = columns.map(c => c.name);
    console.log('Колонки products:', colNames.join(', '));
    
    colsToAdd.forEach(col => {
      if (!colNames.includes(col.name)) {
        console.log(`Добавление колонки ${col.name}...`);
        db.run(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`Ошибка добавления ${col.name}:`, err.message);
          } else {
            console.log(`Колонка ${col.name} добавлена`);
          }
        });
      } else {
        console.log(`Колонка ${col.name} уже существует`);
      }
    });
  });
});

// Завершаем через 2 секунды
setTimeout(() => {
  console.log('\nМиграция завершена!');
  
  db.close(() => {
    console.log('Соединение с БД закрыто');
    process.exit(0);
  });
}, 2000);
