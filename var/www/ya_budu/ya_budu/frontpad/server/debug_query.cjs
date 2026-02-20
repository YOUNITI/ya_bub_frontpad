const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), '../../yabudu.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Проверка запроса для preorder-dates ===\n');

// Проверим все статусы
db.all("SELECT DISTINCT status FROM orders", [], (err, statuses) => {
  console.log('Все статусы в базе:', statuses);

  // Проверим что возвращает наш запрос
  const query = `
    SELECT DISTINCT delivery_date, COUNT(*) as order_count
    FROM orders
    WHERE delivery_date IS NOT NULL
      AND delivery_date != ''
      AND status NOT IN ('delivered', 'cancelled')
    GROUP BY delivery_date
    ORDER BY delivery_date ASC
  `;
  console.log('\nSQL:', query);

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Ошибка:', err.message);
      return;
    }
    console.log('Результат:', rows);

    // Проверим все заказы с их статусами
    db.all("SELECT id, status, delivery_date FROM orders", [], (err, allOrders) => {
      console.log('\nВсе заказы:');
      allOrders.forEach(o => {
        console.log(`  #${o.id}: status=${o.status}, delivery_date=${o.delivery_date || 'NULL'}`);
      });
      db.close();
    });
  });
});
