#!/bin/bash
# Диагностика проблемы с адресом в заказах

echo "=== Диагностика проблемы с адресом ==="
echo ""

# 1. Проверка кода на основном сайте
echo "1. Проверка server.js - отправка адреса на Frontpad:"
grep -n "address: fullAddress" var/www/ya_budu/ya_budu/server.js | head -5
grep -n "building," var/www/ya_budu/ya_budu/server.js | head -5
echo ""

# 2. Проверка кода Frontpad server
echo "2. Проверка Frontpad index.js - получение адреса:"
grep -n "street, building, apartment" var/www/ya_budu/ya_budu/frontpad/server/src/index.js | head -5
echo ""

# 3. Проверка Frontpad client
echo "3. Проверка Orders.jsx - отображение адреса:"
grep -n "order.address || order.street" var/www/ya_budu/ya_budu/frontpad/client/src/components/Orders.jsx | head -5
echo ""

echo "=== Рекомендации ==="
echo "1. Убедитесь что на сервере последняя версия кода"
echo "2. Проверьте логи Frontpad при создании заказа:"
echo "   tail -f /var/log/pm2/logs/frontpad-out.log | grep SYNC"
echo "3. Сделайте тестовый заказ и проверьте данные в БД:"
echo "   mysql -u root -p yabudu_frontpad -e 'SELECT id, address, street, building, apartment FROM orders ORDER BY id DESC LIMIT 1;'"
