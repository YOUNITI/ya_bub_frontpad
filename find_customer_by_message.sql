-- Поиск клиента по сообщению
-- Замените 'текст_сообщения' на нужный текст

-- Вариант 1: Поиск по точному тексту сообщения
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.total_orders,
    c.total_spent,
    m.content AS message_text,
    m.timestamp AS message_time
FROM yabudu_main.messages m
JOIN yabudu_main.customers c ON m.sender_id = c.id
WHERE m.content = 'текст_сообщения'
ORDER BY m.timestamp DESC
LIMIT 10;

-- Вариант 2: Поиск по части текста сообщения (LIKE)
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.total_orders,
    c.total_spent,
    m.content AS message_text,
    m.timestamp AS message_time
FROM yabudu_main.messages m
JOIN yabudu_main.customers c ON m.sender_id = c.id
WHERE m.content LIKE '%текст_сообщения%'
ORDER BY m.timestamp DESC
LIMIT 10;

-- Вариант 3: Показать все сообщения от клиента (если известен телефон)
-- Замените '79001234567' на номер телефона
SELECT 
    c.id,
    c.name,
    c.phone,
    m.content AS message_text,
    m.timestamp AS message_time,
    m.is_admin
FROM yabudu_main.messages m
JOIN yabudu_main.customers c ON m.sender_id = c.id
WHERE c.phone = '79001234567'
ORDER BY m.timestamp DESC
LIMIT 20;

-- Вариант 4: Найти последнее сообщение от клиента (по номеру телефона)
SELECT 
    c.id,
    c.name,
    c.phone,
    m.content AS last_message,
    m.timestamp AS last_message_time
FROM yabudu_main.customers c
LEFT JOIN yabudu_main.messages m ON m.sender_id = c.id
WHERE c.phone = '79001234567'
ORDER BY m.timestamp DESC
LIMIT 1;
