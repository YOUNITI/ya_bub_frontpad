import sqlite3

# Используем yabudu.db в корне проекта
db_path = '../../../yabudu.db'
import os
full_path = os.path.join(os.path.dirname(__file__), db_path)
print(f'База: {full_path}')

conn = sqlite3.connect(full_path)
cursor = conn.cursor()

# Проверяем какие таблицы есть
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='addon_templates'")
if cursor.fetchone():
    print('Таблица addon_templates уже существует')
else:
    # Создаем таблицу addon_templates
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS addon_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        default_price REAL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        unit TEXT DEFAULT 'шт',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print('Таблица addon_templates создана')

# Проверяем какие таблицы есть
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='product_addons'")
if cursor.fetchone():
    print('Таблица product_addons уже существует')
else:
    # Создаем таблицу product_addons
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS product_addons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        addon_template_id INTEGER NOT NULL,
        custom_price REAL,
        sort_order INTEGER DEFAULT 0,
        is_required INTEGER DEFAULT 0,
        min_select INTEGER DEFAULT 0,
        max_select INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id) ON DELETE CASCADE,
        UNIQUE(product_id, addon_template_id)
    )
    ''')
    print('Таблица product_addons создана')

# Проверяем sizes
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sizes'")
if cursor.fetchone():
    print('Таблица sizes уже существует')
else:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        size_value TEXT,
        price_modifier REAL DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
    ''')
    print('Таблица sizes создана')

# Проверяем product_discounts
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='product_discounts'")
if cursor.fetchone():
    print('Таблица product_discounts уже существует')
else:
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS product_discounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'percent',
        value REAL NOT NULL,
        min_order_amount REAL DEFAULT 0,
        max_discount_amount REAL,
        code TEXT,
        is_active INTEGER DEFAULT 1,
        valid_from TEXT,
        valid_to TEXT,
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
    ''')
    print('Таблица product_discounts создана')

# Добавляем тестовые шаблоны допов
addons = [
    ('Дополнительный сыр', 30),
    ('Бекон', 40),
    ('Лук', 0),
    ('Огурец маринованный', 20),
    ('Халапеньо', 25),
    ('Грибы', 35),
    ('Чесночный соус', 15),
    ('Кетчуп', 0),
    ('Майонез', 0),
    ('Сырный соус', 30)
]

added = 0
for name, price in addons:
    try:
        cursor.execute('INSERT INTO addon_templates (name, default_price, is_active) VALUES (?, ?, 1)', (name, price))
        print(f'Добавлен: {name}')
        added += 1
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e):
            print(f'Уже есть: {name}')
        else:
            print(f'Ошибка добавления {name}: {e}')

conn.commit()
conn.close()

print(f'\nГотово! Добавлено новых шаблонов: {added}')
