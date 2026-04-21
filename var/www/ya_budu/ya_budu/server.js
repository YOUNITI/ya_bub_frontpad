import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import http from 'http';

// Импорт модуля работы с БД
import { initDb, all, get, run, getPool } from './db.js';

// Импорт конфигурации
import { FRONTPAD_URL, FRONTPAD_SYNC_TOKEN, SITE_SYNC_TOKEN, SITE_URL, JWT_SECRET } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ ФУНКЦИИ ДАТЫ И ВРЕМЕНИ ============
// Получить текущее время в московском часовом поясе (UTC+3) - ISO формат с T
function getMoscowTimeISO() {
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString();
}

// Получить текущее время в московском часовом поясе для SQLite (YYYY-MM-DD HH:mm:ss)
function getMoscowTime() {
  // Используем toLocaleString с Moscow timezone для правильной даты
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

// ============ ФАЙЛОВОЕ ЛОГИРОВАНИЕ ============
const LOG_FILE = path.join(__dirname, 'main_print.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) console.error('Ошибка записи лога:', err);
  });
  console.log(message);
}

function logPrintEvent(eventType, orderId, orderNumber, details = '') {
  logToFile(`[PRINT] ${eventType} | Заказ #${orderNumber} (ID: ${orderId}) | ${details}`);
}

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Настройка CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== НАСТРОЙКА КЭШИРОВАНИЯ ==========
// По умолчанию - НЕ кэшировать
app.use((req, res, next) => {
  // API - всегда без кэша
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  
  // HTML страницы - не кэшировать
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  
  // JavaScript и CSS - кэшировать на 1 час (с версией в имени файла)
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    return next();
  }
  
  // Изображения - кэшировать на 7 дней
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return next();
  }
  
  // Шрифты - кэшировать на 30 дней
  if (req.path.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return next();
  }
  
  // Остальное - по умолчанию не кэшировать
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Специальные заголовки для Service Worker (не кэшировать)
app.use('/service-worker.js', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Service-Worker-Allowed', '/');
  next();
});

// Раздача статических файлов из dist (Vite build)
// Используем __dirname для абсолютных путей
const distPath = path.join(__dirname, 'dist');
const uploadsPath = path.join(__dirname, 'uploads');
const rootPath = __dirname;

app.use(express.static(distPath));
app.use(express.static(rootPath));
app.use('/uploads', express.static(uploadsPath));
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads', 'products')));

// PWA иконки - отдаём из папки icons/
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// Fallback для загрузок - ищем сначала в uploads/, потом в uploads/products/
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath1 = path.join(uploadsPath, filename);
  const filePath2 = path.join(uploadsPath, 'products', filename);
  
  if (fs.existsSync(filePath1)) {
    return res.sendFile(filePath1);
  }
  if (fs.existsSync(filePath2)) {
    return res.sendFile(filePath2);
  }
  res.status(404).json({ error: 'Файл не найден' });
});

// Исправление MIME type для .jsx файлов
const mimeTypes = {
  '.js': 'application/javascript',
  '.jsx': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

app.use((req, res, next) => {
  const ext = path.extname(req.url).toLowerCase();
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
  }
  next();
});

// PWA: отдавать index.html для всех маршрутов (SPA behavior)
app.get(['/menu', '/cart', '/profile', '/orders', '/admin', '/login'], (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productsDir = path.join(__dirname, 'uploads', 'products');
    // Создаем папку если не существует
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    cb(null, productsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Подключение к базе данных через унифицированный модуль
const initializeDb = async () => {
    await initDb();
    console.log('База данных инициализирована');
};

initializeDb();

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = user;
    next();
  });
};

// Middleware для проверки роли админа
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  next();
};

// Маршруты

// Категории (публичный - для Frontpad синхронизации)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать категорию (без авторизации - для Frontpad)
app.post('/api/categories/create', async (req, res) => {
  const { name, sort_order } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  
  // Проверяем токен Frontpad
  const frontpadToken = req.headers['x-frontpad-token'];
  const expectedToken = FRONTPAD_SYNC_TOKEN;
  
  if (frontpadToken !== expectedToken) {
    return res.status(403).json({ error: 'Неверный токен синхронизации' });
  }
  
  try {
    // Проверяем существует ли категория
    const existing = await get('SELECT * FROM categories WHERE name = ? OR slug = ?', [name, slug]);
    if (existing) {
      return res.json({ id: existing.id, name: existing.name, slug: existing.slug, message: 'Категория уже существует' });
    }
    
    const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    const category = await get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.json({ ...category, message: 'Категория создана' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Категории (админ - с авторизацией)
app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    const result = await run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    const category = await get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    
    // Синхронизировать с Frontpad
    await syncCategoryToFrontpad(category);
    
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    await run('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    const category = await get('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Товары - получаем напрямую из Frontpad API
app.get('/api/products', async (req, res) => {
  try {
    // Пробуем получить товары из Frontpad API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const frontpadResponse = await fetch(`${FRONTPAD_URL}/api/products`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (frontpadResponse.ok) {
      const products = await frontpadResponse.json();
      
      // Получаем категории для маппинга
      const categoriesRes = await fetch(`${FRONTPAD_URL}/api/categories`);
      let categoryMap = {};
      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        categories.forEach(c => {
          categoryMap[c.id] = c.name;
        });
      }
      
      // Добавляем category_name к каждому товару
      const productsWithCategory = products.map(p => ({
        ...p,
        category_name: categoryMap[p.category_id] || null
      }));
      
      return res.json(productsWithCategory);
    } else {
      // Если Frontpad недоступен - пробуем из локальной базы
      console.log('[/api/products] Frontpad недоступен, используем локальную базу');
      const localProducts = await all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC`);
      return res.json(localProducts);
    }
  } catch (err) {
    console.error('Ошибка получения товаров из Frontpad:', err.message);
    // Fallback - пробуем из локальной базы
    try {
      const localProducts = await all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC`);
      return res.json(localProducts);
    } catch (dbErr) {
      return res.status(500).json({ error: dbErr.message });
    }
  }
});

// Избранные товары - получаем из Frontpad API
app.get('/api/products/featured', async (req, res) => {
  try {
    // Получаем избранные товары из Frontpad
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const frontpadResponse = await fetch(`${FRONTPAD_URL}/api/products/featured`, { 
      signal: controller.signal 
    });
    clearTimeout(timeout);
    
    if (frontpadResponse.ok) {
      const featuredProducts = await frontpadResponse.json();
      res.json(featuredProducts);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error('Ошибка получения избранных товаров:', err.message);
    res.json([]);
  }
});

// Оптимизация: получить все размеры и допы для всех товаров одним запросом
// Синхронизация с Frontpad: sizes и addons хранятся в MySQL Frontpad, а не в локальной SQLite
app.get('/api/products/options', async (req, res) => {
  try {
    let sizesByProduct = {};
    let addonsByProduct = {};
    let sizeAddonsBySizeId = {}; // Допы по size_id для основного сайта
    
    // Функция с таймаутом для fetch
    const fetchWithTimeout = async (url, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };
    
    try {
      // Получаем размеры из Frontpad с таймаутом
      const sizesResponse = await fetchWithTimeout(`${FRONTPAD_URL}/api/sizes`, 3000);
      if (sizesResponse.ok) {
        const sizes = await sizesResponse.json();
        sizes.forEach(s => {
          if (!sizesByProduct[s.product_id]) sizesByProduct[s.product_id] = [];
          sizesByProduct[s.product_id].push({
            id: s.id,
            name: s.name,
            price: s.price || s.price_modifier,
            price_modifier: s.price_modifier || 0,
            sort_order: s.sort_order || 0
          });
        });
      }
      
      // Получаем size-addons - только для первых 10 товаров для скорости
      const productsResponse = await fetchWithTimeout(`${FRONTPAD_URL}/api/products`, 3000);
      if (productsResponse.ok) {
        const products = await productsResponse.json();
        console.log('[Sync] Найдено товаров:', products.length);
        
        // Обрабатываем все товары
        const productsToProcess = products;
        
        // Параллельно обрабатываем товары (максимум 3 одновременно)
        const batchSize = 3;
        for (let i = 0; i < productsToProcess.length; i += batchSize) {
          const batch = productsToProcess.slice(i, i + batchSize);
          await Promise.all(batch.map(async (product) => {
            try {
              const productSizeAddonsResponse = await fetchWithTimeout(
                `${FRONTPAD_URL}/api/products/${product.id}/size-addons`, 
                2000
              );
              if (productSizeAddonsResponse.ok) {
                const productData = await productSizeAddonsResponse.json();
                // Маппим по size_id для основного сайта
                Object.entries(productData).forEach(([sizeId, sizeData]) => {
                  if (sizeData.addons && Array.isArray(sizeData.addons)) {
                    // Сохраняем по size_id для основного сайта (ТОЛЬКО здесь!)
                    sizeAddonsBySizeId[sizeId] = sizeData.addons.map(addon => ({
                      id: addon.id,
                      name: addon.name,
                      price: addon.price_modifier || addon.price || 0,
                      price_modifier: addon.price_modifier || 0,
                      is_required: addon.is_required || 0,
                      sort_order: addon.sort_order || 0
                    }));
                  }
                });
              }
            } catch (e) {
              // Пропускаем ошибки для отдельных товаров
            }
          }));
        }
      }
      
      console.log('[Sync] Загружено размеров:', Object.keys(sizesByProduct).length, 'товаров с допами:', Object.keys(addonsByProduct).length, 'размеров с допами:', Object.keys(sizeAddonsBySizeId).length);
    } catch (syncErr) {
      console.error('Ошибка синхронизации размеров/допов с Frontpad:', syncErr.message);
      // Если не удалось получить с Frontpad, используем пустые данные - не блокируем сайт
    }
    
    res.json({ sizes: sizesByProduct, addons: addonsByProduct, size_addons: sizeAddonsBySizeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, category_id } = req.body;
  const image_url = req.file ? req.file.filename : req.body.image_url;
  try {
    const result = await run('INSERT INTO products (name, description, price, image_url, category_id) VALUES (?, ?, ?, ?, ?)', [name, description, price, image_url, category_id || null]);
    const product = await get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.lastID]);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  
  // ✅ ФИКС БАГА: Парсим JSON поля из FormData
  let parsedBody = {};
  try {
    // Если sizes пришёл как строка JSON (через FormData)
    parsedBody = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category_id: req.body.category_id,
      is_featured: req.body.is_featured,
      is_combo: req.body.is_combo,
      combo_items: req.body.combo_items ? JSON.parse(req.body.combo_items) : [],
      sizes: req.body.sizes ? JSON.parse(req.body.sizes) : []
    };
  } catch (e) {
    parsedBody = req.body;
  }
  
  const { name, description, price, category_id, sizes } = parsedBody;
  const image_url = req.file ? req.file.filename : req.body.image_url;
  try {
    const currentProduct = await get('SELECT * FROM products WHERE id = ?', [id]);
    if (!currentProduct) return res.status(404).json({ error: 'Товар не найден' });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (image_url !== undefined) updates.image_url = image_url;
    if (category_id !== undefined) updates.category_id = category_id || null;
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    if (setClause) await run(`UPDATE products SET ${setClause} WHERE id = ?`, values);
    
    // ✅ ФИКС БАГА: Отправляем размеры на Frontpad вместе с обновлением товара!
    // Это предотвращает удаление размеров на стороне Frontpad
    try {
      const syncToken = process.env.FRONTPAD_SYNC_TOKEN || '';
      const sizesToSend = parsedBody.sizes || [];
      console.log('[DEBUG] Отправляем размеры на Frontpad:', sizesToSend);
      
      const response = await fetch(`${FRONTPAD_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Frontpad-Token': syncToken
        },
        body: JSON.stringify({
          name,
          description,
          price,
          category_id,
          image_url,
          is_featured: parsedBody.is_featured || 0,
          is_combo: parsedBody.is_combo || 0,
          combo_items: parsedBody.combo_items || [],
          sizes: sizesToSend // ✅ Отправляем размеры чтобы Frontpad не удалил их!
        })
      });
      
      console.log('[DEBUG] Ответ Frontpad:', response.status);
    } catch (syncErr) {
      console.error('Ошибка синхронизации товара с Frontpad:', syncErr.message);
    }
    
    const product = await get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [id]);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Товар удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Размеры товаров
app.get('/api/products/:productId/sizes', async (req, res) => {
  const { productId } = req.params;
  try {
    const sizes = await all('SELECT * FROM sizes WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:productId/sizes', authenticateToken, requireAdmin, async (req, res) => {
  const { productId } = req.params;
  const { name, price_modifier, sort_order } = req.body;
  
  try {
    // Сначала создаём размер НА FRONTPAD!
    const syncToken = process.env.FRONTPAD_SYNC_TOKEN || '';
    const frontpadResponse = await fetch(`${FRONTPAD_URL}/api/products/${productId}/sizes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frontpad-Token': syncToken
      },
      body: JSON.stringify({
        name,
        price_modifier: price_modifier || 0,
        sort_order: sort_order || 0
      })
    });
    
    if (!frontpadResponse.ok) {
      const error = await frontpadResponse.text();
      console.error('Ошибка создания размера на Frontpad:', error);
      throw new Error('Не удалось создать размер на Frontpad');
    }
    
    const frontpadSize = await frontpadResponse.json();
    
    // Теперь сохраняем размер с ТОЧНО ТАКИМ ЖЕ ID как на Frontpad
    await run('INSERT INTO sizes (id, product_id, name, price_modifier, sort_order) VALUES (?, ?, ?, ?, ?)', [
      frontpadSize.id, 
      productId, 
      name, 
      price_modifier || 0, 
      sort_order || 0
    ]);
    
    const size = await get('SELECT * FROM sizes WHERE id = ?', [frontpadSize.id]);
    res.json(size);
    
  } catch (err) {
    console.error('Ошибка создания размера:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sizes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price_modifier, sort_order } = req.body;
  try {
    await run('UPDATE sizes SET name = ?, price_modifier = ?, sort_order = ? WHERE id = ?', [name, price_modifier || 0, sort_order || 0, id]);
    const size = await get('SELECT * FROM sizes WHERE id = ?', [id]);
    res.json(size);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sizes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM sizes WHERE id = ?', [id]);
    res.json({ message: 'Размер удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Дополнительные ингредиенты для размеров (size-addons)
app.delete('/api/products/:productId/sizes/:sizeId/addons', authenticateToken, requireAdmin, async (req, res) => {
  const { productId, sizeId } = req.params;
  try {
    // Проксируем запрос на Frontpad
    const syncToken = process.env.FRONTPAD_SYNC_TOKEN || '';
    const response = await fetch(`${FRONTPAD_URL}/api/products/${productId}/sizes/${sizeId}/addons`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Frontpad-Token': syncToken
      }
    });
    
    if (response.ok) {
      res.json({ message: 'Допы для размера удалены' });
    } else {
      const error = await response.text();
      console.error('Ошибка удаления допов размера на Frontpad:', error);
      res.status(response.status).json({ error: 'Ошибка удаления допов размера' });
    }
  } catch (err) {
    console.error('Ошибка удаления допов размера:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sizes/:sizeId/addons', authenticateToken, requireAdmin, async (req, res) => {
  const { sizeId } = req.params;
  const { addon_id, is_required, price_modifier } = req.body;
  
  try {
    const syncToken = process.env.FRONTPAD_SYNC_TOKEN || '';
    
    // ✅ ФИНАЛЬНЫЙ ФИКС: Повторяем запрос до 15 раз пока не получится!
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const response = await fetch(`${FRONTPAD_URL}/api/sizes/${sizeId}/addons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frontpad-Token': syncToken
          },
          body: JSON.stringify({
            addon_id,
            is_required,
            price_modifier
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          return res.json(result);
        }
        
        // Если ошибка внешнего ключа - ждём и пробуем снова
        const error = await response.text();
        if (error.includes('foreign key') || error.includes('Cannot add or update a child row')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Другая ошибка - возвращаем сразу
        console.error('Ошибка добавления допа размера на Frontpad:', error);
        return res.status(response.status).json({ error: 'Ошибка добавления допа размера' });
        
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // После 15 попыток всё равно не получилось
    return res.status(500).json({ error: 'Не удалось сохранить доп после 15 попыток' });
    
  } catch (err) {
    console.error('Ошибка добавления допа размера:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Дополнительные ингредиенты (допы)
app.get('/api/products/:productId/addons', async (req, res) => {
  const { productId } = req.params;
  try {
    const addons = await all('SELECT * FROM addons WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
    res.json(addons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:productId/addons', authenticateToken, requireAdmin, async (req, res) => {
  const { productId } = req.params;
  const { name, price, sort_order } = req.body;
  try {
    const result = await run('INSERT INTO addons (product_id, name, price, sort_order) VALUES (?, ?, ?, ?)', [productId, name, price || 0, sort_order || 0]);
    const addon = await get('SELECT * FROM addons WHERE id = ?', [result.lastID]);
    res.json(addon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/addons/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, price, sort_order } = req.body;
  try {
    await run('UPDATE addons SET name = ?, price = ?, sort_order = ? WHERE id = ?', [name, price || 0, sort_order || 0, id]);
    const addon = await get('SELECT * FROM addons WHERE id = ?', [id]);
    res.json(addon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/addons/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await run('DELETE FROM addons WHERE id = ?', [id]);
    res.json({ message: 'Дополнительный ингредиент удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить товар с размерами и допами

// Клиенты
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await all('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить данные клиента (профиль)
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  
  try {
    // Проверяем, что пользователь обновляет свой профиль или является админом
    if (req.user.customer_id !== parseInt(id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const customer = await get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Клиент не найден' });
    
    // Обновляем только разрешенные поля
    await run(
      'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name || customer.name, phone || customer.phone, address || customer.address, id]
    );
    
    const updatedCustomer = await get('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(updatedCustomer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Чаты
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await all(`SELECT c.id, c.name, c.email, m.content as last_message, m.timestamp as last_message_time, m.is_admin as last_message_from_admin FROM customers c LEFT JOIN messages m ON c.id = m.sender_id WHERE m.id IS NULL OR m.id = (SELECT MAX(id) FROM messages WHERE sender_id = c.id) ORDER BY m.timestamp DESC, c.created_at DESC`);
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сообщения
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await all('SELECT * FROM messages ORDER BY timestamp DESC');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:customer_id', async (req, res) => {
  const { customer_id } = req.params;
  try {
    const messages = await all('SELECT * FROM messages WHERE sender_id = ? ORDER BY timestamp ASC', [customer_id]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', upload.single('image'), async (req, res) => {
  const sender_id = req.body.sender_id || null;
  const content = req.body.content || null;
  const is_admin = req.body.is_admin === 'true' || req.body.is_admin === true || req.body.is_admin === 1;
  const image_url = req.file ? req.file.filename : null;
  const cart_data = req.body.cart_data || null;
  const cart_total = req.body.cart_total || 0;
  
  console.log('[MESSAGE] Получено сообщение:', { sender_id, content, is_admin });
  
  try {
    const result = await run('INSERT INTO messages (sender_id, content, image_url, is_admin, cart_data, cart_total) VALUES (?, ?, ?, ?, ?, ?)', [sender_id, content, image_url, is_admin ? 1 : 0, cart_data, cart_total]);
    const message = await get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
    
    // Синхронизируем сообщение с Frontpad
    try {
      const syncToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
      const syncUrl = `${FRONTPAD_URL}/api/site/messages/sync`;
      
      // Получаем данные клиента из БД для синхронизации
      let customerName = null;
      let customerPhone = null;
      if (sender_id && !is_admin) {
        const customer = await get('SELECT name, phone FROM customers WHERE id = ?', [sender_id]);
        if (customer) {
          customerName = customer.name;
          customerPhone = customer.phone;
        }
      }
      
      console.log('[SYNC] URL для синхронизации сообщения:', syncUrl);
      console.log('[SYNC] FRONTPAD_URL:', FRONTPAD_URL);
      console.log('[SYNC] Данные клиента:', { customerName, customerPhone });
      
      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': syncToken
        },
        body: JSON.stringify({
          sender_id: sender_id,
          content: content,
          is_admin: is_admin ? 1 : 0,
          customer_name: customerName,
          customer_phone: customerPhone,
          timestamp: getMoscowTime(),
          cart_data: cart_data,
          cart_total: cart_total
        })
      });
      
      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        console.log('[SYNC] Сообщение синхронизировано:', syncResult);
      } else {
        const errorText = await syncResponse.text();
        console.error('[SYNC] Ошибка синхронизации:', syncResponse.status, errorText);
      }
    } catch (syncErr) {
      console.error('[SYNC] Ошибка синхронизации сообщения с Frontpad:', syncErr.message);
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/:customer_id/read', async (req, res) => {
  const { customer_id } = req.params;
  try {
    await run('UPDATE messages SET `read` = 1 WHERE sender_id = ? AND is_admin = 1 AND `read` = 0', [customer_id]);
    res.json({ message: 'Сообщения отмечены как прочитанные' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Аутентификация
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ error: 'Неверный email или пароль' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, customer_id: user.customer_id }, JWT_SECRET, { expiresIn: '24h' });
    
    // Получаем данные клиента
    const customer = await get('SELECT * FROM customers WHERE id = ?', [user.customer_id]);
    
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, customer_id: user.customer_id, name: customer?.name, phone: customer?.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Регистрация
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  
  try {
    // Проверяем существует ли пользователь
    const existingUser = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаём клиента
    const customerResult = await run(
      'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
      [name, email, phone || null, address || null]
    );
    const customerId = customerResult.lastID;
    
    // Создаём пользователя
    const userResult = await run(
      'INSERT INTO users (email, password, role, customer_id) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, 'user', customerId]
    );
    const userId = userResult.lastID;
    
    // Генерируем токен
    const token = jwt.sign(
      { id: userId, email, role: 'user', customer_id: customerId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: userId,
        email,
        role: 'user',
        customer_id: customerId,
        name,
        phone
      }
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Гостевые клиенты / Upsert клиента
app.post('/api/customers/upsert', async (req, res) => {
  let { id, name, email, phone, address } = req.body;
  try {
    if (!email && phone) email = phone + '@guest.local';
    let customer = null;
    
    if (id) {
      // Обновить существующего клиента
      customer = await get('SELECT * FROM customers WHERE id = ?', [id]);
      if (customer) {
        await run('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', 
          [name || customer.name, email || customer.email, phone || customer.phone, address || customer.address, id]);
        const updatedCustomer = await get('SELECT * FROM customers WHERE id = ?', [id]);
        res.json({ customer: updatedCustomer, isNew: false });
        return;
      }
    }
    
    // Искать по телефону или email
    if (phone) customer = await get("SELECT * FROM customers WHERE phone = ? AND email NOT LIKE '%@guest.local'", [phone]);
    if (!customer && email && !email.includes('@guest.local')) customer = await get('SELECT * FROM customers WHERE email = ?', [email]);
    
    if (customer) {
      await run('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', [name, email || customer.email, phone || customer.phone, address || customer.address, customer.id]);
      const updatedCustomer = await get('SELECT * FROM customers WHERE id = ?', [customer.id]);
      res.json({ customer: updatedCustomer, isNew: false });
    } else {
      const result = await run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', [name, email, phone || null, address || null]);
      const newCustomer = await get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
      res.json({ customer: newCustomer, isNew: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guest-customers', async (req, res) => {
  let { name, email, phone, address } = req.body;
  try {
    if (!email && phone) email = phone + '@guest.local';
    let customer = null;
    if (phone) customer = await get("SELECT * FROM customers WHERE phone = ? AND email NOT LIKE '%@guest.local'", [phone]);
    if (!customer && email && !email.includes('@guest.local')) customer = await get('SELECT * FROM customers WHERE email = ?', [email]);
    if (customer) {
      await run('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', [name, email || customer.email, phone || customer.phone, address || customer.address, customer.id]);
      const updatedCustomer = await get('SELECT * FROM customers WHERE id = ?', [customer.id]);
      res.json({ customer: updatedCustomer, isNew: false });
    } else {
      const result = await run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', [name, email, phone || null, address || null]);
      const newCustomer = await get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
      res.json({ customer: newCustomer, isNew: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать заказ
app.post('/api/orders', async (req, res) => {
  const { customer_id, guest_name, guest_phone, guest_email, order_type, street, building, apartment, entrance, floor, intercom, is_asap, delivery_date, delivery_time, custom_time, payment, comment, items, total_amount, zone_id, delivery_price, zone_name } = req.body;
  
  logToFile(`[ORDER_CREATE] Новый запрос на создание заказа от ${guest_name || 'гость'} (тел: ${guest_phone || 'не указан'})`);
  
  try {
    // Генерируем номер заранее с уникальным суффиксом
    const todayMoscow = getMoscowTime().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    let orderNumber = `ORD-${todayMoscow}-${uniqueSuffix}`; // Временный номер, потом обновим
    
    // Парсим items если пришло строкой
    let parsedItems = items;
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = [];
      }
    }
    
    console.log('[ORDER] items type:', typeof items, Array.isArray(items));
    // Для MySQL используем обычный параметр - mysql2 сам обрабатывает JSON
    const dbType = process.env.DB_TYPE || 'sqlite';
    const itemsValue = JSON.stringify(parsedItems || []);
    
    console.log('[ORDER] dbType:', dbType);
    console.log('[ORDER] itemsValue:', itemsValue);
    
    // Устанавливаем значения по отдельности, обходим любые проблемы с порядком колонок
    const result = await run(`INSERT INTO orders SET ?`, {
      customer_id: customer_id || null,
      order_number: orderNumber,
      guest_name: guest_name,
      guest_phone: guest_phone,
      guest_email: guest_email || null,
      order_type: order_type || 'delivery',
      street: street || null,
      building: building || null,
      apartment: apartment || null,
      entrance: entrance || null,
      floor: floor || null,
      intercom: intercom || null,
      is_asap: is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
      delivery_date: delivery_date || null,
      delivery_time: delivery_time,
      custom_time: custom_time || null,
      payment: payment,
      comment: comment || null,
      items: itemsValue,
      total_amount: total_amount,
      zone_id: zone_id || null,
      delivery_price: delivery_price || 0,
      zone_name: zone_name || null,
      status: 'pending',
      created_at: getMoscowTime()
    });
    
    console.log('[ORDER] INSERT result:', result);
    const orderId = result.lastID;
    
    // Получаем заказ из БД
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    
    // Безопасный парсинг items - проверяем что это строка
    if (order.items && typeof order.items === 'string') {
      order.items = JSON.parse(order.items);
    } else if (order.items && typeof order.items === 'object') {
      // Уже объект, не парсим
      console.log('[ORDER] items already parsed as object');
    }
    
    // Обновляем номер заказа с правильным ID
    orderNumber = `ORD-${getMoscowTime().slice(0, 10).replace(/-/g, '')}-${String(orderId).padStart(3,'0')}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    await run('UPDATE orders SET order_number = ? WHERE id = ?', [orderNumber, orderId]);
    order.order_number = orderNumber;
    
    logPrintEvent('ORDER_CREATED', orderId, orderNumber, `Сумма: ${total_amount} руб., Товаров: ${(parsedItems || []).length}`);
    
    // Инициализируем receiptHTML
    let receiptHTML = null;
    
    // Формируем полный адрес для синхронизации с читаемыми метками
    const fullAddress = [street, building ? 'д.' + building : null, apartment ? 'кв.' + apartment : null, entrance ? 'под.' + entrance : null, floor ? 'эт.' + floor : null, intercom ? 'домофон:' + intercom : null].filter(Boolean).join(', ');
    
    console.log(`[ORDER] Информация о доставке для заказа ${orderNumber}:`);
    console.log(`  - Район (zone_id): ${zone_id}, название: ${zone_name}`);
    console.log(`  - Стоимость доставки: ${delivery_price || 0}₽`);
    console.log(`  - Адрес: ${fullAddress || 'не указан'}`);
    console.log(`  - Подъезд: ${entrance || 'не указан'}, Этаж: ${floor || 'не указан'}`);
    
    // Синхронизируем заказ с Frontpad
    try {
      const syncToken = String(process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g');
      console.log(`[SYNC] Начинаем синхронизацию заказа ${orderNumber} с Frontpad: ${FRONTPAD_URL}`);
      console.log(`[SYNC] Используем токен: ${String(syncToken).substring(0, 5)}...`);
      
      const syncData = {
        order_id: orderId,
        order_number: orderNumber,
        customer_id: customer_id,
        guest_name,
        guest_phone,
        guest_email,
        order_type,
        address: fullAddress,
        entrance,
        floor,
        intercom,
        building,
        street,
        apartment,
        is_asap: is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
        delivery_date,
        delivery_time,
        custom_time,
        payment,
        comment,
        items: parsedItems,
        total_amount,
        zone_id: zone_id || null,
        delivery_price: delivery_price || 0,
        zone_name: zone_name || null,
        status: 'pending',
        created_at: getMoscowTime()
      };
      
      console.log('[SYNC] Данные для синхронизации:', JSON.stringify(syncData, null, 2));
      
      const syncResponse = await fetch(`${FRONTPAD_URL}/api/site/orders/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': syncToken
        },
        body: JSON.stringify(syncData)
      });
      
      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        console.log(`Заказ ${orderNumber} синхронизирован с Frontpad:`, syncResult);
        
        // Frontpad сам делает автопечать при синхронизации заказа
        // Дополнительная печать с сайта не требуется
        logToFile(`[SYNC] Заказ ${orderNumber} синхронизирован, автопечать выполнена Frontpad`);
      } else {
        const error = await syncResponse.text();
        console.error(`Ошибка синхронизации заказа ${orderNumber} с Frontpad:`, error);
      }
    } catch (err) {
      console.error(`Сетевая ошибка синхронизации заказа ${orderNumber}:`, err.message);
    }
    
    // Возвращаем заказ с HTML для печати
    res.json({ ...order, receipt_html: receiptHTML });
  } catch (err) {
    logPrintEvent('ORDER_CREATE_ERROR', null, null, `Ошибка: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Получить все заказы (для админа)
app.get('/api/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders ORDER BY created_at DESC');
    orders.forEach(order => {
      if (order.items && typeof order.items === 'string') {
        order.items = JSON.parse(order.items);
      }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить мои заказы
app.get('/api/orders/my', authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    if (!customerId) return res.status(400).json({ error: 'Клиент не привязан к аккаунту' });
    const orders = await all('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
    orders.forEach(order => {
      if (order.items && typeof order.items === 'string') {
        order.items = JSON.parse(order.items);
      }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить статус заказа
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (order.items && typeof order.items === 'string') {
      order.items = JSON.parse(order.items);
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Сервер работает!');
});

// Создаём HTTP сервер
const server = http.createServer(app);

// WebSocket сервер
const wss = new WebSocketServer({ server, path: '/ws' });

// Хранилище подключений
const clients = new Map();

wss.on('connection', (ws, req) => {
  console.log('Новое WebSocket подключение');
  
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket сообщение:', data);
      
      if (data.type === 'auth') {
        // Сохраняем связь клиента с WebSocket
        clients.set(data.userId, ws);
        ws.userId = data.userId;
        ws.send(JSON.stringify({ type: 'connected', userId: data.userId }));
      }
    } catch (err) {
      console.error('Ошибка WebSocket сообщения:', err);
    }
  });
  
  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`Клиент ${ws.userId} отключился`);
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket ошибка:', err);
  });
});

// Ping для поддержания соединений
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Функция отправки уведомления клиенту
function sendToClient(userId, data) {
  const client = clients.get(userId);
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// Функция отправки всем клиентам
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// ============ СИНХРОНИЗАЦИЯ СТАТУСА ЗАКАЗА ОТ FRONTPAD ============

// Endpoint для приёма обновления статуса заказа от Frontpad
app.post('/api/site/orders/status-sync', async (req, res) => {
  const { order_id, status, ready_time, customer_id } = req.body;
  
  console.log(`[STATUS_SYNC] Получено обновление статуса заказа #${order_id} -> ${status}, ready_time: ${ready_time}, customer_id: ${customer_id}`);
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    
    console.log(`[STATUS_SYNC] Токен в запросе: ${syncToken ? String(syncToken).substring(0, 5) + '...' : 'отсутствует'}`);
    console.log(`[STATUS_SYNC] Ожидаемый токен: ${expectedToken ? String(expectedToken).substring(0, 5) + '...' : 'отсутствует'}`);
    
    if (String(syncToken) !== String(expectedToken)) {
      console.error('[STATUS_SYNC] Ошибка: неверный токен синхронизации');
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Обновляем статус заказа в локальной БД
    // Если есть ready_time - обновляем и его
    // Если есть customer_id - обновляем и его (на случай если при создании он не был установлен)
    if (ready_time && customer_id) {
      await run('UPDATE orders SET status = ?, ready_time = ?, customer_id = ? WHERE id = ?', [status, ready_time, customer_id, order_id]);
    } else if (ready_time) {
      await run('UPDATE orders SET status = ?, ready_time = ? WHERE id = ?', [status, ready_time, order_id]);
    } else if (customer_id) {
      await run('UPDATE orders SET status = ?, customer_id = ? WHERE id = ?', [status, customer_id, order_id]);
    } else {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, order_id]);
    }
    
    // Обновляем статус заказа в локальной БД
    // Если есть ready_time - обновляем и его
    // Если есть customer_id - обновляем и его (на случай если при создании он не был установлен)
    if (ready_time && customer_id) {
      await run('UPDATE orders SET status = ?, ready_time = ?, customer_id = ? WHERE id = ?', [status, ready_time, customer_id, order_id]);
    } else if (ready_time) {
      await run('UPDATE orders SET status = ?, ready_time = ? WHERE id = ?', [status, ready_time, order_id]);
    } else if (customer_id) {
      await run('UPDATE orders SET status = ?, customer_id = ? WHERE id = ?', [status, customer_id, order_id]);
    } else {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, order_id]);
    }
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    // Парсим items
    if (order.items && typeof order.items === 'string') {
      order.items = JSON.parse(order.items);
    }
    
    // Отправляем обновление конкретному клиенту через WebSocket
    // Если клиент онлайн - отправляем только ему
    // Это гарантирует, что каждый пользователь видит только свои заказы
    let notificationSent = false;
    if (order.customer_id) {
      const sent = sendToClient(order.customer_id, {
        type: 'order_status_changed',
        order: order,
        customer_id: order.customer_id
      });
      
      if (sent) {
        console.log(`[STATUS_SYNC] Статус заказа #${order_id} отправлен конкретному клиенту ${order.customer_id}`);
        notificationSent = true;
      } else {
        console.log(`[STATUS_SYNC] Клиент ${order.customer_id} не в сети, уведомление пропущено`);
      }
    } else if (order.guest_phone) {
      // Для гостевых заказов без customer_id - пробуем отправить по телефону
      // Ищем клиента по телефону
      const guestCustomer = await get('SELECT id FROM customers WHERE phone = ?', [order.guest_phone]);
      if (guestCustomer) {
        const sent = sendToClient(guestCustomer.id, {
          type: 'order_status_changed',
          order: order,
          customer_id: guestCustomer.id
        });
        if (sent) {
          console.log(`[STATUS_SYNC] Статус заказа #${order_id} отправлен гостю по телефону ${order.guest_phone}`);
          notificationSent = true;
        }
      }
    }
    
    // Также отправляем всем (broadcast) чтобы клиент гарантированно получил уведомление
    // Это важно для гостевых заказов и случаев когда WebSocket клиента отключён
    if (!notificationSent) {
      broadcast({
        type: 'order_status_changed',
        order: order
      });
      console.log(`[STATUS_SYNC] Отправлен broadcast всем клиентам`);
    }
    
    res.json({ success: true, order });
  } catch (err) {
    console.error('[STATUS_SYNC] Ошибка:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для приёма уведомления об удалении заказа от Frontpad
app.post('/api/site/orders/delete-sync', async (req, res) => {
  const { order_id } = req.body;
  
  console.log(`[DELETE_SYNC] Получено уведомление об удалении заказа #${order_id}`);
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    
    console.log(`[DELETE_SYNC] Токен в запросе: ${syncToken ? syncToken.substring(0, 5) + '...' : 'отсутствует'}`);
    console.log(`[DELETE_SYNC] Ожидаемый токен: ${expectedToken ? expectedToken.substring(0, 5) + '...' : 'отсутствует'}`);
    
    if (syncToken !== expectedToken) {
      console.error('[DELETE_SYNC] Ошибка: неверный токен синхронизации');
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Получаем данные заказа ДО удаления
    const orderToDelete = await get('SELECT customer_id, guest_phone FROM orders WHERE id = ?', [order_id]);
    
    // Удаляем заказ из локальной БД
    await run('DELETE FROM orders WHERE id = ?', [order_id]);
    
    // Отправляем уведомление конкретному клиенту через WebSocket
    // Если клиент онлайн - отправляем только ему
    if (orderToDelete && orderToDelete.customer_id) {
      const sent = sendToClient(orderToDelete.customer_id, {
        type: 'order_deleted',
        id: order_id
      });
      
      if (sent) {
        console.log(`[DELETE_SYNC] Уведомление об удалении заказа #${order_id} отправлено клиенту ${orderToDelete.customer_id}`);
      } else {
        console.log(`[DELETE_SYNC] Клиент ${orderToDelete.customer_id} не в сети, уведомление пропущено`);
      }
    } else if (orderToDelete && orderToDelete.guest_phone) {
      // Для гостевых заказов - пробуем отправить по телефону
      const guestCustomer = await get('SELECT id FROM customers WHERE phone = ?', [orderToDelete.guest_phone]);
      if (guestCustomer) {
        const sent = sendToClient(guestCustomer.id, {
          type: 'order_deleted',
          id: order_id
        });
        if (sent) {
          console.log(`[DELETE_SYNC] Уведомление об удалении заказа #${order_id} отправлено гостю`);
        }
      }
    } else {
      // Если не удалось получить customer_id - отправляем всем (для совместимости)
      broadcast({
        type: 'order_deleted',
        id: order_id
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE_SYNC] Ошибка:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ СИНХРОНИЗАЦИЯ СООБЩЕНИЙ ОТ FRONTPAD ============

// Endpoint для приёма сообщений от Frontpad (когда админ отвечает)
app.post('/api/site/messages/sync-from-frontpad', async (req, res) => {
  const { chat_id, customer_id, customer_name, customer_phone, message, sender, sender_name, timestamp } = req.body;
  
  console.log('[SYNC-FROM-FRONTPAD] Получено сообщение от Frontpad:', { chat_id, customer_id, customer_name, message, sender });
  
  try {
    // Проверяем токен синхронизации
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    
    if (syncToken !== expectedToken) {
      console.error('[SYNC-FROM-FRONTPAD] Ошибка: неверный токен синхронизации');
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Сохраняем сообщение в локальную таблицу messages
    const result = await run(
      'INSERT INTO messages (sender_id, content, is_admin, cart_data, cart_total) VALUES (?, ?, ?, ?, ?)',
      [customer_id || null, message, 1, null, 0] // is_admin = 1 для сообщений от админа
    );
    
    const savedMessage = await get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
    
    // Отправляем сообщение конкретному клиенту через WebSocket
    if (customer_id) {
      const sent = sendToClient(customer_id, {
        type: 'new_message',
        message: savedMessage,
        customer_id: customer_id,
        customer_name: customer_name,
        customer_phone: customer_phone
      });
      
      if (sent) {
        console.log(`[SYNC-FROM-FRONTPAD] Сообщение отправлено конкретному клиенту ${customer_id}, ID: ${result.lastID}`);
      } else {
        console.log(`[SYNC-FRONTPAD] Клиент ${customer_id} не в сети, сообщение будет доступно при следующем входе`);
      }
    } else {
      // Если customer_id неизвестен - отправляем всем (для совместимости)
      broadcast({
        type: 'new_message',
        message: savedMessage,
        customer_id: customer_id,
        customer_name: customer_name,
        customer_phone: customer_phone
      });
    }
    
    res.json({ success: true, message_id: result.lastID });
  } catch (err) {
    console.error('[SYNC-FROM-FRONTPAD] Ошибка:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Запуск сервера
server.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

// ============ API СКИДОК ============

// Получить все скидки (публичный - для корзины)
app.get('/api/discounts', async (req, res) => {
  try {
    const discounts = await all('SELECT * FROM discounts WHERE is_active = 1 ORDER BY created_at DESC');
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить все скидки (админ)
app.get('/api/admin/discounts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const discounts = await all(`
      SELECT d.*,
        (SELECT COUNT(*) FROM orders WHERE JSON_EXTRACT(items, '$.discount_id') = CAST(d.id AS TEXT)) as total_used
      FROM discounts d
      ORDER BY d.created_at DESC
    `);
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Проверить промокод
app.get('/api/discounts/check/:code', async (req, res) => {
  const { code } = req.params;
  const { order_amount } = req.query;
  
  try {
    const discount = await get('SELECT * FROM discounts WHERE code = ? AND is_active = 1', code);
    
    if (!discount) {
      return res.status(404).json({ error: 'Скидка не найдена или не активна' });
    }
    
    // Проверяем срок действия
    const now = new Date().toISOString();
    if (discount.valid_from && now < discount.valid_from) {
      return res.status(400).json({ error: 'Скидка ещё не вступила в силу' });
    }
    if (discount.valid_to && now > discount.valid_to) {
      return res.status(400).json({ error: 'Скидка истекла' });
    }
    
    // Проверяем лимит использований
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return res.status(400).json({ error: 'Лимит использований исчерпан' });
    }
    
    // Проверяем минимальную сумму заказа
    if (discount.min_order_amount && order_amount && parseFloat(order_amount) < discount.min_order_amount) {
      return res.status(400).json({ 
        error: `Минимальная сумма заказа для этой скидки: ${discount.min_order_amount} руб.`
      });
    }
    
    // Вычисляем сумму скидки
    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = (parseFloat(order_amount) * discount.value) / 100;
      if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
        discountAmount = discount.max_discount_amount;
      }
    } else {
      discountAmount = discount.value;
    }
    
    res.json({
      ...discount,
      discount_amount: discountAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать скидку
app.post('/api/admin/discounts', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, type, value, min_order_amount, max_discount_amount, code, is_active, valid_from, valid_to, usage_limit } = req.body;
  
  try {
    const result = await run(
      `INSERT INTO discounts (name, description, type, value, min_order_amount, max_discount_amount, code, is_active, valid_from, valid_to, usage_limit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, type || 'percent', value || 0, min_order_amount || 0, max_discount_amount || null, code || null, is_active ? 1 : 0, valid_from || null, valid_to || null, usage_limit || null]
    );
    
    // Синхронизировать с Frontpad
    await syncDiscountToFrontpad(result.lastID);
    
    const discount = await get('SELECT * FROM discounts WHERE id = ?', [result.lastID]);
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить скидку
app.put('/api/admin/discounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, type, value, min_order_amount, max_discount_amount, code, is_active, valid_from, valid_to, usage_limit } = req.body;
  
  try {
    await run(
      `UPDATE discounts 
       SET name = ?, description = ?, type = ?, value = ?, min_order_amount = ?, max_discount_amount = ?, code = ?, is_active = ?, valid_from = ?, valid_to = ?, usage_limit = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, type, value, min_order_amount, max_discount_amount, code, is_active ? 1 : 0, valid_from, valid_to, usage_limit, id]
    );
    
    // Синхронизировать с Frontpad
    await syncDiscountToFrontpad(id);
    
    const discount = await get('SELECT * FROM discounts WHERE id = ?', [id]);
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить скидку
app.delete('/api/admin/discounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    await run('DELETE FROM discounts WHERE id = ?', [id]);
    
    // Удалить из Frontpad
    await deleteDiscountFromFrontpad(id);
    
    res.json({ message: 'Скидка удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Синхронизировать все скидки с Frontpad
app.post('/api/admin/discounts/sync-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const discounts = await all('SELECT * FROM discounts');
    let synced = 0;
    
    for (const discount of discounts) {
      await syncDiscountToFrontpad(discount.id);
      synced++;
    }
    
    res.json({ success: true, synced, message: `Синхронизировано ${synced} скидок` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Функции синхронизации с Frontpad
async function syncDiscountToFrontpad(discountId) {
  try {
    const discount = await get('SELECT * FROM discounts WHERE id = ?', [discountId]);
    if (!discount) return;
    
    const response = await fetch(`${FRONTPAD_URL}/api/discounts/sync-from-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discount)
    });
    
    if (response.ok) {
      console.log(`Скидка ${discount.name} синхронизирована с Frontpad`);
    }
  } catch (err) {
    console.error('Ошибка синхронизации с Frontpad:', err.message);
  }
}

async function deleteDiscountFromFrontpad(discountId) {
  try {
    await fetch(`${FRONTPAD_URL}/api/discounts/site/${discountId}`, {
      method: 'DELETE'
    });
    console.log(`Скидка ${discountId} удалена из Frontpad`);
  } catch (err) {
    console.error('Ошибка удаления из Frontpad:', err.message);
  }
}

// Функция синхронизации категории на Frontpad
async function syncCategoryToFrontpad(category) {
  try {
    const response = await fetch(`${FRONTPAD_URL}/api/categories/sync-from-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: category.id,
        name: category.name,
        sort_order: category.sort_order || 0
      })
    });
    
    if (response.ok) {
      console.log(`Категория ${category.name} синхронизирована с Frontpad`);
    }
  } catch (err) {
    console.error('Ошибка синхронизации категории с Frontpad:', err.message);
  }
}

// ============ API РАЙОНОВ ДОСТАВКИ (получаем из Frontpad) ============

// Функция для получения районов из Frontpad с таймаутом
async function fetchDeliveryZonesFromFrontpad(includeInactive = false) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    // Используем публичный endpoint с sync токеном
    const response = await fetch(`${FRONTPAD_URL}/api/site/delivery-zones`, {
      signal: controller.signal,
      headers: {
        'X-Sync-Token': SITE_SYNC_TOKEN
      }
    });
    clearTimeout(timeout);
    
    if (response.ok) {
      const zones = await response.json();
      
      // Если запрошены все зоны (включая неактивные), возвращаем как есть
      if (includeInactive) {
        return zones;
      }
      
      // Иначе фильтруем только активные
      return zones.filter(z => z.is_active === 1 || z.is_active === true);
    } else {
      console.error('Ошибка получения районов из Frontpad:', response.status);
      return [];
    }
  } catch (err) {
    console.error('Ошибка fetch районов из Frontpad:', err.message);
    return [];
  }
}

// Получить все районы доставки (публичный) - получаем из Frontpad
app.get('/api/delivery-zones', async (req, res) => {
  try {
    // Пробуем получить из Frontpad
    const zones = await fetchDeliveryZonesFromFrontpad(false);
    
    if (zones.length > 0) {
      return res.json(zones);
    }
    
    // Fallback - возвращаем пустой массив если Frontpad недоступен
    // Можно добавить локальный fallback если нужно
    res.json([]);
  } catch (err) {
    console.error('Ошибка получения районов доставки:', err);
    res.json([]);
  }
});

// Получить все районы доставки (админ) - получаем из Frontpad
app.get('/api/admin/delivery-zones', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Получаем все зоны включая неактивные
    const zones = await fetchDeliveryZonesFromFrontpad(true);
    res.json(zones);
  } catch (err) {
    console.error('Ошибка получения районов доставки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать район доставки (админ) - перенаправляем на Frontpad
app.post('/api/admin/delivery-zones', authenticateToken, requireAdmin, async (req, res) => {
  const { name, min_order_amount, delivery_price, is_active, sort_order } = req.body;
  try {
    const syncToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    const response = await fetch(`${FRONTPAD_URL}/api/delivery-zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        name,
        min_order_amount: min_order_amount || 0,
        delivery_price: delivery_price || 0,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0
      })
    });
    
    if (response.ok) {
      const zone = await response.json();
      res.json(zone);
    } else {
      const error = await response.text();
      console.error('Ошибка создания района в Frontpad:', error);
      res.status(500).json({ error: 'Ошибка создания района доставки' });
    }
  } catch (err) {
    console.error('Ошибка создания района доставки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить район доставки (админ) - перенаправляем на Frontpad
app.put('/api/admin/delivery-zones/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, min_order_amount, delivery_price, is_active, sort_order } = req.body;
  try {
    const syncToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    const response = await fetch(`${FRONTPAD_URL}/api/delivery-zones/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({
        name,
        min_order_amount: min_order_amount || 0,
        delivery_price: delivery_price || 0,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0
      })
    });
    
    if (response.ok) {
      const zone = await response.json();
      res.json(zone);
    } else {
      const error = await response.text();
      console.error('Ошибка обновления района в Frontpad:', error);
      res.status(500).json({ error: 'Ошибка обновления района доставки' });
    }
  } catch (err) {
    console.error('Ошибка обновления района доставки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить район доставки (админ) - перенаправляем на Frontpad
app.delete('/api/admin/delivery-zones/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const syncToken = process.env.SITE_SYNC_TOKEN || 'D&AM!ecjdH6g';
    const response = await fetch(`${FRONTPAD_URL}/api/delivery-zones/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    if (response.ok) {
      res.json({ success: true });
    } else {
      const error = await response.text();
      console.error('Ошибка удаления района в Frontpad:', error);
      res.status(500).json({ error: 'Ошибка удаления района доставки' });
    }
  } catch (err) {
    console.error('Ошибка удаления района доставки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

