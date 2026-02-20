# План реализации: Автоматическое добавление клиентов в БД

## Анализ текущего состояния

### Что уже есть:
1. **Таблица `customers`** в БД (server.js:58-65) с полями: `id`, `name`, `email`, `phone`, `address`, `created_at`
2. **Таблица `users`** для аутентификации (server.js:77-83): `id`, `email`, `password`, `role`, `created_at`
3. API endpoints для `customers` (только для админов)

### Что отсутствует:
1. **Нет регистрации** - AuthContext.jsx не содержит функцию `register`
2. **Нет создания customer при регистрации** - пользователь создаётся только в `users`
3. **Нет оформления заказов** - Order.jsx просто показывает success, но не отправляет данные на сервер
4. **Нет API для заказов** - отсутствует таблица `orders` и endpoints
5. **Нет автоматического создания customer при заказе гостем**

---

## Требования к реализации

### 1. При регистрации:
- Создавать запись в `customers` с name, email, phone, password
- Создавать запись в `users` для аутентификации
- Связать `users.customer_id` с `customers.id`

### 2. При заказе гостем:
- Проверить существует ли customer по phone/email
- Если существует - обновить данные
- Если не существует - создать нового customer

---

## План реализации

### Шаг 1: Модифицировать таблицу `users` в БД

Добавить связь с `customers`:

```sql
ALTER TABLE users ADD COLUMN customer_id INTEGER REFERENCES customers(id);
```

### Шаг 2: Добавить API endpoint для регистрации

**Файл:** `server.js`

```javascript
// POST /api/register
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  // 1. Проверить существует ли email в users
  // 2. Хешировать пароль
  // 3. Создать customer в таблице customers
  // 4. Создать user в таблице users с customer_id
  // 5. Вернуть JWT токен
});
```

### Шаг 3: Добавить функцию register в AuthContext.jsx

```javascript
const register = async (name, email, password, phone) => {
  // Отправить данные на POST /api/register
  // Сохранить токен и user в localStorage
};
```

### Шаг 4: Создать компонент Registration.jsx или добавить в Login.jsx

Добавить форму регистрации с полями:
- Имя
- Email
- Телефон
- Пароль

### Шаг 5: Добавить API endpoint для upsert клиента (гостевой заказ)

**Файл:** `server.js`

```javascript
// POST /api/customers/upsert - создать или обновить клиента
app.post('/api/customers/upsert', async (req, res) => {
  const { name, email, phone, address } = req.body;
  // 1. Найти customer по phone или email
  // 2. Если найден - обновить данные
  // 3. Если не найден - создать нового
  // 4. Вернуть customer_id
});
```

### Шаг 6: Создать таблицу `orders` и API endpoints

```sql
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  address TEXT,
  entrance TEXT,
  floor TEXT,
  intercom TEXT,
  delivery_time TEXT,
  custom_time TEXT,
  payment TEXT,
  comment TEXT,
  total_amount REAL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**Endpoints:**
- `POST /api/orders` - создать заказ
- `GET /api/orders` - список заказов (для админа)
- `GET /api/orders/:id` - детали заказа
- `PUT /api/orders/:id/status` - обновить статус

### Шаг 7: Модифицировать Order.jsx

```javascript
const handleSubmit = async (e) => {
  // 1. Отправить данные клиента на /api/customers/upsert
  // 2. Получить customer_id
  // 3. Создать заказ на /api/orders
  // 4. Показать success
};
```

### Шаг 8: Обновить CartContext.jsx

Добавить функцию для оформления заказа:
```javascript
const placeOrder = async (orderData) => {
  // Отправить заказ на сервер
};
```

---

## Диаграмма потока данных

```mermaid
flowchart TD
    A[Пользователь] --> B{Есть аккаунт?}
    B -->|Да| C[Вход в систему]
    B -->|Нет| D[Регистрация / Гость]
    
    D --> E{Способ оформления}
    
    E -->|Регистрация| F[POST /api/register]
    F --> G[Создать customer + user]
    G --> H[Получить JWT токен]
    H --> I[Оформить заказ]
    
    E -->|Гость| J[POST /api/customers/ups --> K[Создать/обert]
    Jновить customer]
    K --> I
    
    I --> L[POST /api/orders]
    L --> M[Создать заказ]
    M --> N[Успех]
```

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `server.js` | + регистрация, + upsert customer, + orders API |
| `src/context/AuthContext.jsx` | + register функция |
| `src/components/Login.jsx` | + форма регистрации |
| `src/context/CartContext.jsx` | + placeOrder функция |
| `src/components/Order.jsx` | + отправка данных на сервер |

---

## Приоритет реализации

1. **Критически важно:** API upsert customer + API orders + Order.jsx отправка
2. **Важно:** Регистрация (AuthContext + Login.jsx)
3. **Опционально:** Отображение истории заказов пользователю
