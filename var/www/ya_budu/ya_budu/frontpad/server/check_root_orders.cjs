const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../yabudu.db');

db.serialize(() => {
  // Проверяем структуру таблицы orders
  db.all(`PRAGMA table_info(orders)`, (err, columns) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log('Колонки в таблице orders (root yabudu.db):');
    columns.forEach(c => console.log(`- ${c.name} (${c.type})`));

    // Проверяем все заказы
    db.all(`SELECT id, order_number, created_at, status, total_amount FROM orders ORDER BY created_at DESC`, (err, orders) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      console.log(`\nВсего заказов в yabudu.db (root): ${orders.length}`);
      console.log('\nПоследние 10 заказов:');
      orders.slice(0, 10).forEach(o => console.log(`ID: ${o.id}, #${o.order_number || 'NULL'}, created: ${o.created_at}, status: ${o.status}, total: ${o.total_amount}`));

      // Проверяем заказы за последние дни
      console.log('\nЗаказы по датам:');
      const ordersByDate = {};
      orders.forEach(o => {
        const date = o.created_at ? o.created_at.split(' ')[0] : 'unknown';
        ordersByDate[date] = (ordersByDate[date] || 0) + 1;
      });
      Object.entries(ordersByDate).sort((a, b) => b[0].localeCompare(a[0])).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} заказов`);
      });

      db.close();
    });
  });
});
