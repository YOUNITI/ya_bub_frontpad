import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

async function createUsers() {
  try {
    const db = await open({
      filename: '../yabudu.db',
      driver: sqlite3.Database
    });
    
    console.log('Подключено к SQLite базе yabudu.db');
    
    // Проверяем существующих пользователей
    const users = await db.all('SELECT id, username, role, point_id FROM users');
    console.log('Текущие пользователи:', users);
    
    // Обновляем админа - point_id = 0 (видит все точки)
    const admin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (admin) {
      await db.run('UPDATE users SET point_id = 0 WHERE username = ?', ['admin']);
      console.log('✅ Обновил администратора admin: point_id = 0 (видит все точки)');
    }
    
    // Создаем admin2
    const admin2 = await db.get('SELECT * FROM users WHERE username = ?', ['admin2']);
    if (!admin2) {
      const hashedPassword = await bcrypt.hash('admin2', 10);
      await db.run(
        'INSERT INTO users (username, password, role, point_id) VALUES (?, ?, ?, ?)',
        ['admin2', hashedPassword, 'admin', 2]
      );
      console.log('✅ Создал пользователя admin2: пароль admin2, point_id = 2 (видит только точку 2)');
    } else {
      await db.run('UPDATE users SET point_id = 2 WHERE username = ?', ['admin2']);
      console.log('✅ Обновил пользователя admin2: point_id = 2');
    }
    
    console.log('\nИтоговые пользователи:');
    const finalUsers = await db.all('SELECT id, username, role, point_id FROM users');
    console.log(finalUsers);
    
    // Проверяем точки
    console.log('\nТочки в системе:');
    const points = await db.all('SELECT * FROM points');
    console.log(points);
    
    await db.close();
    console.log('\n✅ Готово! Система готова к работе с двумя точками.');
    
  } catch (err) {
    console.error('Ошибка:', err);
  }
}

createUsers();
