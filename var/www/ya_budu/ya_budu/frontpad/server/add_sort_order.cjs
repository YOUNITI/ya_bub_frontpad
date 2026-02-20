const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Попробуем разные пути к базе
const possiblePaths = [
  path.join(__dirname, '../../../yabudu.db'),
  path.join(__dirname, '../../yabudu.db'),
  path.join(__dirname, '../../yabudu.db'),
  '/var/www/ya_budu/yabudu.db',
  '/var/www/ya_budu/ya_budu/yabudu.db'
];

let dbPath = null;
for (const p of possiblePaths) {
  try {
    const fs = require('fs');
    if (fs.existsSync(p)) {
      dbPath = p;
      console.log('Найдена база:', p);
      break;
    }
  } catch (e) {}
}

if (!dbPath) {
  console.error('База данных не найдена!');
  console.log('Попробованные пути:', possiblePaths);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе:', err);
    process.exit(1);
  }
  console.log('Подключено к базе:', dbPath);
});

// Сначала создаём таблицы если их нет
db.serialize(() => {
  // Создаём таблицу categories
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка создания categories:', err.message);
    else console.log('Таблица categories готова');
  });

  // Создаём таблицу products
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0,
    image_url TEXT,
    category_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_combo INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания products:', err.message);
    else console.log('Таблица products готова');
  });

  // Добавляем колонку sort_order если таблицы уже существуют
  db.run(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления sort_order в categories:', err.message);
    } else if (!err.message) {
      console.log('Колонка sort_order добавлена в categories');
    }
  });

  db.run(`ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Ошибка добавления sort_order в products:', err.message);
    } else if (!err.message) {
      console.log('Колонка sort_order добавлена в products');
    }
  });
});

// Обновляем существующие записи
setTimeout(() => {
  db.all(`SELECT id, created_at FROM categories ORDER BY created_at ASC`, [], (err, categories) => {
    if (err) {
      console.error('Ошибка получения категорий:', err.message);
    } else if (categories.length > 0) {
      let completed = 0;
      categories.forEach((cat, index) => {
        db.run(`UPDATE categories SET sort_order = ? WHERE id = ?`, [index, cat.id], (err) => {
          if (err) console.error('Ошибка обновления категории:', err.message);
          completed++;
          if (completed === categories.length) {
            console.log('Порядок категорий обновлён (всего:', categories.length, ')');
          }
        });
      });
    } else {
      console.log('Категории не найдены, пропускаем');
    }
    
    // Обновляем товары
    db.all(`SELECT id, created_at FROM products ORDER BY created_at ASC`, [], (err, products) => {
      if (err) {
        console.error('Ошибка получения товаров:', err.message);
      } else if (products.length > 0) {
        let completed = 0;
        products.forEach((prod, index) => {
          db.run(`UPDATE products SET sort_order = ? WHERE id = ?`, [index, prod.id], (err) => {
            if (err) console.error('Ошибка обновления товара:', err.message);
            completed++;
            if (completed === products.length) {
              console.log('Порядок товаров обновлён (всего:', products.length, ')');
            }
          });
        });
      } else {
        console.log('Товары не найдены, пропускаем');
      }
      
      // Завершаем
      setTimeout(() => {
        db.close((err) => {
          if (err) {
            console.error('Ошибка закрытия базы:', err);
          } else {
            console.log('Миграция завершена успешно!');
          }
        });
      }, 500);
    });
  });
}, 500);
