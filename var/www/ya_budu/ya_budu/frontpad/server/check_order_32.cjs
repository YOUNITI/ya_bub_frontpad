const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('frontpad.db');

db.serialize(() => {
  // Получаем последние 5 заказов
  db.all(`
    SELECT id, created_at, status
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
  `, (err, orders) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    console.log('Последние 5 заказов:');
    orders.forEach(o => console.log(`ID: ${o.id}, created_at: ${o.created_at}, status: ${o.status}`));

    // Проверяем заказ #32
    db.get('SELECT id, created_at, status FROM orders WHERE id = 32', (err, order32) => {
      console.log('\nЗаказ #32:', order32);

      // Проверяем все заказы за 6 февраля (сегодня в Москве)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log(`\nИщем заказы с ${today.toISOString()} по ${tomorrow.toISOString()}`);

      db.all(`
        SELECT id, created_at, status
        FROM orders
        WHERE created_at >= ? AND created_at < ?
        ORDER BY created_at DESC
      `, [today.toISOString(), tomorrow.toISOString()], (err, ordersToday) => {
        if (err) {
          console.error('Error:', err);
          db.close();
          return;
        }
        console.log(`\nЗаказы за сегодня:`);
        console.log('Количество:', ordersToday.length);
        ordersToday.forEach(o => console.log(`ID: ${o.id}, created_at: ${o.created_at}, status: ${o.status}`));
        db.close();
      });
    });
  });
});
