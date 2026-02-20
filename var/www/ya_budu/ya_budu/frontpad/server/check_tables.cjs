const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('frontpad.db');

db.serialize(() => {
  // Проверяем все таблицы
  db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log('Таблицы в базе данных:');
    tables.forEach(t => console.log(`- ${t.name}`));

    // Проверяем количество записей в каждой таблице
    console.log('\nКоличество записей:');
    tables.forEach(t => {
      db.get(`SELECT COUNT(*) as count FROM ${t.name}`, (err, result) => {
        if (!err) {
          console.log(`  ${t.name}: ${result.count}`);
        }
      });
    });

    setTimeout(() => db.close(), 100);
  });
});
