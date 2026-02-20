// Скрипт для добавления колонки is_active в products
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../yabudu.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
    process.exit(1);
  }
  
  // Проверяем есть ли колонка is_active
  db.all("PRAGMA table_info(products)", (err, columns) => {
    if (err) {
      console.error('Ошибка получения информации о таблице:', err.message);
      process.exit(1);
    }
    
    const hasIsActive = columns.some(c => c.name === 'is_active');
    console.log('Колонки таблицы products:', columns.map(c => c.name));
    console.log('Есть is_active:', hasIsActive);
    
    if (!hasIsActive) {
      console.log('Добавляем колонку is_active...');
      db.run("ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1", (err) => {
        if (err) {
          console.error('Ошибка добавления колонки:', err.message);
        } else {
          console.log('Колонка is_active добавлена успешно!');
        }
        db.close();
      });
    } else {
      console.log('Колонка is_active уже существует');
      db.close();
    }
  });
});
