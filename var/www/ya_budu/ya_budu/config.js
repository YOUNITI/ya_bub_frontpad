/**
 * Единая конфигурация для всех серверов проекта Ya-Budu
 * Все настройки вынесены в переменные окружения
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env файл
dotenv.config({ path: path.join(__dirname, '.env') });

// Основной URL сайта
export const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

// URL Frontpad (админ-панель)
export const FRONTPAD_URL = process.env.FRONTPAD_URL || 'https://fp.xn--90ag8bb0d.com';

// Порты
export const SITE_PORT = parseInt(process.env.PORT) || 3001;
export const FRONTPAD_PORT = parseInt(process.env.FRONTPAD_PORT) || 3005;



// Токены синхронизации между сайтом и Frontpad
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
export const FRONTPAD_SYNC_TOKEN = process.env.FRONTPAD_SYNC_TOKEN || 'change-sync-token-in-production';
export const SITE_SYNC_TOKEN = process.env.SITE_SYNC_TOKEN || 'change-sync-token-in-production';

// URL для WebSocket
// В production используем wss:// для HTTPS
const getWsUrl = () => {
  // Если есть переменная окружения - используем её
  if (process.env.WS_URL) return process.env.WS_URL;
  
  // Определяем протокол: wss для https, ws для http
  // При сборке используем 'production' как индикатор
  const isProduction = process.env.NODE_ENV === 'production';
  const protocol = isProduction ? 'wss://' : 'ws://';
  
  // В development используем localhost, в production - домен
  if (isProduction) {
    return 'wss://ябуду.com/ws';
  }
  return 'ws://localhost:3005/ws';
};

export const WS_URL = getWsUrl();

// Синхронизация между сайтом и Frontpad (включена/выключена)
export const SYNC_ENABLED = process.env.SYNC_ENABLED !== 'false';

// База данных MySQL
export const DB_CONFIG = {
  type: process.env.DB_TYPE || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yabudu_main',
  // Для Frontpad
  frontpadDatabase: process.env.FRONTPAD_DB_NAME || 'yabudu_frontpad',
};

// SMTP настройки
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.yandex.ru',
  port: parseInt(process.env.SMTP_PORT) || 465,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
};

console.log('[Config] Загружена конфигурация:');
console.log(`  SITE_URL: ${SITE_URL}`);
console.log(`  FRONTPAD_URL: ${FRONTPAD_URL}`);
console.log(`  DB_TYPE: ${DB_CONFIG.type}`);
