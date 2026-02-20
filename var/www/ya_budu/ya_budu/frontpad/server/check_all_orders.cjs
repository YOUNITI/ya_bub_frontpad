const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../yabudu.db');

db.serialize(() => {
  // Сначала проверим структуру таблицы orders
  db.all(`PRAGMA table_info(orders)`, (err, columns) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log('Колонки в таблице orders:');
    columns.forEach(c => console.log(`- ${c.name} (${c.type})`));

    // Проверяем все заказы в yabudu.db
    db.all(`SELECT id, order_number, created_at, status, total_amount FROM orders ORDER BY created_at DESC LIMIT 50`, (err, orders) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      console.log(`\nВсего заказов в yabudu.db: ${orders.length}`);
      console.log('\nПоследние заказы:');
      orders.forEach(o => console.log(`ID: ${o.id}, #${o.order_number}, created: ${o.created_at}, status: ${o.status}, total: ${o.total_amount}`));

      db.close();
    });
  });
});
