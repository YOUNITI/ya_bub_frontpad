const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./yabudu.db');

const schema = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  size_value TEXT,
  price_modifier REAL DEFAULT 0,
  price REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
`;

db.run(`CREATE TABLE IF NOT EXISTS sizes (${schema})`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('sizes table created successfully');
  }
  
  // Verify
  db.all('PRAGMA table_info(sizes)', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Columns in sizes table:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type}`);
      });
    }
    db.close();
  });
});
