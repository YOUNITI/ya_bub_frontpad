#!/usr/bin/env node
/**
 * Скрипт исправления дат заказов в MySQL
 * Переносит оригинальные даты из SQLite в MySQL
 */

const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');

const SQLITE_DB_PATH = 'c:/Project/ya_budu/yabudu.db';
const MYSQL_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'yabudu'
};

async function fixOrdersDates() {
    console.log('Исправление дат заказов в MySQL...');

    // Подключение к SQLite
    const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);

    // Подключение к MySQL
    const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);

    // Получаем оригинальные даты из SQLite (только created_at)
    sqliteDb.all('SELECT id, created_at FROM orders', async (err, sqliteOrders) => {
        if (err) {
            console.error('Ошибка SQLite:', err.message);
            return;
        }

        console.log('Найдено ' + sqliteOrders.length + ' заказов в SQLite');

        let count = 0;
        for (const order of sqliteOrders) {
            try {
                // Обновляем даты в MySQL (используем created_at для обоих полей)
                await mysqlConn.query(
                    'UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?',
                    [order.created_at, order.created_at, order.id]
                );
                count++;
            } catch (e) {
                console.warn('Ошибка обновления заказа ' + order.id + ':', e.message);
            }
        }

        console.log('\nДаты ' + count + ' заказов исправлены!');
        console.log('Примеры дат:');
        sqliteOrders.slice(0, 5).forEach(o => {
            console.log('  ID ' + o.id + ': ' + o.created_at);
        });

        sqliteDb.close();
        await mysqlConn.end();
        process.exit(0);
    });
}

fixOrdersDates().catch(console.error);
