import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('c:/Project/ya_budu/yabudu.db');
import moment from 'moment';

console.log('Updating orders with Moscow timezone...\n');

db.all("SELECT id, created_at FROM orders", async (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  
  let updated = 0;
  for (const row of rows) {
    // Parse the existing UTC timestamp and convert to Moscow time
    const utcDate = new Date(row.created_at);
    const moscowDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours for Moscow
    
    const year = moscowDate.getFullYear();
    const month = String(moscowDate.getMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getDate()).padStart(2, '0');
    const hours = String(moscowDate.getHours()).padStart(2, '0');
    const minutes = String(moscowDate.getMinutes()).padStart(2, '0');
    const seconds = String(moscowDate.getSeconds()).padStart(2, '0');
    
    const moscowTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    await new Promise((resolve, reject) => {
      db.run("UPDATE orders SET created_at = ? WHERE id = ?", [moscowTimestamp, row.id], function(err) {
        if (err) {
          console.error('Error updating order', row.id, ':', err.message);
        } else {
          console.log(`Order ${row.id}: ${row.created_at} -> ${moscowTimestamp}`);
          updated++;
        }
        resolve();
      });
    });
  }
  
  console.log(`\nTotal updated: ${updated}`);
  db.close();
});
