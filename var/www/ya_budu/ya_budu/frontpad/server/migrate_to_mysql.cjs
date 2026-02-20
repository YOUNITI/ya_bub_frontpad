// Скрипт миграции данных из SQLite в MySQL (CommonJS)
// База SQLite: ../../yabudu.db (относительно var/www/ya_budu/ya_budu/frontpad/server)

const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

const sqliteDb = new sqlite3.Database('../../yabudu.db');

const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456',
  database: 'yabudu_frontpad'
};

async function migrate() {
  const pool = mysql.createPool(mysqlConfig);
  
  console.log('Начало миграции данных...\n');
  
  // Функция для вставки данных
  function insertTable(sqliteTable, mysqlTable, fields) {
    return new Promise((resolve) => {
      sqliteDb.all(`SELECT * FROM ${sqliteTable}`, [], async (err, rows) => {
        if (err) { 
          console.error(`Ошибка чтения ${sqliteTable}:`, err.message); 
          resolve(0); 
          return; 
        }
        
        if (!rows || rows.length === 0) {
          console.log(`  ${sqliteTable}: нет данных`);
          resolve(0);
          return;
        }
        
        let count = 0;
        for (const row of rows) {
          try {
            // Извлекаем только нужные поля из SQLite строки
            const data = {};
            for (const [sqliteField, mysqlField, defaultValue] of fields) {
              let val = row[sqliteField];
              if (val === undefined || val === null) {
                val = defaultValue !== undefined ? defaultValue : null;
              }
              data[mysqlField] = val;
            }
            
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            
            await pool.execute(
              `INSERT IGNORE INTO ${mysqlTable} (${keys.join(', ')}) VALUES (${placeholders})`,
              values
            );
            count++;
          } catch (e) {
            // Пропускаем дубликаты или ошибки
          }
        }
        console.log(`  ${sqliteTable} -> ${mysqlTable}: ${count} записей`);
        resolve(count);
      });
    });
  }
  
  // Categories
  await insertTable('categories', 'categories', [
    ['id', 'id'],
    ['name', 'name'],
    ['slug', 'slug'],
    ['sort_order', 'sort_order', 0],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Products (соответствие полей SQLite -> MySQL)
  await insertTable('products', 'products', [
    ['id', 'id'],
    ['name', 'name'],
    ['description', 'description'],
    ['price', 'price'],
    ['category_id', 'category_id'],
    ['image_url', 'image_url'],
    ['is_active', 'is_active', 1],
    ['is_hidden', 'is_hidden', 0],
    ['discount_price', 'discount_price'],
    ['sort_order', 'sort_order', 0],
    ['is_combo', 'is_combo', 0],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Customers (SQLite: id, name, email, phone, address, comment, created_at)
  // MySQL: id, name, phone, address, total_orders, total_spent, created_at, updated_at
  await insertTable('customers', 'customers', [
    ['id', 'id'],
    ['name', 'name'],
    ['phone', 'phone'],
    ['address', 'address'],
    ['total_orders', 'total_orders', 0],
    ['total_spent', 'total_spent', 0],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Orders
  await insertTable('orders', 'orders', [
    ['id', 'id'],
    ['site_order_id', 'site_order_id'],
    ['order_number', 'order_number'],
    ['guest_name', 'guest_name'],
    ['guest_phone', 'guest_phone'],
    ['guest_email', 'guest_email'],
    ['order_type', 'order_type'],
    ['address', 'address'],
    ['street', 'street'],
    ['building', 'building'],
    ['apartment', 'apartment'],
    ['entrance', 'entrance'],
    ['floor', 'floor'],
    ['intercom', 'intercom'],
    ['is_asap', 'is_asap'],
    ['delivery_date', 'delivery_date'],
    ['delivery_time', 'delivery_time'],
    ['custom_time', 'custom_time'],
    ['payment', 'payment'],
    ['comment', 'comment'],
    ['items', 'items'],
    ['total_amount', 'total_amount'],
    ['discount_amount', 'discount_amount', 0],
    ['discount_reason', 'discount_reason', ''],
    ['status', 'status', 'pending'],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Ingredients
  await insertTable('ingredients', 'ingredients', [
    ['id', 'id'],
    ['name', 'name'],
    ['unit', 'unit'],
    ['current_quantity', 'current_quantity', 0],
    ['min_quantity', 'min_quantity', 0],
    ['cost_per_unit', 'cost_per_unit', 0],
    ['supplier', 'supplier'],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Addon templates
  await insertTable('addon_templates', 'addon_templates', [
    ['id', 'id'],
    ['name', 'name'],
    ['description', 'description'],
    ['default_price', 'default_price', 0],
    ['sort_order', 'sort_order', 0],
    ['unit', 'unit', 'шт'],
    ['is_active', 'is_active', 1],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Discounts
  await insertTable('discounts', 'discounts', [
    ['id', 'id'],
    ['name', 'name'],
    ['description', 'description'],
    ['type', 'type'],
    ['value', 'value'],
    ['min_order_amount', 'min_order_amount'],
    ['max_discount_amount', 'max_discount_amount'],
    ['code', 'code'],
    ['valid_from', 'valid_from'],
    ['valid_to', 'valid_to'],
    ['usage_limit', 'usage_limit'],
    ['is_active', 'is_active', 1],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Sizes
  await insertTable('sizes', 'sizes', [
    ['id', 'id'],
    ['product_id', 'product_id'],
    ['name', 'name'],
    ['size_value', 'size_value'],
    ['price', 'price', 0],
    ['sort_order', 'sort_order', 0],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Recipes
  await insertTable('recipes', 'recipes', [
    ['id', 'id'],
    ['product_id', 'product_id'],
    ['ingredient_id', 'ingredient_id'],
    ['quantity', 'quantity', 1],
    ['unit', 'unit', 'шт'],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  // Settings
  await insertTable('settings', 'settings', [
    ['id', 'id'],
    ['setting_key', 'setting_key'],
    ['setting_value', 'setting_value'],
    ['created_at', 'created_at', new Date().toISOString()]
  ]);
  
  console.log('\nМиграция завершена!');
  
  // Проверка
  console.log('\nПроверка данных в MySQL:');
  const tables = ['categories', 'products', 'customers', 'orders', 'ingredients', 'addon_templates', 'discounts', 'sizes', 'recipes'];
  for (const table of tables) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) as c FROM ${table}`);
      console.log(`  ${table}: ${rows[0].c} записей`);
    } catch(e) {
      console.log(`  ${table}: ошибка - ${e.message}`);
    }
  }
  
  await pool.end();
  sqliteDb.close();
}

migrate().catch(console.error);
