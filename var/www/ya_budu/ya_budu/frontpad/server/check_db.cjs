const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь который использует Frontpad сервер
const serverDbPath = path.join(process.cwd(), '../../yabudu.db');
console.log('Путь к базе Frontpad:', serverDbPath);

const db = new sqlite3.Database(serverDbPath);

db.all("SELECT id, guest_name, delivery_date, status FROM orders WHERE delivery_date IS NOT NULL AND delivery_date != ''", [], (err, rows) => {
  if (err) {
    console.error('Ошибка:', err.message);
    return;
  }

  console.log('Заказы с delivery_date в базе Frontpad:');
  if (rows.length === 0) {
    console.log('  Нет заказов с датой доставки');
  } else {
    rows.forEach(row => {
      console.log(`  #${row.id}: ${row.guest_name}, дата: ${row.delivery_date}, статус: ${row.status}`);
    });
  }

  db.close();
});
