const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'frontpad.db');
  
  // Читаем базу
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  const addons = [
    ['Дополнительный сыр', 30],
    ['Бекон', 40],
    ['Лук', 0],
    ['Огурец маринованный', 20],
    ['Халапеньо', 25],
    ['Грибы', 35],
    ['Чесночный соус', 15],
    ['Кетчуп', 0],
    ['Майонез', 0],
    ['Сырный соус', 30]
  ];
  
  for (const [name, price] of addons) {
    try {
      db.run('INSERT INTO addon_templates (name, default_price, is_active) VALUES (?, ?, 1)', [name, price]);
      console.log(`Добавлен: ${name}`);
    } catch (err) {
      console.error(`Ошибка добавления ${name}:`, err.message);
    }
  }
  
  // Сохраняем базу
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  
  console.log('\nГотово! Добавлено шаблонов допов:', addons.length);
}

main().catch(console.error);
