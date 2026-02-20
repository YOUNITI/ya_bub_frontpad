// Скрипт миграции данных из старой базы в новую
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldDbPath = path.join(__dirname, '../../../../../../var/www/ya_budu/yabudu.db');
const newDbPath = path.join(__dirname, 'yabudu.db');

console.log('Старая БД:', oldDbPath);
console.log('Новая БД:', newDbPath);

const oldDb = new sqlite3.Database(oldDbPath);
const newDb = new sqlite3.Database(newDbPath);

// Получаем список таблиц из старой базы
oldDb.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Ошибка получения таблиц:', err);
    oldDb.close();
    newDb.close();
    return;
  }
  
  console.log('Таблицы в старой базе:');
  tables.forEach(t => console.log(' - ' + t.name));
  
  // Проверяем есть ли категории
  if (tables.find(t => t.name === 'categories')) {
    oldDb.all("SELECT * FROM categories", [], (err, categories) => {
      console.log('\nКатегории в старой базе:', categories.length);
      if (categories.length > 0) {
        console.log('Первая категория:', JSON.stringify(categories[0], null, 2));
      }
      
      // Вставляем категории в новую базу
      if (categories.length > 0) {
        const stmt = newDb.prepare("INSERT INTO categories (id, name, description, image_url, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        categories.forEach(cat => {
          stmt.run([
            cat.id,
            cat.name || '',
            cat.description || '',
            cat.image_url || cat.image || '',
            cat.is_active !== 0 ? 1 : 0,
            cat.sort_order || 0,
            cat.created_at || new Date().toISOString(),
            cat.updated_at || new Date().toISOString()
          ], (err) => {
            if (err) console.error('Ошибка вставки категории:', err);
          });
        });
        
        stmt.finalize(() => {
          console.log('Категории перенесены!');
          
          // Теперь переносим товары
          if (tables.find(t => t.name === 'products')) {
            oldDb.all("SELECT * FROM products", [], (err, products) => {
              console.log('\nТовары в старой базе:', products.length);
              if (products.length > 0) {
                console.log('Первый товар:', JSON.stringify(products[0], null, 2));
              }
              
              if (products.length > 0) {
                const prodStmt = newDb.prepare("INSERT INTO products (id, category_id, name, description, price, image_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                products.forEach(prod => {
                  prodStmt.run([
                    prod.id,
                    prod.category_id,
                    prod.name || '',
                    prod.description || '',
                    prod.price || 0,
                    prod.image_url || prod.image || '',
                    prod.is_active !== 0 ? 1 : 0,
                    prod.created_at || new Date().toISOString(),
                    prod.updated_at || new Date().toISOString()
                  ], (err) => {
                    if (err) console.error('Ошибка вставки товара:', err);
                  });
                });
                
                prodStmt.finalize(() => {
                  console.log('Товары перенесены!');
                  oldDb.close();
                  newDb.close();
                });
              } else {
                oldDb.close();
                newDb.close();
              }
            });
          } else {
            oldDb.close();
            newDb.close();
          }
        });
      } else {
        oldDb.close();
        newDb.close();
      }
    });
  } else {
    console.log('Таблица categories не найдена');
    oldDb.close();
    newDb.close();
  }
});
