/**
 * Исправленный скрипт миграции: создание таблицы size_addons
 * 
 * Проблема: старая таблица ссылалась на addons, а должна на addon_templates
 * 
 * Запуск на сервере:
 * cd /var/www/ya_budu/ya_budu/frontpad/server
 * node fix_size_addons_table.cjs
 */

const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'yabudu.db');
const db = new sqlite3.Database(dbPath);

console.log('Исправление таблицы size_addons...');

async function migrate() {
  try {
    // Удаляем старую таблицу если она есть
    await new Promise((resolve, reject) => {
      db.run(`DROP TABLE IF EXISTS size_addons`, (err) => {
        if (err) reject(err);
        else {
          console.log('Старая таблица size_addons удалена');
          resolve();
        }
      });
    });
    
    // Создаём таблицу заново с правильной ссылкой на addon_templates
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS size_addons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          size_id INTEGER NOT NULL,
          addon_id INTEGER NOT NULL,
          is_required INTEGER DEFAULT 0,
          price_modifier REAL DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE CASCADE,
          FOREIGN KEY (addon_id) REFERENCES addon_templates(id) ON DELETE CASCADE,
          UNIQUE(size_id, addon_id)
        )
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('Таблица size_addons создана');
          resolve();
        }
      });
    });

    // Создаём индексы
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_size_addons_size_id ON size_addons(size_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_size_addons_addon_id ON size_addons(addon_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Проверяем что таблица создана
    const row = await new Promise((resolve, reject) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='size_addons'", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (row) {
      console.log('✓ Таблица size_addons успешно создана');
      console.log('Теперь можно добавлять допы к конкретным размерам товаров');
    } else {
      console.error('✗ Таблица size_addons не создана');
      process.exit(1);
    }
    
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Ошибка миграции:', err.message);
    db.close();
    process.exit(1);
  }
}

migrate();
