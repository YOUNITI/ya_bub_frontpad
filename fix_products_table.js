/**
 * Скрипт для проверки и исправления таблицы products в MySQL
 * Запустить: node fix_products_table.js
 */

import dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env
dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.FRONTPAD_DB_NAME || 'yabudu_frontpad'
};

async function fixProductsTable() {
  console.log('🔧 Начинаем проверку таблицы products...\n');
  console.log('Подключение к MySQL:', dbConfig.host, dbConfig.database);
  
  const pool = createPool(dbConfig);
  
  try {
    // Получаем структуру таблицы
    const [columns] = await pool.query('DESCRIBE products');
    console.log('\n📋 Текущие колонки таблицы products:');
    columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    // Проверяем нужные колонки
    const columnNames = columns.map(c => c.Field);
    
    const neededColumns = [
      { name: 'is_combo', sql: 'ADD COLUMN is_combo INT DEFAULT 0' },
      { name: 'combo_items', sql: 'ADD COLUMN combo_items TEXT' },
      { name: 'is_featured', sql: 'ADD COLUMN is_featured INT DEFAULT 0' }
    ];
    
    console.log('\n🔍 Проверяем нужные колонки:');
    
    for (const col of neededColumns) {
      if (columnNames.includes(col.name)) {
        console.log(`  ✅ ${col.name} - уже существует`);
      } else {
        console.log(`  ❌ ${col.name} - отсутствует, добавляем...`);
        try {
          await pool.query(`ALTER TABLE products ${col.sql}`);
          console.log(`  ✅ ${col.name} - успешно добавлена`);
        } catch (err) {
          console.log(`  ❌ Ошибка при добавлении ${col.name}:`, err.message);
        }
      }
    }
    
    // Проверяем результат
    console.log('\n📋 Обновлённая структура таблицы products:');
    const [newColumns] = await pool.query('DESCRIBE products');
    newColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
    
    console.log('\n✅ Проверка завершена!');
    
  } catch (err) {
    console.error('\n❌ Ошибка:', err.message);
    console.error('Убедитесь что:');
    console.error('  1. MySQL запущен');
    console.error('  2. База данных существует:', dbConfig.database);
    console.error('  3. Учетные данные верны');
  } finally {
    await pool.end();
  }
}

fixProductsTable();
