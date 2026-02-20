const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('frontpad.db');

db.serialize(() => {
  // Проверяем все заказы
  db.all(`SELECT id, created_at, status FROM orders ORDER BY created_at DESC`, (err, orders) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log(`Всего заказов в базе: ${orders.length}`);
    console.log('\nВсе заказы:');
    orders.forEach(o => console.log(`ID: ${o.id}, created_at: ${o.created_at}, status: ${o.status}`));

    // Проверяем заказ с максимальным ID
    db.get(`SELECT MAX(id) as maxId FROM orders`, (err, result) => {
      console.log(`\nМаксимальный ID заказа: ${result?.maxId}`);
      db.close();
    });
  });
});
