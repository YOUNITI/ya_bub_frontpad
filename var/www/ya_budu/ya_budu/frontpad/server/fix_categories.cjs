/**
 * Скрипт исправления структуры БД
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../yabudu.db');
console.log('БД:', dbPath);

const db = new sqlite3.Database(dbPath);

db.on('error', (err) => {
  console.error('DB Error:', err.message);
});

db.serialize(() => {
  // Проверяем структуру categories
  db.all("PRAGMA table_info(categories)", (err, columns) => {
    if (err) {
      console.error('Ошибка получения структуры categories:', err.message);
      return;
    }
    
    console.log('Колонки categories:', columns.map(c => c.name).join(', '));
    
    const hasSortOrder = columns.find(c => c.name === 'sort_order');
    const hasSlug = columns.find(c => c.name === 'slug');
    
    if (!hasSortOrder) {
      console.log('Добавляем sort_order...');
      db.run('ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0', (err) => {
        if (err) console.error('Ошибка добавления sort_order:', err.message);
        else console.log('sort_order добавлен');
      });
    } else {
      console.log('sort_order уже есть');
    }
    
    if (!hasSlug) {
      console.log('Добавляем slug...');
      db.run('ALTER TABLE categories ADD COLUMN slug TEXT', (err) => {
        if (err) console.error('Ошибка добавления slug:', err.message);
        else console.log('slug добавлен');
      });
    } else {
      console.log('slug уже есть');
    }
  });
  
  // Проверяем структуру products
  db.all("PRAGMA table_info(products)", (err, columns) => {
    if (err) {
      console.error('Ошибка получения структуры products:', err.message);
      return;
    }
    
    console.log('Колонки products:', columns.map(c => c.name).join(', '));
    
    const cols = [
      { name: 'is_active', type: 'INTEGER DEFAULT 1' },
      { name: 'is_hidden', type: 'INTEGER DEFAULT 0' },
      { name: 'discount_price', type: 'REAL DEFAULT 0' },
      { name: 'sort_order', type: 'INTEGER DEFAULT 0' },
      { name: 'is_combo', type: 'INTEGER DEFAULT 0' }
    ];
    
    cols.forEach(col => {
      const exists = columns.find(c => c.name === col.name);
      if (!exists) {
        console.log(`Добавляем ${col.name}...`);
        db.run(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error(`Ошибка добавления ${col.name}:`, err.message);
          } else {
            console.log(`${col.name} добавлен`);
          }
        });
      } else {
        console.log(`${col.name} уже есть`);
      }
    });
  });
  
  // Проверяем recipes
  db.all("PRAGMA table_info(recipes)", (err, columns) => {
    if (err) {
      console.error('Ошибка получения структуры recipes:', err.message);
      return;
    }
    
    const hasUnit = columns.find(c => c.name === 'unit');
    if (!hasUnit) {
      console.log('Добавляем unit в recipes...');
      db.run('ALTER TABLE recipes ADD COLUMN unit TEXT DEFAULT "шт"', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Ошибка добавления unit:', err.message);
        } else {
          console.log('unit добавлен в recipes');
        }
      });
    } else {
      console.log('unit уже есть в recipes');
    }
  });
});

setTimeout(() => {
  console.log('Закрываем соединение...');
  db.close((err) => {
    if (err) console.error('Ошибка закрытия:', err.message);
    else console.log('Готово!');
    process.exit(0);
  });
}, 2000);
