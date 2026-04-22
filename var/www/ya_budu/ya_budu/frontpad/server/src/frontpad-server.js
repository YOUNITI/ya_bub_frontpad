import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import multer from 'multer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import serveStatic from 'serve-static';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.FRONTPAD_PORT || 3005;

// ✅ 🔥 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: ЭНДПОИНТ ПЕРЕД ВСЕМИ МИДЛВАРАМИ!
app.post('/api/sizes/:sizeId/addons', async (req, res) => {
  try {
    // Проверяем что база инициализирована
    if (!db) {
      return res.status(503).json({ error: 'База данных не инициализирована' });
    }
    
    const { sizeId } = req.params;
    const { addon_id, is_required, price_modifier, sort_order } = req.body;
    
    const size = await db.get('SELECT id FROM sizes WHERE id = ?', [sizeId]);
    if (!size) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    
    const result = await db.run(
      'INSERT INTO size_addons (size_id, addon_id, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
      [sizeId, addon_id, price_modifier || 0, is_required || 0, sort_order || 0]
    );
    
    res.json({ 
      id: result.lastID, 
      size_id: sizeId, 
      addon_id, 
      is_required: is_required || 0, 
      price_modifier: price_modifier || 0,
      message: 'Доп добавлен к размеру'
    });
  } catch (err) {
    if (err.message.includes('foreign key')) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 🔥 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: ЭНДПОИНТ В САМОМ НАЧАЛЕ!
app.post('/api/sizes/:sizeId/addons', async (req, res) => {
  console.log('[DEBUG] ✅ ЗАПРОС ПОЛУЧЕН НА ПОРТ 3005! /api/sizes/:sizeId/addons');
  console.log('[DEBUG] Параметры:', req.params);
  console.log('[DEBUG] Тело:', req.body);

  try {
    // Проверяем что база инициализирована
    if (!db) {
      console.log('[DEBUG] ❌ База данных не инициализирована');
      return res.status(503).json({ error: 'База данных не инициализирована' });
    }
    
    const { sizeId } = req.params;
    const { addon_id, is_required, price_modifier, sort_order } = req.body;
    
    const size = await db.get('SELECT id FROM sizes WHERE id = ?', [sizeId]);
    if (!size) {
      console.log('[DEBUG] ❌ Размер не найден:', sizeId);
      return res.status(404).json({ error: 'Размер не найден' });
    }
    
    const result = await db.run(
      'INSERT INTO size_addons (size_id, addon_id, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
      [sizeId, addon_id, price_modifier || 0, is_required || 0, sort_order || 0]
    );
    
    console.log('[DEBUG] ✅ Доп добавлен успешно! ID:', result.lastID);
    res.json({ 
      id: result.lastID, 
      size_id: sizeId, 
      addon_id, 
      is_required: is_required || 0, 
      price_modifier: price_modifier || 0,
      message: 'Доп добавлен к размеру'
    });
  } catch (err) {
    console.log('[DEBUG] ❌ ОШИБКА:', err.message);
    if (err.message.includes('foreign key')) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ✅ 🔥 ЛОГИРОВАНИЕ НЕ НАЙДЕННЫХ МАРШРУТОВ
app.use((req, res, next) => {
  console.log(`[DEBUG] МАРШРУТ НЕ НАЙДЕН: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Маршрут не найден', method: req.method, url: req.url });
});

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Статика для загруженных изображений
app.use('/uploads', serveStatic(path.join(__dirname, '../uploads')));

// Подключение к общей базе сайта
let db;
const initializeDb = async () => {
  db = await open({
    filename: path.join(__dirname, '../yabudu.db'),
    driver: sqlite3.Database,
  });
  console.log('Frontpad подключен к базе yabudu.db');
  
  // Создаем таблицы если они не существуют
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT ''
    );
    
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      last_message TEXT,
      last_message_at TEXT,
      unread_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      message TEXT,
      sender TEXT,
      sender_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );
  `);
  console.log('Таблицы settings, chats, chat_messages готовы');
};

initializeDb();

// WebSocket соединения
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Frontpad клиент подключен');
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Рассылка уведомлений всем клиентам
const broadcast = (data) => {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
};

// Генерация номера заказа для Frontpad
const generateOrderNumber = () => {
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FP-${date}-${random}`;
};

// ============ FILE UPLOAD ============

app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Изображение не предоставлено' });
    }
    
    const { product_id } = req.body;
    const buffer = req.file.buffer;
    const imageType = req.file.mimetype.split('/')[1];
    
    // Создаем директорию для изображений если не существует
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const ext = imageType === 'jpeg' ? 'jpg' : imageType;
    const filename = `product_${product_id || 'new'}_${timestamp}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    
    // Сохраняем файл
    await writeFile(filepath, buffer);
    
    // Возвращаем URL изображения (относительный путь)
    const imageUrl = `/uploads/products/${filename}`;
    
    res.json({ url: imageUrl, filename: `/uploads/products/${filename}` });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: err.message });
  }
});

// API Routes для Frontpad

// Категории
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    const result = await db.run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
    const category = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    broadcast({ type: 'category_created', category });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  try {
    await db.run('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
    const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    broadcast({ type: 'category_updated', category });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    broadcast({ type: 'category_deleted', id });
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Товары
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order ASC, p.created_at DESC`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SORT ORDER ENDPOINTS ============

// URL основного сайта для синхронизации
const SITE_URL = 'https://xn--90ag8bb0d.com';
const SYNC_TOKEN = 'D&AM!ecjdH6g';

// Функция синхронизации порядка с основным сайтом
async function syncOrderToSite(endpoint, data) {
  try {
    await fetch(`${SITE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Token': SYNC_TOKEN
      },
      body: JSON.stringify(data)
    });
    console.log(`Синхронизация ${endpoint} с сайтом выполнена`);
  } catch (err) {
    console.error(`Ошибка синхронизации ${endpoint} с сайтом:`, err.message);
  }
}

// Обновление порядка категорий
app.put('/api/categories/reorder', async (req, res) => {
  const { categories } = req.body;
  try {
    for (const cat of categories) {
      await db.run('UPDATE categories SET sort_order = ? WHERE id = ?', [cat.sort_order, cat.id]);
    }
    const updatedCategories = await db.all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    broadcast({ type: 'categories_reordered', categories: updatedCategories });
    
    // Синхронизируем порядок с основным сайтом
    await syncOrderToSite('/api/site/categories/reorder', { categories });
    
    res.json({ success: true, categories: updatedCategories });
  } catch (err) {
    console.error('Ошибка обновления порядка категорий:', err);
    res.status(500).json({ error: err.message });
  }
});

// Обновление порядка товаров
app.put('/api/products/reorder', async (req, res) => {
  const { products } = req.body;
  try {
    for (const product of products) {
      await db.run('UPDATE products SET sort_order = ? WHERE id = ?', [product.sort_order, product.id]);
    }
    const updatedProducts = await db.all(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.sort_order ASC, p.created_at DESC`);
    broadcast({ type: 'products_reordered', products: updatedProducts });
    
    // Синхронизируем порядок с основным сайтом
    await syncOrderToSite('/api/site/products/reorder', { products });
    
    res.json({ success: true, products: updatedProducts });
  } catch (err) {
    console.error('Ошибка обновления порядка товаров:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, image_url, category_id } = req.body;
  try {
    const result = await db.run('INSERT INTO products (name, description, price, image_url, category_id) VALUES (?, ?, ?, ?, ?)', 
      [name, description || '', price || 0, image_url || '', category_id || null]);
    const product = await db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [result.lastID]);
    broadcast({ type: 'product_created', product });
    res.json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  console.log('[/api/products/:id] Обновление товара ID:', id, 'данные:', updates);
  
  try {
    // Получаем текущие данные товара
    const currentProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!currentProduct) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    // Объединяем текущие данные с новыми (обновляем только переданные поля)
    const name = updates.name !== undefined ? updates.name : currentProduct.name;
    const description = updates.description !== undefined ? updates.description : currentProduct.description;
    const price = updates.price !== undefined ? updates.price : (currentProduct.price || 0);
    const image_url = updates.image_url !== undefined ? updates.image_url : currentProduct.image_url;
    const category_id = updates.category_id !== undefined ? updates.category_id : currentProduct.category_id;
    const is_active = updates.is_active !== undefined ? updates.is_active : currentProduct.is_active;
    
    await db.run(
      'UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?, is_active = ? WHERE id = ?',
      [name, description, price, image_url, category_id || null, is_active, id]
    );
    
    const product = await db.get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [id]);
    broadcast({ type: 'product_updated', product });
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    broadcast({ type: 'product_deleted', id });
    res.json({ message: 'Товар удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Заказы
app.get('/api/orders', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM orders';
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const orders = await db.all(query, params);
    orders.forEach(order => {
      try {
        order.items = JSON.parse(order.items);
      } catch (e) {
        order.items = [];
      }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    try {
      order.items = JSON.parse(order.items);
    } catch (e) {
      order.items = [];
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создание заказа из Frontpad
app.post('/api/orders', async (req, res) => {
  const { 
    guest_name, guest_phone, guest_email, 
    order_type, payment, comment, items, total_amount,
    address, street, building, apartment, entrance, floor, intercom,
    is_asap, delivery_date, delivery_time, custom_time
  } = req.body;
  
  console.log('[/api/orders] Получен запрос на создание заказа:', {
    guest_name, guest_phone, order_type, total_amount,
    items_count: items?.length
  });
  
  try {
    // Проверяем items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Товары обязательны для заказа' });
    }
    
    if (total_amount === undefined || total_amount === null) {
      return res.status(400).json({ error: 'Сумма заказа обязательна' });
    }
    
    // Используем московское время (UTC+3)
    const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    
    // Формируем полный адрес
    const fullAddress = address || 
      (street ? street + (building ? ', д.' + building : '') + (apartment ? ', кв.' + apartment : '') : '');
    
    const result = await db.run(
      `INSERT INTO orders 
       (guest_name, guest_phone, guest_email, order_type, payment, comment, items, total_amount, 
        status, created_at, address, street, building, apartment, entrance, floor, intercom, 
        is_asap, delivery_date, delivery_time, custom_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'новый', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guest_name, guest_phone, guest_email || null, 
        order_type || 'delivery', payment || 'cash', comment || null, 
        JSON.stringify(items), total_amount,
        moscowTime,
        fullAddress || null, street || null, building || null, apartment || null, 
        entrance || null, floor || null, intercom || null,
        is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
        delivery_date || null, delivery_time || null, custom_time || null
      ]
    );
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
    order.items = JSON.parse(order.items);
    
    // Отправляем уведомление всем клиентам Frontpad
    broadcast({ type: 'new_order', order });
    
    console.log('[/api/orders] Заказ создан успешно, ID:', result.lastID);
    
    res.json(order);
  } catch (err) {
    console.error('[/api/orders] Ошибка создания заказа:', err);
    res.status(500).json({ error: err.message });
  }
});

// Обновление заказа полностью
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    guest_name, guest_phone, guest_email, 
    order_type, payment, comment, items, total_amount, status,
    address, street, building, apartment, entrance, floor, intercom,
    is_asap, delivery_date, delivery_time, custom_time
  } = req.body;
  try {
    // Формируем полный адрес
    const fullAddress = address || 
      (street ? street + (building ? ', д.' + building : '') + (apartment ? ', кв.' + apartment : '') : '');
    
    await db.run(
      `UPDATE orders SET 
        guest_name = ?, guest_phone = ?, guest_email = ?, 
        order_type = ?, payment = ?, comment = ?, items = ?, total_amount = ?, status = ?,
        address = ?, street = ?, building = ?, apartment = ?, entrance = ?, floor = ?, intercom = ?,
        is_asap = ?, delivery_date = ?, delivery_time = ?, custom_time = ?
       WHERE id = ?`,
      [
        guest_name, guest_phone, guest_email || null,
        order_type || 'delivery', payment || 'cash', comment || null,
        JSON.stringify(items), total_amount, status || 'новый',
        fullAddress || null, street || null, building || null, apartment || null,
        entrance || null, floor || null, intercom || null,
        is_asap !== undefined ? (is_asap ? 1 : 0) : 1,
        delivery_date || null, delivery_time || null, custom_time || null,
        id
      ]
    );
    
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = JSON.parse(order.items);
    
    broadcast({ type: 'order_updated', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновление статуса заказа
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    order.items = JSON.parse(order.items);
    
    console.log(`[STATUS_CHANGE] Статус заказа #${id} изменён на "${status}"`);
    
    // Синхронизируем статус с основным сайтом
    try {
      const syncToken = 'D&AM!ecjdH6g';
      const SITE_URL = 'https://xn--90ag8bb0d.com';
      
      await fetch(`${SITE_URL}/api/site/orders/status-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': syncToken
        },
        body: JSON.stringify({
          order_id: id,
          status: status
        })
      });
      console.log(`[STATUS_SYNC] Статус заказа #${id} синхронизирован с основным сайтом`);
    } catch (syncErr) {
      console.error(`[STATUS_SYNC] Ошибка синхронизации статуса:`, syncErr.message);
    }
    
    broadcast({ type: 'order_status_changed', order });
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление заказа
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Получаем данные заказа перед удалением
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    
    await db.run('DELETE FROM orders WHERE id = ?', [id]);
    broadcast({ type: 'order_deleted', id });
    
    // Синхронизируем удаление с основным сайтом
    try {
      const syncToken = 'D&AM!ecjdH6g';
      const SITE_URL = 'https://xn--90ag8bb0d.com';
      
      // Используем site_order_id если есть, чтобы основной сайт мог найти заказ
      const orderIdForSync = order?.site_order_id || id;
      
      await fetch(`${SITE_URL}/api/site/orders/delete-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': syncToken
        },
        body: JSON.stringify({
          order_id: orderIdForSync
        })
      });
      console.log(`[DELETE_SYNC] Удаление заказа #${id} синхронизировано с основным сайтом (ID: ${orderIdForSync})`);
    } catch (syncErr) {
      console.error(`[DELETE_SYNC] Ошибка синхронизации удаления:`, syncErr.message);
    }
    
    res.json({ message: 'Заказ удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Клиенты
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.all('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;
  const email = phone + '@younitipad.local';
  try {
    const result = await db.run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', [name, email, phone, address || null]);
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Отчёты
app.get('/api/reports/sales', async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE status != 'cancelled'
    `;
    const params = [];
    if (date_from) {
      query += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    const data = await db.all(query, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/top-products', async (req, res) => {
  const { date_from, date_to, limit = 10 } = req.query;
  try {
    let whereClause = "WHERE o.status != 'cancelled'";
    const params = [];
    if (date_from) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }
    
    // Получаем все заказы за период
    const orders = await db.all(`SELECT items FROM orders ${whereClause}`, params);
    
    // Подсчитываем популярность товаров
    const productStats = {};
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        items.forEach(item => {
          const name = item.name || item.product_name;
          if (!productStats[name]) {
            productStats[name] = { product_name: name, total_quantity: 0, total_revenue: 0 };
          }
          productStats[name].total_quantity += item.quantity;
          productStats[name].total_revenue += (item.price * item.quantity);
        });
      } catch (e) {}
    });
    
    const result = Object.values(productStats)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, parseInt(limit));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');
    
    const todayOrders = await db.get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ? AND status != 'cancelled'`, [today]);
    const yesterdayOrders = await db.get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ? AND status != 'cancelled'`, [yesterday]);
    const monthOrders = await db.get(`SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'`, [thisMonth]);
    const pendingOrders = await db.get(`SELECT COUNT(*) as count FROM orders WHERE status IN ('новый', 'в производстве')`);
    const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
    const totalCustomers = await db.get('SELECT COUNT(*) as count FROM customers');
    
    res.json({
      today_orders: { count: todayOrders.count || 0, total: todayOrders.total || 0 },
      yesterday_orders: { count: yesterdayOrders.count || 0, total: yesterdayOrders.total || 0 },
      month_orders: { count: monthOrders.count || 0, total: monthOrders.total || 0 },
      pending_orders: { count: pendingOrders.count || 0 },
      total_products: { count: totalProducts.count || 0 },
      total_customers: { count: totalCustomers.count || 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Печать чека
app.post('/api/orders/:id/print', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    order.items = JSON.parse(order.items);
    
    // Формируем HTML чек для печати
    const shopName = 'Я Буду';
    const shopAddress = 'ул. Примерная, 1';
    const shopPhone = '+7 (999) 123-45-67';
    
    const itemsHtml = order.items.map(item => `
      <tr>
        <td>${item.name} ×${item.quantity}</td>
        <td>${(item.price * item.quantity).toFixed(2)} ₽</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Чек #${order.id}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .order-info { margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-weight: bold; font-size: 16px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div>${shopAddress}</div>
          <div>${shopPhone}</div>
        </div>
        <div class="order-info">
          <strong>Заказ #${order.id}</strong><br>
          Дата: ${new Date(order.created_at).toLocaleString('ru-RU')}<br>
          Клиент: ${order.guest_name || 'Гость'}<br>
          Телефон: ${order.guest_phone || '-'}<br>
          ${order.address ? 'Адрес: ' + order.address + '<br>' : ''}
          Тип: ${order.order_type === 'delivery' ? 'Доставка' : 'Самовывоз'}<br>
          Оплата: ${order.payment === 'cash' ? 'Наличные' : order.payment === 'card' ? 'Карта' : 'Онлайн'}
        </div>
        <table>
          ${itemsHtml}
        </table>
        <div class="total">
          ИТОГО: ${order.total_amount} ₽
        </div>
        <div class="footer">
          Спасибо за заказ!
        </div>
      </body>
      </html>
    `;
    
    // Отправляем HTML клиенту
    res.json({ html, message: 'Чек сформирован' });
    
    // Также отправляем команду на печать всем подключенным клиентам (если есть физические принтеры)
    broadcast({ type: 'print_receipt', receipt: { orderId: order.id } });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для получения новых заказов с сайта (для мгновенного отображения)
app.get('/api/orders/new/check', async (req, res) => {
  try {
    const lastCheck = req.query.since || moment().subtract(5, 'minutes').toISOString();
    const orders = await db.all(
      'SELECT * FROM orders WHERE created_at > ? ORDER BY created_at DESC',
      [lastCheck]
    );
    orders.forEach(order => {
      try {
        order.items = JSON.parse(order.items);
      } catch (e) {
        order.items = [];
      }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ADDON TEMPLATES ============

app.get('/api/addon-templates', async (req, res) => {
  try {
    const addons = await db.all('SELECT * FROM addon_templates WHERE is_active = 1 ORDER BY name');
    res.json(addons || []);
  } catch (err) {
    console.error('Error fetching addon templates:', err.message);
    res.json([]);
  }
});

app.get('/api/addon-templates/:id', async (req, res) => {
  try {
    const addon = await db.get('SELECT * FROM addon_templates WHERE id = ?', [req.params.id]);
    if (!addon) return res.status(404).json({ error: 'Шаблон дополнения не найден' });
    res.json(addon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/addon-templates', async (req, res) => {
  const { name, description, default_price, sort_order, unit, is_active } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO addon_templates (name, description, default_price, sort_order, unit, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', default_price || 0, sort_order || 0, unit || 'шт', is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );
    res.json({ id: result.lastID, name, description, default_price, sort_order, unit, is_active: is_active || 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/addon-templates/:id', async (req, res) => {
  const { name, description, default_price, sort_order, is_active, unit } = req.body;
  try {
    await db.run(
      'UPDATE addon_templates SET name = ?, description = ?, default_price = ?, sort_order = ?, is_active = ?, unit = ? WHERE id = ?',
      [name, description || '', default_price || 0, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1, unit || 'шт', req.params.id]
    );
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/addon-templates/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM addon_templates WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ INGREDIENTS ============

app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await db.all('SELECT * FROM ingredients ORDER BY name');
    res.json(ingredients || []);
  } catch (err) {
    console.error('Error fetching ingredients:', err.message);
    res.json([]);
  }
});

app.get('/api/ingredients/critical', async (req, res) => {
  try {
    // Ингредиенты где current_quantity <= min_quantity (или min_quantity = 0)
    const ingredients = await db.all(
      'SELECT * FROM ingredients WHERE current_quantity <= COALESCE(min_quantity, 0) ORDER BY current_quantity ASC'
    );
    res.json(ingredients || []);
  } catch (err) {
    console.error('Error fetching critical ingredients:', err.message);
    res.json([]);
  }
});

app.get('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredient = await db.get('SELECT * FROM ingredients WHERE id = ?', [req.params.id]);
    if (!ingredient) return res.status(404).json({ error: 'Ингредиент не найден' });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingredients', async (req, res) => {
  const { name, unit, current_quantity, min_quantity, cost_per_unit, supplier } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO ingredients (name, unit, current_quantity, min_quantity, cost_per_unit, supplier) VALUES (?, ?, ?, ?, ?, ?)',
      [name, unit || 'шт', current_quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier || null]
    );
    res.json({ id: result.lastID, name, unit, current_quantity, min_quantity, cost_per_unit, supplier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  const { name, unit, current_quantity, min_quantity, cost_per_unit, supplier } = req.body;
  try {
    await db.run(
      'UPDATE ingredients SET name = ?, unit = ?, current_quantity = ?, min_quantity = ?, cost_per_unit = ?, supplier = ? WHERE id = ?',
      [name, unit || 'шт', current_quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier || null, req.params.id]
    );
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ RECIPES ============

app.get('/api/recipes/product/:productId', async (req, res) => {
  try {
    const recipes = await db.all('SELECT r.*, i.name as ingredient_name, i.unit FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id WHERE r.product_id = ?', [req.params.productId]);
    res.json(recipes || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await db.all('SELECT r.*, p.name as product_name, i.name as ingredient_name FROM recipes r JOIN products p ON r.product_id = p.id JOIN ingredients i ON r.ingredient_id = i.id ORDER BY p.name');
    res.json(recipes || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/recipes', async (req, res) => {
  const { product_id, ingredient_name, ingredient_unit, ingredient_cost, quantity, unit } = req.body;
  
  try {
    // Ищем или создаём ингредиент
    let ingredient;
    if (ingredient_name) {
      ingredient = await db.get('SELECT * FROM ingredients WHERE name = ?', [ingredient_name]);
      if (!ingredient) {
        const result = await db.run(
          'INSERT INTO ingredients (name, unit, cost_per_unit) VALUES (?, ?, ?)',
          [ingredient_name, ingredient_unit || 'шт', ingredient_cost || 0]
        );
        ingredient = { id: result.lastID, name: ingredient_name, unit: ingredient_unit || 'шт' };
      }
    } else {
      ingredient = await db.get('SELECT * FROM ingredients WHERE id = ?', [req.body.ingredient_id]);
    }
    
    if (!ingredient) {
      return res.status(400).json({ error: 'Ингредиент не найден' });
    }
    
    const result = await db.run(
      'INSERT INTO recipes (product_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
      [product_id, ingredient.id, quantity || 1, unit || ingredient.unit]
    );
    res.json({ id: result.lastID, product_id, ingredient_id: ingredient.id, quantity: quantity || 1, unit: unit || ingredient.unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PREORDER DATES ============

app.get('/api/preorder-dates', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    // Используем SQLite совместимый синтаксис с GROUP BY даты
    // Добавляем проверку delivery_date != '' и delivery_date != 'NULL' и TRIM() для фильтрации пустых строк
    const dates = await db.all(
      `SELECT MIN(delivery_date) as delivery_date, COUNT(*) as order_count FROM orders 
       WHERE is_asap = 0 AND delivery_date IS NOT NULL AND delivery_date != '' AND delivery_date != 'NULL' AND TRIM(delivery_date) != '' AND LENGTH(TRIM(delivery_date)) > 0 AND DATE(TRIM(delivery_date)) >= ? 
       AND status NOT IN ('delivered', 'cancelled') 
       GROUP BY DATE(TRIM(delivery_date)) ORDER BY delivery_date ASC`,
      [today]
    );
    res.json(dates || []);
  } catch (err) {
    console.error('[/api/preorder-dates] Error:', err.message);
    res.json([]);
  }
});

app.get('/api/preorders/:date', async (req, res) => {
  try {
    const orders = await db.all(
      `SELECT * FROM orders WHERE delivery_date = ? AND delivery_date > date('now') 
       AND status NOT IN ('delivered', 'cancelled') ORDER BY created_at DESC`,
      [req.params.date]
    );
    orders.forEach(order => {
      try { order.items = JSON.parse(order.items); } catch (e) { order.items = []; }
    });
    res.json(orders);
  } catch (err) {
    res.json([]);
  }
});

// ============ DISCOUNTS ============

app.get('/api/discounts', async (req, res) => {
  try {
    const discounts = await db.all('SELECT * FROM discounts WHERE is_active = 1 ORDER BY created_at DESC');
    res.json(discounts || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/discounts', async (req, res) => {
  const { name, description, type, value, min_order_amount, max_discount_amount, code, valid_from, valid_to, usage_limit } = req.body;
  try {
    const result = await db.run(
      `INSERT INTO discounts (name, description, type, value, min_order_amount, max_discount_amount, code, valid_from, valid_to, usage_limit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', type || 'percent', value, min_order_amount || 0, max_discount_amount || null, code || null, valid_from || null, valid_to || null, usage_limit || null]
    );
    res.json({ id: result.lastID, name, type, value, is_active: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SIZES ============

app.get('/api/sizes', async (req, res) => {
  try {
    const sizes = await db.all('SELECT * FROM sizes ORDER BY sort_order');
    res.json(sizes || []);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/products/:productId/sizes', async (req, res) => {
  try {
    const sizes = await db.all('SELECT * FROM sizes WHERE product_id = ? ORDER BY sort_order', [req.params.productId]);
    res.json(sizes || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/sizes', async (req, res) => {
    const { name, size_value, price } = req.body;
    try {
        // 🔍 ПРОВЕРКА:是否存在相同尺寸
        const existing = await db.get(
            'SELECT * FROM sizes WHERE product_id = ? AND name = ? AND size_value = ?',
            [req.params.productId, name, size_value || name]
        );
        
        if (existing) {
            return res.status(400).json({ 
                error: 'Такой размер уже существует',
                existing: { id: existing.id, name: existing.name, size_value: existing.size_value }
            });
        }
        
        const result = await db.run(
            'INSERT INTO sizes (product_id, name, size_value, price) VALUES (?, ?, ?, ?)',
            [req.params.productId, name, size_value || name, price || 0]
        );
        res.json({ id: result.lastID, product_id: req.params.productId, name, size_value, price });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:productId/sizes', async (req, res) => {
  try {
    await db.run('DELETE FROM sizes WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:productId/sizes/:sizeId - обновить размер (для сохранения size-addons)
app.put('/api/products/:productId/sizes/:sizeId', async (req, res) => {
  const { name, size_value, price } = req.body;
  try {
    await db.run(
      'UPDATE sizes SET name = ?, size_value = ?, price = ? WHERE id = ? AND product_id = ?',
      [name, size_value || name, price || 0, req.params.sizeId, req.params.productId]
    );
    const size = await db.get('SELECT * FROM sizes WHERE id = ?', [req.params.sizeId]);
    res.json(size);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCT DISCOUNTS ============

app.get('/api/products/:productId/discounts', async (req, res) => {
  try {
    const discounts = await db.all('SELECT * FROM product_discounts WHERE product_id = ?', [req.params.productId]);
    res.json(discounts || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/discounts', async (req, res) => {
  const { name, type, value, valid_from, valid_to, is_active } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO product_discounts (product_id, name, type, value, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.productId, name, type || 'percent', value, valid_from || null, valid_to || null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );
    res.json({ id: result.lastID, product_id: req.params.productId, name, type, value, is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:productId/discounts', async (req, res) => {
  try {
    await db.run('DELETE FROM product_discounts WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCT ADDONS ============

app.get('/api/products/:productId/addons', async (req, res) => {
  try {
    const addons = await db.all('SELECT pa.*, at.name as addon_name, at.default_price FROM product_addons pa JOIN addon_templates at ON pa.addon_template_id = at.id WHERE pa.product_id = ?', [req.params.productId]);
    res.json(addons || []);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/products/:productId/addons', async (req, res) => {
  const { addon_template_id, custom_price } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO product_addons (product_id, addon_template_id, custom_price) VALUES (?, ?, ?)',
      [req.params.productId, addon_template_id, custom_price || null]
    );
    res.json({ id: result.lastID, product_id: req.params.productId, addon_template_id, custom_price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:productId/addons', async (req, res) => {
  try {
    await db.run('DELETE FROM product_addons WHERE product_id = ?', [req.params.productId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SIZE ADDONS (Допы для конкретных размеров) ============

// Получить все size_addons
app.get('/api/size-addons', async (req, res) => {
  try {
    const sizeAddons = await db.all(`
      SELECT sa.*, s.name as size_name, s.product_id, at.name as addon_name, at.default_price as addon_price
      FROM size_addons sa
      JOIN sizes s ON sa.size_id = s.id
      JOIN addon_templates at ON sa.addon_id = at.id
      ORDER BY s.product_id, s.sort_order, sa.sort_order
    `);
    res.json(sizeAddons || []);
  } catch (err) {
    res.json([]);
  }
});

// Получить size_addons для конкретного размера
app.get('/api/sizes/:sizeId/size-addons', async (req, res) => {
  try {
    const sizeAddons = await db.all(`
      SELECT sa.*, at.name, at.default_price
      FROM size_addons sa
      JOIN addon_templates at ON sa.addon_id = at.id
      WHERE sa.size_id = ?
      ORDER BY sa.sort_order
    `, [req.params.sizeId]);
    res.json(sizeAddons || []);
  } catch (err) {
    res.json([]);
  }
});

// Получить все size_addons для товара
app.get('/api/products/:productId/size-addons', async (req, res) => {
  try {
    const sizesWithAddons = await db.all(`
      SELECT 
        s.id as size_id,
        s.name as size_name,
        s.price_modifier,
        s.sort_order as size_sort_order,
        sa.id as size_addon_id,
        sa.addon_id,
        sa.is_required,
        sa.price_modifier as addon_price_modifier,
        sa.sort_order as addon_sort_order,
        at.name as addon_name,
        at.default_price as addon_base_price
      FROM sizes s
      LEFT JOIN size_addons sa ON s.id = sa.size_id
      LEFT JOIN addon_templates at ON sa.addon_id = at.id
      WHERE s.product_id = ?
      ORDER BY s.sort_order ASC, sa.sort_order ASC
    `, [req.params.productId]);
    
    // Группируем по размерам
    const result = {};
    sizesWithAddons.forEach(row => {
      if (!result[row.size_id]) {
        result[row.size_id] = {
          id: row.size_id,
          name: row.size_name,
          price_modifier: row.price_modifier,
          sort_order: row.size_sort_order,
          addons: []
        };
      }
      if (row.addon_id) {
        result[row.size_id].addons.push({
          id: row.size_addon_id,
          addon_id: row.addon_id,
          name: row.addon_name,
          price: row.addon_base_price,
          price_modifier: row.addon_price_modifier,
          is_required: row.is_required,
          sort_order: row.addon_sort_order
        });
      }
    });
    
    res.json(result);
  } catch (err) {
    res.json({});
  }
});

// Добавить доп к размеру
app.post('/api/sizes/:sizeId/size-addons', async (req, res) => {
  const { addon_id, is_required, price_modifier, sort_order } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO size_addons (size_id, addon_id, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
      [sizeId, addon_id, price_modifier || 0, is_required || 0, sort_order || 0]
    );
    res.json({ id: result.lastID, size_id: req.params.sizeId, addon_id, is_required, price_modifier, sort_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Обновить size_addon
app.put('/api/size-addons/:id', async (req, res) => {
  const { is_required, price_modifier, sort_order } = req.body;
  try {
    await db.run(
      'UPDATE size_addons SET is_required = ?, price_modifier = ?, sort_order = ? WHERE id = ?',
      [is_required ? 1 : 0, price_modifier || 0, sort_order || 0, req.params.id]
    );
    res.json({ updated: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить size_addon
app.delete('/api/size-addons/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM size_addons WHERE id = ?', [req.params.id]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ALIAS ENDPOINTS для совместимости с Frontend ============

// DELETE /api/products/:productId/sizes/:sizeId/addons -> удалить все size_addons для размера
app.delete('/api/products/:productId/sizes/:sizeId/addons', async (req, res) => {
  try {
    await db.run('DELETE FROM size_addons WHERE size_id = ?', [req.params.sizeId]);
    res.json({ deleted: 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



 // ✅ НОВЫЙ ENDPOINT: Обработка дополнений для размера
app.post('/api/products/:productId/sizes/:sizeId/addons', async (req, res) => {
  try {
    const { productId, sizeId } = req.params;
    const addons = req.body;

    console.log('[FRONTPAD] Запрос на добавление допов для размера:', sizeId, 'товар:', productId);
    console.log('[FRONTPAD] Допы из запроса:', addons);
    console.log('[FRONTPAD] Количество допов:', addons ? addons.length : 0);

    // Проверяем, существует ли размер
    const size = await db.get('SELECT id FROM sizes WHERE id = ?', [sizeId]);
    if (!size) {
      console.log('[FRONTPAD] Размер не найден:', sizeId);
      return res.status(400).json({
        error: 'Размер не найден',
        message: 'Невозможно добавить дополнение: указанный размер не существует в базе данных'
      });
    }

    console.log('[FRONTPAD] Размер найден, добавляем допы...');

    // Удаляем старые дополнения для этого размера
    await db.run('DELETE FROM size_addons WHERE size_id = ?', [sizeId]);

    // Добавляем новые дополнения
    if (addons && Array.isArray(addons) && addons.length > 0) {
      console.log('[FRONTPAD] Добавляем', addons.length, 'допов');
      for (const addon of addons) {
        console.log('[FRONTPAD] Добавляем доп:', addon);
        await db.run(`
          INSERT INTO size_addons (size_id, addon_id, price_modifier, is_required)
          VALUES (?, ?, ?, ?)
        `, [sizeId, addon.addon_id, addon.price_modifier || 0, addon.is_required || 0]);
      }
    } else {
      console.log('[FRONTPAD] Нет допов для добавления');
    }

    console.log('[FRONTPAD] Допы успешно добавлены');
    res.json({ success: true, addons_added: addons ? addons.length : 0 });
  } catch (error) {
    console.error('[FRONTPAD] Ошибка при добавлении дополнений:', error);
    res.status(500).json({ error: 'Ошибка сервера при добавлении дополнений' });
  }
});





// ============ SETTINGS ============

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.json({
      auto_print_enabled: false,
      sound_notifications: true,
      print_receipt_on_status_change: false,
      shop_name: 'Я Буду',
      shop_address: '',
      shop_phone: ''
    });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  try {
    await db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [key, value, value]
    );
    res.json({ key, value });
  } catch (err) {
    console.error('Error updating setting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ CHATS ============

app.get('/api/chats', async (req, res) => {
  try {
    const chats = await db.all(`
      SELECT 
        c.id,
        c.customer_id,
        c.customer_name,
        c.customer_phone,
        c.last_message,
        c.last_message_at,
        c.unread_count,
        c.status
      FROM chats c
      ORDER BY c.last_message_at DESC
    `);
    res.json(chats || []);
  } catch (err) {
    console.error('Error fetching chats:', err.message);
    res.json([]);
  }
});

app.get('/api/chats/:id', async (req, res) => {
  try {
    const chat = await db.get('SELECT * FROM chats WHERE id = ?', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    
    const messages = await db.all(
      'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    
    res.json({ ...chat, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Используем multer для парсинга FormData
const chatUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/chats/:id/messages', chatUpload.none(), async (req, res) => {
  const { id } = req.params;
  
  console.log('=== POST /api/chats/:id/messages ===');
  console.log('chat_id:', id);
  console.log('body:', req.body);
  
  const message = req.body.message || req.body.text || req.body.content || '';
  const sender = req.body.sender || 'admin';
  const sender_name = req.body.sender_name || 'Admin';
  
  console.log('Extracted message:', message);
  
  // Московское время (UTC+3)
  const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  
  try {
    const result = await db.run(
      `INSERT INTO chat_messages (chat_id, message, sender, sender_name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, message, sender, sender_name, moscowTime]
    );
    
    console.log('Message saved with id:', result.lastID);
    
    await db.run(
      `UPDATE chats SET last_message = ?, last_message_at = ?, unread_count = ? WHERE id = ?`,
      [message || 'Сообщение', moscowTime, sender === 'admin' ? 0 : 1, id]
    );
    
    // Получаем данные чата для синхронизации с сайтом
    const chat = await db.get('SELECT * FROM chats WHERE id = ?', [id]);
    
    // Синхронизируем сообщение с основным сайтом
    try {
      await fetch('https://xn--90ag8bb0d.com/api/site/messages/sync-from-frontpad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Token': 'D&AM!ecjdH6g'
        },
        body: JSON.stringify({
          chat_id: id,
          customer_id: chat.customer_id,
          customer_name: chat.customer_name,
          customer_phone: chat.customer_phone,
          message: message,
          sender: sender,
          sender_name: sender_name,
          timestamp: moscowTime
        })
      });
      console.log('Сообщение синхронизировано с основным сайтом');
    } catch (syncErr) {
      console.error('Ошибка синхронизации с сайтом:', syncErr.message);
    }
    
    res.json({ id: result.lastID, chat_id: id, message, sender, sender_name, created_at: moscowTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Сброс unread_count при открытии чата
app.post('/api/chats/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('UPDATE chats SET unread_count = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ СИНХРОНИЗАЦИЯ ЗАКАЗОВ С САЙТА ============

// Endpoint для синхронизации заказов с основного сайта
app.post('/api/site/orders/sync', async (req, res) => {
  const {
    order_id, order_number, guest_name, guest_phone, guest_email,
    order_type, address, entrance, floor, intercom,
    building, street, apartment,
    is_asap, delivery_date, delivery_time, custom_time,
    payment, comment, items, total_amount, status, created_at
  } = req.body;
  
  try {
    // Проверяем токен синхронизации
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = 'D&AM!ecjdH6g';
    
    if (syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Проверяем существует ли заказ с таким order_id с сайта
    const existingOrder = await db.get('SELECT * FROM orders WHERE site_order_id = ?', [order_id]);
    
    if (existingOrder) {
      // Заказ уже существует, обновляем его
      await db.run(`
        UPDATE orders SET
          guest_name = ?, guest_phone = ?, guest_email = ?,
          order_type = ?, address = ?, entrance = ?, floor = ?, intercom = ?,
          building = ?, street = ?, apartment = ?,
          is_asap = ?, delivery_date = ?, delivery_time = ?, custom_time = ?,
          payment = ?, comment = ?, items = ?, total_amount = ?, status = ?,
          created_at = ?
        WHERE site_order_id = ?
      `, [
        guest_name, guest_phone, guest_email || null,
        order_type || 'delivery', address || null, entrance || null, floor || null, intercom || null,
        building || null, street || null, apartment || null,
        is_asap ? 1 : 0, delivery_date || null, delivery_time || null, custom_time || null,
        payment || 'cash', comment || null, JSON.stringify(items || []), total_amount, status || 'новый',
        order_id
      ]);
      
      const updatedOrder = await db.get('SELECT * FROM orders WHERE site_order_id = ?', [order_id]);
      updatedOrder.items = JSON.parse(updatedOrder.items);
      
      // Отправляем уведомление об обновлении
      broadcast({ type: 'order_updated', order: updatedOrder });
      
      res.json({ message: 'Заказ обновлён', order: updatedOrder });
    } else {
      // Создаём новый заказ
      const moscowTime = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      
      const result = await db.run(`
        INSERT INTO orders
        (site_order_id, order_number, guest_name, guest_phone, guest_email,
         order_type, address, entrance, floor, intercom,
         building, street, apartment,
         is_asap, delivery_date, delivery_time, custom_time,
         payment, comment, items, total_amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order_id, order_number, guest_name, guest_phone, guest_email || null,
        order_type || 'delivery', address || null, entrance || null, floor || null, intercom || null,
        building || null, street || null, apartment || null,
        is_asap ? 1 : 0, delivery_date || null, delivery_time || null, custom_time || null,
        payment || 'cash', comment || null, JSON.stringify(items || []), total_amount, status || 'новый',
      ]);
      
      const order = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
      order.items = JSON.parse(order.items);
      
      // Отправляем уведомление о новом заказе через WebSocket
      broadcast({ type: 'new_order', order });
      
      console.log(`Заказ ${order_number} синхронизирован с сайта, отправлен broadcast new_order`);
      
      res.json({ message: 'Заказ создан', order });
    }
  } catch (err) {
    console.error('Ошибка синхронизации заказа:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ СИНХРОНИЗАЦИОННЫЕ ENDPOINTS ============

// Синхронизация сообщений с основного сайта
app.post('/api/site/messages/sync', async (req, res) => {
  const {
    message_id, sender_id, customer_name, customer_phone,
    content, is_admin, timestamp, cart_data, cart_total
  } = req.body;
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = 'D&AM!ecjdH6g';
    
    if (syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    // Найти или создать чат для этого клиента
    let chat = await db.get('SELECT * FROM chats WHERE customer_id = ?', [sender_id]);
    
    if (!chat) {
      const result = await db.run(
        `INSERT INTO chats (customer_id, customer_name, customer_phone, last_message, last_message_at, unread_count, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [sender_id, customer_name || 'Клиент', customer_phone || '', content || '', timestamp || new Date().toISOString(), is_admin ? 0 : 1]
      );
      chat = await db.get('SELECT * FROM chats WHERE id = ?', [result.lastID]);
    } else {
      // Обновить последнее сообщение
      await db.run(
        `UPDATE chats SET last_message = ?, last_message_at = ?, unread_count = ? WHERE id = ?`,
        [content || '', timestamp || new Date().toISOString(), is_admin ? 0 : 1, chat.id]
      );
    }
    
    // Сохранить сообщение
    const messageResult = await db.run(
      `INSERT INTO chat_messages (chat_id, message, sender, sender_name, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [chat.id, content || '', is_admin ? 'admin' : 'customer', is_admin ? 'Администратор' : (customer_name || 'Клиент'), timestamp || new Date().toISOString()]
    );
    
    // Если сообщение от клиента (не от админа), отправляем уведомление через WebSocket
    if (!is_admin) {
      broadcast({
        type: 'new_chat_message',
        chat_id: chat.id,
        customer_id: sender_id,
        customer_name: customer_name || 'Клиент',
        customer_phone: customer_phone || '',
        message: content || '',
        cart_data: cart_data ? JSON.parse(cart_data) : null,
        cart_total: cart_total || 0,
        timestamp: timestamp || new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      chat_id: chat.id,
      message_id: messageResult.lastID
    });
  } catch (err) {
    console.error('Ошибка синхронизации сообщения:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint для обновления статуса чата в YounitiPad (когда админ отвечает)
app.post('/api/site/chats/update', async (req, res) => {
  const { customer_id, status } = req.body;
  
  try {
    const syncToken = req.headers['x-sync-token'];
    const expectedToken = 'D&AM!ecjdH6g';
    
    if (syncToken !== expectedToken) {
      return res.status(403).json({ error: 'Неверный токен синхронизации' });
    }
    
    await db.run('UPDATE chats SET status = ? WHERE customer_id = ?', [status || 'closed', customer_id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`YounitiPad Server запущен на порту ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

export default db;
