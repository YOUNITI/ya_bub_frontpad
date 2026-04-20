-- SQL команда для выполнения на хостинге (удалённом сервере)
-- Добавляет недостающую колонку size_value в таблицу sizes

ALTER TABLE sizes ADD COLUMN size_value VARCHAR(50);
