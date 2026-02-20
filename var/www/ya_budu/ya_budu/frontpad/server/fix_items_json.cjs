#!/usr/bin/env node
/**
 * Скрипт исправления JSON данных items в MySQL
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

async function fixItemsJSON() {
    console.log('Исправление JSON данных items в MySQL...');

    const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY);
    const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);

    // Получаем items из SQLite
    sqliteDb.all('SELECT id, items FROM orders', async (err, orders) => {
        if (err) {
            console.error('Ошибка SQLite:', err.message);
            return;
        }

        console.log('Найдено ' + orders.length + ' заказов');

        let count = 0;
        for (const order of orders) {
            try {
                let items = order.items;

                // Если items это строка, пробуем разобрать её
                if (typeof items === 'string') {
                    try {
                        // Проверяем, нужно ли двойное разбирание
                        const parsed = JSON.parse(items);
                        if (typeof parsed === 'string') {
                            // Двойная сериализация - разбираем ещё раз
                            items = JSON.parse(parsed);
                        } else {
                            items = parsed;
                        }
                    } catch (e) {
                        // Невалидный JSON - оставляем как есть
                        console.warn('Заказ ' + order.id + ': некорректный JSON');
                    }
                }

                // Обновляем в MySQL
                await mysqlConn.query(
                    'UPDATE orders SET items = ? WHERE id = ?',
                    [JSON.stringify(items), order.id]
                );
                count++;

            } catch (e) {
                console.warn('Ошибка заказа ' + order.id + ':', e.message);
            }
        }

        console.log('\nИсправлено ' + count + ' заказов');

        sqliteDb.close();
        await mysqlConn.end();
        process.exit(0);
    });
}

fixItemsJSON().catch(console.error);
