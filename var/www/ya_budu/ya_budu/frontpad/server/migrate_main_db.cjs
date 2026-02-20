// Миграция данных из основной базы сайта в Frontpad
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const mainDbPath = 'C:/Project/archive_09022026_2115/var/www/ya_budu/ya_budu/yabudu.db';
const newDbPath = path.join(__dirname, 'yabudu.db');

console.log('Основная БД сайта:', mainDbPath);
console.log('Новая БД Frontpad:', newDbPath);

const mainDb = new sqlite3.Database(mainDbPath);
const newDb = new sqlite3.Database(newDbPath);

console.log('\n=== МИГРАЦИЯ КАТЕГОРИЙ ===');

// Миграция категорий
mainDb.all("SELECT * FROM categories", [], (err, categories) => {
  console.log(`Найдено категорий: ${categories.length}`);
  
  if (categories.length > 0) {
    const stmt = newDb.prepare("INSERT OR IGNORE INTO categories (id, name, slug, sort_order, created_at) VALUES (?, ?, ?, ?, ?)");
    
    categories.forEach(cat => {
      stmt.run([
        cat.id,
        cat.name || '',
        cat.slug || '',
        cat.sort_order || 0,
        cat.created_at || new Date().toISOString()
      ], (err) => {
        if (err) console.error('Ошибка категории:', err.message);
      });
    });
    
    stmt.finalize(() => {
      console.log('Категории перенесены!');
      
      console.log('\n=== МИГРАЦИЯ ТОВАРОВ ===');
      
      // Миграция товаров
      mainDb.all("SELECT * FROM products", [], (err, products) => {
        console.log(`Найдено товаров: ${products.length}`);
        
        if (products.length > 0) {
          const prodStmt = newDb.prepare("INSERT OR IGNORE INTO products (id, name, description, price, image_url, category_id, is_active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
          
          products.forEach(prod => {
            prodStmt.run([
              prod.id,
              prod.name || '',
              prod.description || '',
              prod.price || 0,
              prod.image_url || '',
              prod.category_id,
              prod.is_active !== 0 ? 1 : 0,
              prod.sort_order || 0,
              prod.created_at || new Date().toISOString()
            ], (err) => {
              if (err) console.error('Ошибка товара:', err.message);
            });
          });
          
          prodStmt.finalize(() => {
            console.log('Товары перенесены!');
            
            // Проверим результат
            newDb.all("SELECT COUNT(*) as cnt FROM categories", [], (err, r) => {
              console.log('\n=== РЕЗУЛЬТАТ ===');
              console.log('Категорий в новой БД:', r[0].cnt);
              newDb.all("SELECT COUNT(*) as cnt FROM products", [], (err, r) => {
                console.log('Товаров в новой БД:', r[0].cnt);
                mainDb.close();
                newDb.close();
              });
            });
          });
        } else {
          mainDb.close();
          newDb.close();
        }
      });
    });
  } else {
    console.log('Нет категорий для миграции');
    mainDb.close();
    newDb.close();
  }
});
