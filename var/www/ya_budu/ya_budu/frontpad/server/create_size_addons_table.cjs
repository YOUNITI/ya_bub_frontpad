/**
 * Скрипт миграции: создание таблицы size_addons
 * 
 * Запуск на сервере:
 * cd /var/www/ya_budu/ya_budu/frontpad/server
 * node create_size_addons_table.cjs
 * 
 * Или выполнить SQL команду напрямую в sqlite3:
 * sqlite3 yabudu.db "CREATE TABLE IF NOT EXISTS size_addons..."
 */

const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'yabudu.db');
const db = new sqlite3.Database(dbPath);

console.log('Создание таблицы size_addons...');

db.serialize(() => {
  // Создаём таблицу
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
    if (err) {
      console.error('Ошибка создания таблицы:', err.message);
      process.exit(1);
    }
    console.log('Таблица size_addons создана');
  });

  // Создаём индексы
  db.run(`CREATE INDEX IF NOT EXISTS idx_size_addons_size_id ON size_addons(size_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_size_addons_addon_id ON size_addons(addon_id)`);

  // Проверяем что таблица создана
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='size_addons'", (err, row) => {
    if (err) {
      console.error('Ошибка проверки таблицы:', err.message);
      process.exit(1);
    }
    if (row) {
      console.log('✓ Таблица size_addons успешно создана');
      console.log('Теперь можно добавлять допы к конкретным размерам товаров');
    } else {
      console.error('✗ Таблица size_addons не создана');
      process.exit(1);
    }
    db.close();
  });
});
