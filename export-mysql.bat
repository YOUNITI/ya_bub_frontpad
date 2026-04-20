@echo off
echo ========================================
echo Экспорт базы данных MySQL
echo ========================================

cd /d "%~dp0"

echo.
echo Экспорт базы данных yabudu_main...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump" -u root -p123456 yabudu_main > yabudu_backup.sql

if %errorlevel% equ 0 (
    echo Экспорт завершён успешно!
    echo Файл: yabudu_backup.sql
    echo Размер файла:
    dir yabudu_backup.sql
) else (
    echo Ошибка экспорта!
)

echo.
pause
