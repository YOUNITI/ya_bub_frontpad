// API для сайта - использует Frontpad API (MySQL)
// Конфигурация для продакшена - используем относительные пути (nginx проксирует)

// В продакшене (production) используем:
// - API: пустой путь (relative) - /api... 
// - WS: /ws (относительный путь)
// - Image: /uploads/

// Статические экспорты для совместимости с импортами
// Эти значения будут работать в браузере благодаря Vite
export const API_BASE_URL = '';
export const WS_URL = '/ws';
export const IMAGE_BASE_URL = '/uploads/';

// Функции для динамического получения URL (если нужно)
export function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return '';
}

export function getWsUrl() {
  if (typeof window === 'undefined') {
    return '/ws';
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:3005/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function getImageBaseUrl() {
  if (typeof window === 'undefined') {
    return '/uploads/';
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/uploads/';
  }
  return '/uploads/';
}
