@echo off
echo ========================================
echo Сборка Frontpad Client для продакшена
echo ========================================
cd /d "%~dp0var\www\ya_budu\ya_budu\frontpad\client"

echo.
echo Установка зависимостей...
call npm install

echo.
echo Сборка проекта...
set NODE_OPTIONS=--openssl-legacy-provider
call npm run build

echo.
echo Копирование билда в var/www/ya_budu/ya_budu/frontpad/static...
xcopy /E /I /Y "%~dp0var\www\ya_budu\ya_budu\frontpad\client\build\*" "%~dp0var\www\ya_budu\ya_budu\frontpad\static\"

echo.
echo Готово!
pause
