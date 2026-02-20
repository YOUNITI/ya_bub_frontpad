# Инструкция по сбросу пароля MySQL

## Шаг 1: Создайте файл init.txt

Создайте файл `C:\ProgramData\MySQL\MySQL Server 8.0\init.txt` с содержимым:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root123';
FLUSH PRIVILEGES;
```

## Шаг 2: Остановите MySQL

Найдите и остановите процесс MySQL вручную через Диспетчер задач или выполните:
```
taskkill /F /IM mysqld.exe
```

## Шаг 3: Запустите MySQL с init-файлом

```cmd
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysqld --init-file="C:\ProgramData\MySQL\MySQL Server 8.0\init.txt" --console
```

## Шаг 4: Подождите и проверьте

После запуска MySQL пароль будет сброшен на `root123`. Подождите 30 секунд и остановите MySQL (Ctrl+C).

## Шаг 5: Перезапустите MySQL в обычном режиме

Запустите MySQL как обычно.

## Шаг 6: Проверьте подключение

```cmd
mysql -u root -proot123 -e "SELECT 1;"
```

Если подключение успешно, продолжайте миграцию.

---

## Альтернатива: Использовать существующий пароль

Если вы знаете пароль MySQL, введите его в терминале:

```
mysql -u root -p
```

После ввода пароля выполните:
```sql
CREATE USER IF NOT EXISTS 'yabudu'@'localhost' IDENTIFIED BY 'yabudu123';
GRANT ALL PRIVILEGES ON *.* TO 'yabudu'@'localhost';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS yabudu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```
