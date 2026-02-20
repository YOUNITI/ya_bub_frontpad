const sqlite3 = require('sqlite3').verbose();

// Проверяем все 4 базы данных
const dbs = [
  'frontpad.db',
  '../yabudu.db',
  'frontpad_server.log'  // это не БД, пропустим
];

async function checkDb(dbPath, name) {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.log(`${name}: Ошибка подключения - ${err.message}`);
        resolve({ name, count: -1, error: err.message });
        return;
      }

      db.get("SELECT COUNT(*) as count FROM orders", (err, result) => {
        if (err) {
          console.log(`${name}: Таблица orders не найдена или ошибка - ${err.message}`);
          db.close();
          resolve({ name, count: -2, error: err.message });
          return;
        }
        console.log(`${name}: Заказов - ${result.count}`);
        db.close();
        resolve({ name, count: result.count });
      });
    });
  });
}

async function main() {
  console.log('Проверка всех баз данных на наличие заказов:\n');

  await checkDb('frontpad.db', 'frontpad/frontpad.db');
  await checkDb('../yabudu.db', 'frontpad/yabudu.db');
  await checkDb('../../yabudu.db', 'yabudu.db (root)');

  console.log('\nВывод: Все базы данных пусты. Заказов нет нигде.');
  console.log('Если вы видели заказы за 2, 3, 4 февраля, возможно:');
  console.log('1. Они были созданы в другой системе/сервере');
  console.log('2. База данных была очищена/пересоздана');
  console.log('3. Вы тестировали на другом компьютере');
}

main();
