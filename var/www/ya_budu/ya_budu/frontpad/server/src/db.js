// Унифицированный модуль базы данных для Frontpad
// Поддерживает SQLite и MySQL через DB_TYPE

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Явно загружаем .env из папки server с приоритетом
// Путь: из src/ поднимаемся на 3 уровня вверх (../../../) до корня проекта, затем в frontpad/server/
dotenv.config({ path: path.resolve(__dirname, '../../../frontpad/server/.env'), override: true });

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import mysql from 'mysql2/promise';

let dbConnection = null;
let pool = null;
let dbType = 'sqlite';

// MySQL настройки из переменных окружения
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yabudu_frontpad',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

// Главная функция инициализации
export async function initDb() {
  dbType = process.env.DB_TYPE || 'sqlite';
  
  if (dbType === 'mysql') {
    return await initMySQL();
  } else {
    return await initSQLite();
  }
}

// Инициализация SQLite
async function initSQLite() {
  try {
    dbConnection = await open({
      filename: './yabudu.db',
      driver: sqlite3.Database,
    });
    console.log('Подключение к SQLite (yabudu.db) установлено');
    return dbConnection;
  } catch (err) {
    console.error('Ошибка подключения к SQLite:', err);
    throw err;
  }
}

// Инициализация MySQL
async function initMySQL() {
  try {
    pool = mysql.createPool(mysqlConfig);
    
    // Проверяем подключение
    const connection = await pool.getConnection();
    console.log(`MySQL подключение установлено к базе: ${mysqlConfig.database}`);
    connection.release();
    
    return pool;
  } catch (err) {
    console.error('Ошибка подключения к MySQL:', err);
    throw err;
  }
}

// Унифицированные методы
export async function all(sql, params = []) {
  if (dbType === 'mysql') {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } else {
    return await dbConnection.all(sql, params);
  }
}

export async function get(sql, params = []) {
  if (dbType === 'mysql') {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } else {
    return await dbConnection.get(sql, params);
  }
}

export async function run(sql, params = []) {
  // Преобразуем undefined в null для MySQL
  const safeParams = params.map(p => p === undefined ? null : p);
  
  if (dbType === 'mysql') {
    // Используем execute() для prepared statements
    const [result] = await pool.execute(sql, safeParams);
    return { lastID: result.insertId, changes: result.affectedRows };
  } else {
    return await dbConnection.run(sql, safeParams);
  }
}

export async function exec(sql) {
  // Для MySQL используем query() для множественных выражений (exec не поддерживает prepared statements)
  if (dbType === 'mysql') {
    // Разбиваем на отдельные запросы и выполняем по одному
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await pool.query(stmt);
        } catch (err) {
          // Игнорируем ошибки "Table already exists" и "Duplicate"
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
            console.error('[DB.exec] Error:', err.message);
          }
        }
      }
    }
  } else {
    await dbConnection.exec(sql);
  }
}

// Закрытие соединения
export async function close() {
  if (dbType === 'mysql' && pool) {
    await pool.end();
    console.log('MySQL пул соединений закрыт');
  } else if (dbConnection) {
    await dbConnection.close();
    console.log('SQLite соединение закрыто');
  }
}

// Экспорт текущего типа БД
export function getDbType() {
  return dbType;
}

export default {
  initDb,
  all,
  get,
  run,
  exec,
  close,
  getDbType
};
