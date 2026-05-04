## [2026-05-02] - Исправление уведомлений о новых заказах по точкам

### Исправлено
- **App.js**: Добавлена фильтрация уведомлений о новых заказах по `point_id` (только для текущей точки) и проверка статуса `новый`. Уведомление теперь исчезает автоматически при смене статуса заказа.
- **App.js**: Автоматическая печать теперь также фильтруется по `point_id`.
- **Orders.jsx**: При переключении точки в выпадающем списке выбранная точка сохраняется в `localStorage` для синхронизации между вкладками.
- **App.js**: При загрузке читает выбранную точку из `localStorage` и подписывается на событие `storage` для обновления точки без перезагрузки.

### Изменённые файлы
- `frontpad/client/src/components/App.js`
- `frontpad/client/src/components/Orders.jsx`

## [2026-05-01] - Отключение отправки корзины в чат

### Изменено
- **server.js**: `POST /api/messages` — принудительно `cart_data = null`, `cart_total = 0`
- **src/context/ChatContext.jsx**: `sendCart` заменён на пустую функцию, кнопка убрана
- **src/components/ClientChat.jsx**: `sendCart` заменён на пустую функцию, кнопка убрана

### Изменённые файлы
- `server.js`
- `src/context/ChatContext.jsx`
- `src/components/ClientChat.jsx`
- `src/components/Profile.jsx`
- `src/App.jsx`

## [2026-05-01] - Устранение дублирования чата

### Проблема
В чате дублировались блоки с полем ввода — два поля ввода в каждом компоненте (ChatContext + ClientChat), плюс ClientChat рендерился и в Profile, и глобально.

### Решение
- **ChatContext.jsx**: убран весь UI (кнопка, окно чата, поля ввода) — оставлен только провайдер контекста
- **ClientChat.jsx**: убрано дублирующееся поле ввода (оставлено только с жёлтой иконкой), убран неиспользуемый импорт useCart
- **Profile.jsx**: убрен импорт и рендеринг ClientChat
- **App.jsx**: ClientChat добавлен глобально (рендерится один раз для всего приложения)

### Изменённые файлы
- `src/context/ChatContext.jsx`
- `src/components/ClientChat.jsx`
- `src/components/Profile.jsx`
- `src/App.jsx`