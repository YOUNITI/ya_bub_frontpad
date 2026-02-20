const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../yabudu.db');

db.serialize(() => {
  // Проверяем все таблицы
  db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log('Таблицы в yabudu.db:');
    tables.forEach(t => console.log(`- ${t.name}`));

    // Проверяем есть ли orders
    db.get(`SELECT COUNT(*) as count FROM orders`, (err, result) => {
      console.log(`\nЗаказов в yabudu.db: ${result.count}`);
      db.close();
    });
  });
});
