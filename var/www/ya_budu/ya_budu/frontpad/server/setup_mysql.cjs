#!/usr/bin/env node
/**
 * Скрипт настройки MySQL для YounitiPad
 * Создаёт пользователя и базу данных
 */

const mysql = require('mysql2/promise');

async function setup() {
  console.log('Попытка подключения к MySQL...');
  
  // Пробуем подключиться без пароля или с пустым паролем
  const configs = [
    { host: 'localhost', port: 3306, user: 'root', password: '' },
    { host: 'localhost', port: 3306, user: 'root', password: 'root' },
    { host: 'localhost', port: 3306, user: 'root', password: 'password' },
    { host: 'localhost', port: 3306, user: 'root', password: 'mysql' },
  ];
  
  let connection;
  let connected = false;
  
  for (const config of configs) {
    try {
      connection = await mysql.createConnection({ ...config, database: 'mysql' });
      console.log(`✓ Подключено с паролем: "${config.password}"`);
      connected = true;
      break;
    } catch (err) {
      console.log(`✗ Неверный пароль: "${config.password}"`);
    }
  }
  
  if (!connected) {
    console.error('\nНе удалось подключиться к MySQL.');
    console.error('Пожалуйста, выполните следующие шаги вручную:');
    console.error('1. Запустите MySQL клиент: mysql -u root -p');
    console.error('2. Выполните:');
    console.error('   CREATE USER IF NOT EXISTS "yabudu"@"localhost" IDENTIFIED BY "yabudu123";');
    console.error('   GRANT ALL PRIVILEGES ON *.* TO "yabudu"@"localhost";');
    console.error('   FLUSH PRIVILEGES;');
    console.error('   CREATE DATABASE IF NOT EXISTS yabudu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    process.exit(1);
  }
  
  try {
    // Создаём пользователя для приложения
    console.log('\nСоздание пользователя yabudu...');
    await connection.query(`CREATE USER IF NOT EXISTS 'yabudu'@'localhost' IDENTIFIED BY 'yabudu123'`);
    await connection.query(`GRANT ALL PRIVILEGES ON *.* TO 'yabudu'@'localhost'`);
    await connection.query('FLUSH PRIVILEGES');
    console.log('✓ Пользователь создан');
    
    // Создаём базу данных
    console.log('\nСоздание базы данных yabudu...');
    await connection.query('CREATE DATABASE IF NOT EXISTS yabudu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✓ База данных создана');
    
    console.log('\n✓ Настройка MySQL завершена!');
    console.log('\nПараметры подключения для приложения:');
    console.log('  Хост: localhost');
    console.log('  Порт: 3306');
    console.log('  Пользователь: yabudu');
    console.log('  Пароль: yabudu123');
    console.log('  База данных: yabudu');
    
  } catch (err) {
    console.error('Ошибка настройки:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

setup();
