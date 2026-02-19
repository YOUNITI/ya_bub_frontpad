const sqlite3 = require('sqlite3').verbose();

// Check local SQLite database
const db = new sqlite3.Database('./var/www/ya_budu/ya_budu/yabudu.db');
db.all('SELECT * FROM sizes LIMIT 5', [], (err, rows) => {
  if (err) console.error('Local DB error:', err);
  else console.log('Local yabudu.db sizes:', JSON.stringify(rows, null, 2));
  db.close();
});
