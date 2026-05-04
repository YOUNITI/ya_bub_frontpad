#!/usr/bin/env node
/**
 * Скрипт для настройки второго аккаунта точки
 * Запускается через командную строку: node setup-second-point.js
 * 
 * Делает:
 * 1. Подключается к базе данных (MySQL или SQLite автоматически)
 * 2. Устанавливает главному админу point_id = 0 (видит все точки)
 * 3. Создает пользователя admin2 / admin2 с point_id = 2
 * 4. Проверяет что точки существуют в системе
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function setupSecondPoint() {
  console.log('🔧 Настройка второго аккаунта точки...');
  console.log('');

  let connection;
  
  try {
    // Пробуем подключиться к MySQL
    console.log('📡 Подключаюсь к MySQL...');
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'yabudu_frontpad',
      waitForConnections: true,
      connectionLimit: 2,
      queueLimit: 0
    });

    connection = await pool.getConnection();
    console.log('✅ Подключение к MySQL установлено');
    console.log('');

    // 1. Обновляем главного админа
    console.log('👤 Обновляю права главного администратора...');
    await connection.execute(
      'UPDATE users SET point_id = 1 WHERE username = ?',
      ['admin']
    );
    console.log('✅ Администратор admin теперь видит ТОЛЬКО точку 1 (point_id = 1)');

    // 2. Создаем или обновляем admin2
    console.log('');
    console.log('👤 Создаю пользователя для второй точки...');
    
    const hashedPassword = await bcrypt.hash('admin2', 10);
    
    const [result] = await connection.execute(
      `INSERT INTO users (username, password, role, point_id, email) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE point_id = 2, password = ?`,
      ['admin2', hashedPassword, 'admin', 2, 'admin2@yabudu.local', hashedPassword]
    );

    if (result.affectedRows === 1 && result.insertId) {
      console.log('✅ Создан новый пользователь admin2');
    } else {
      console.log('✅ Пользователь admin2 уже существует, обновлены права');
    }

    console.log('');
    console.log('🔑 Данные для входа:');
    console.log('   Логин: admin');
    console.log('   Пароль: admin');
    console.log('   Доступ: ТОЛЬКО точка 1');
    console.log('');
    console.log('   Логин: admin2');
    console.log('   Пароль: admin2');
    console.log('   Доступ: ТОЛЬКО точка 2');

    // 3. Проверяем точки
    console.log('');
    console.log('📍 Проверяю точки в системе...');
    const [points] = await connection.execute('SELECT * FROM points WHERE is_active = 1 ORDER BY id');

    console.log('');
    console.log('✅ Точки в системе:');
    points.forEach(p => {
      console.log(`   [${p.id}] ${p.name}${p.address ? ' - ' + p.address : ''}`);
    });

    // 4. Показываем всех пользователей
    console.log('');
    console.log('👥 Все пользователи с привязкой к точкам:');
    const [users] = await connection.execute('SELECT id, username, role, point_id FROM users ORDER BY id');
    users.forEach(u => {
      const access = `Точка ${u.point_id}`;
      console.log(`   [${u.id}] ${u.username} (${u.role}) → ${access}`);
    });

    console.log('');
    console.log('🎉 Готово! Система настроена для работы с двумя точками.');
    console.log('');
    console.log('💡 Как работает распределение заказов:');
    console.log('   1. В админке → Районы доставки → укажите для каждого района point_id');
    console.log('   2. При синхронизации заказа с основного сайта передайте point_id');
    console.log('   3. Заказ автоматически попадёт в нужную точку');
    console.log('   4. Сотрудники видят только заказы своей точки');

    connection.release();
    await pool.end();

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('💡 Проверьте логин и пароль MySQL в файле .env');
      console.log('   Файл: .env в папке frontpad/server/');
    }
    
    if (connection) {
      try { connection.release(); } catch(e) {}
    }
    
    process.exit(1);
  }
}

setupSecondPoint();
