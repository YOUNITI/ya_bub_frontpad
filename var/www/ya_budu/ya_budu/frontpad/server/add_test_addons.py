import sqlite3

db_path = 'frontpad.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

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

print(f'\nГотово! Добавлено шаблонов допов: {len(addons)}')
