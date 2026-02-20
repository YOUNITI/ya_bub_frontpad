// Миграция: добавляем колонку building в таблицу orders
const sqlite3 = require('sqlite3').verbose();

const dbPath = 'c:/Project/ya_budu/yabudu.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
    process.exit(1);
  }
  console.log('Подключение к БД установлено');
  
  // Добавляем колонку building
  db.run(`ALTER TABLE orders ADD COLUMN building TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Колонка building уже существует в orders');
      } else {
        console.error('Ошибка добавления building:', err.message);
      }
    } else {
      console.log('Колонка building добавлена в orders');
    }
    
    db.close((err) => {
      if (err) console.error('Ошибка закрытия БД:', err.message);
      else console.log('БД закрыта');
    });
  });
});
