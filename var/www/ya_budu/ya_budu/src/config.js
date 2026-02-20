// API для сайта - использует Frontpad API (MySQL)
// Для продакшена используем относительные пути (nginx проксирует)

// Vite environment variables (from .env file)
// Переменные окружения Vite (из файла .env)
const API_URL_FULL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Используем VITE_WS_URL для полного URL, или вычисляем порт
const WS_URL_FULL = import.meta.env.VITE_WS_URL || 'ws://localhost:3005';
// Извлекаем порт из VITE_WS_URL если задан, иначе используем 3005
const WS_PORT = WS_URL_FULL 
  ? (WS_URL_FULL.match(/:(\d+)/)?.[1] || 3005) 
  : 3005;

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isDev 
  ? API_URL_FULL 
  : '';  // Пустая строка - relative path

export const WS_URL = isDev 
  ? `${WS_URL_FULL}/ws` 
  : `ws://${window.location.host}/ws`;

export const IMAGE_BASE_URL = isDev 
  ? `${API_URL_FULL}/uploads/` 
  : '/uploads/';
