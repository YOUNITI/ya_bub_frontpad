import sqlite3

db_path = 'frontpad.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Создаем таблицу addon_templates
cursor.execute('''
CREATE TABLE IF NOT EXISTS addon_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_price REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')
print('Таблица addon_templates создана')

# Создаем таблицу product_addons
cursor.execute('''
CREATE TABLE IF NOT EXISTS product_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    addon_template_id INTEGER NOT NULL,
    custom_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_template_id) REFERENCES addon_templates(id)
)
''')
print('Таблица product_addons создана')

# Создаем таблицу sizes
cursor.execute('''
CREATE TABLE IF NOT EXISTS sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    size_value TEXT,
    price_modifier REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
)
''')
print('Таблица sizes создана')

# Создаем таблицу product_discounts
cursor.execute('''
CREATE TABLE IF NOT EXISTS product_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT,
    type TEXT DEFAULT 'percent',
    value REAL NOT NULL,
    valid_from DATE,
    valid_to DATE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

for name, price in addons:
    try:
        cursor.execute('INSERT INTO addon_templates (name, default_price, is_active) VALUES (?, ?, 1)', (name, price))
        print(f'Добавлен: {name}')
    except Exception as e:
        print(f'Ошибка добавления {name}: {e}')

conn.commit()
conn.close()

print(f'\nГотово!')
