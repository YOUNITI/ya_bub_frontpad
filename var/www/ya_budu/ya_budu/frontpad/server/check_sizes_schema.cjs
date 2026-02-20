const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./yabudu.db');

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  console.log('Tables:', tables.map(t => t.name).join(', '));
  
  // Check sizes table
  db.all('PRAGMA table_info(sizes)', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
      db.close();
      return;
    }
    if (rows.length === 0) {
      console.log('sizes table does not exist or is empty');
    } else {
      console.log('Columns in sizes table:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type}`);
      });
    }
    db.close();
  });
});
