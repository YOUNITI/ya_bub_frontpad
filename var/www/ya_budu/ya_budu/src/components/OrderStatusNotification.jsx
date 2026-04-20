import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const OrderStatusNotification = () => {
  const { user } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Проверка активного заказа при загрузке
  useEffect(() => {
    // Только для авторизованных пользователей показываем уведомление о заказе
    if (!user?.customer_id) {
      // Если пользователь не авторизован - очищаем заказ и не показываем уведомление
      setActiveOrder(null);
      localStorage.removeItem('guestOrder');
      return;
    }
    
    loadActiveOrder();
    connectWebSocket();
    
    // Проверяем localStorage для гостевых заказов - только если есть customer_id
    const savedOrder = localStorage.getItem('guestOrder');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        if (order && order.id && isActiveOrderStatus(order.status)) {
          setActiveOrder(order);
        }
      } catch (e) {
        console.error('Error parsing guest order:', e);
      }
    }
  }, [user]);

  // Загрузка активного заказа
  const loadActiveOrder = async () => {
    if (!user?.customer_id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/orders/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const orders = await response.json();
        // Ищем активный заказ
        const active = orders.find(order => isActiveOrderStatus(order.status));
        if (active) {
          setActiveOrder(active);
          // Сохраняем для гостевого режима
          localStorage.setItem('guestOrder', JSON.stringify(active));
        } else {
          setActiveOrder(null);
          localStorage.removeItem('guestOrder');
        }
      }
    } catch (error) {
      console.error('Error loading active order:', error);
    } finally {
      setLoading(false);
    }
  };

  // Подключение к WebSocket
  const connectWebSocket = () => {
    // Не подключаемся если нет customer_id
    if (!user?.customer_id) {
      return;
    }
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    let ws;
    let reconnectTimeout;
    
    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[OrderStatus] WebSocket подключён');
        setWsConnected(true);
        // Авторизуемся
        if (user?.customer_id) {
          ws.send(JSON.stringify({ type: 'auth', userId: user.customer_id }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[OrderStatus] WebSocket сообщение:', data);
          
          if (data.type === 'order_status_changed' && data.order) {
            // Проверяем, что это наш заказ:
            // 1. По id или site_order_id заказа
            // 2. По customer_id (дополнительная проверка для безопасности)
            const isOurOrder = activeOrder && (
              (data.order.id === activeOrder.id || 
               data.order.site_order_id === activeOrder.id) &&
              (!data.customer_id || data.customer_id === user.customer_id)
            );
            
            if (isOurOrder) {
              const updatedOrder = { 
                ...activeOrder, 
                status: data.order.status,
                ready_time: data.order.ready_time || activeOrder.ready_time
              };
              setActiveOrder(updatedOrder);
              localStorage.setItem('guestOrder', JSON.stringify(updatedOrder));
              
              // Если заказ завершён, отменён или удалён - скрываем уведомление
              // Проверяем оба языка статусов
              if (data.order.status === 'completed' || data.order.status === 'cancelled' ||
                  data.order.status === 'выполнен' || data.order.status === 'отменён') {
                // Сначала показываем финальный статус 3 секунды, затем скрываем
                setTimeout(() => {
                  setActiveOrder(null);
                  localStorage.removeItem('guestOrder');
                }, 3000);
              }
            }
          }
          
          // Если заказ удалён во Frontpad
          if (data.type === 'order_deleted' && activeOrder && data.id === activeOrder.id) {
            setActiveOrder(null);
            localStorage.removeItem('guestOrder');
          }
        } catch (err) {
          console.error('[OrderStatus] Ошибка парсинга:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[OrderStatus] WebSocket отключён');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('[OrderStatus] WebSocket ошибка:', err);
      };
    };
    
    if (user?.customer_id) {
      connect();
    }
    
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  };

  // Проверка активного статуса заказа
  const isActiveOrderStatus = (status) => {
    // Статусы на русском языке
    return status === 'новый' || status === 'pending' || 
           status === 'в производстве' || status === 'processing' || 
           status === 'произведен' || status === 'ready' || 
           status === 'в пути' || status === 'delivering';
  };

  // Получение текста статуса
  const getStatusText = (status) => {
    const statuses = {
      'pending': 'Новый',
      'processing': 'В производстве',
      'ready': 'Произведен',
      'delivering': 'В пути',
      'completed': 'Выполнен',
      'cancelled': 'Отменён'
    };
    return statuses[status] || status;
  };

  // Получение цвета статуса
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'processing': 'bg-blue-100 text-blue-800 border-blue-300',
      'ready': 'bg-green-100 text-green-800 border-green-300',
      'delivering': 'bg-purple-100 text-purple-800 border-purple-300',
      'completed': 'bg-gray-100 text-gray-800 border-gray-300',
      'cancelled': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Форматирование суммы
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  // Если нет активного заказа или пользователь не авторизован - не показываем компонент
  if ((!activeOrder && !loading) || !user?.customer_id) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMinimized ? (
        // Минимизированная версия
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-brand-yellow text-brand-black px-4 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-yellow-500 transition-colors"
        >
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          Заказ №{activeOrder?.id}
        </button>
      ) : (
        // Полная версия
        <div className={`bg-white rounded-lg shadow-xl border-2 ${getStatusColor(activeOrder?.status)} max-w-sm w-full overflow-hidden`}>
          {/* Заголовок */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className="font-bold text-gray-800">Статус заказа</span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Информация о заказе */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-lg">Заказ №{activeOrder?.id}</p>
                <p className="text-sm text-gray-500">
                  {activeOrder?.created_at ? new Date(activeOrder.created_at).toLocaleString('ru-RU') : ''}
                </p>
                {/* Время готовности заказа */}
                {activeOrder?.ready_time && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    ⏱ Будет готов в: {activeOrder.ready_time}
                  </p>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(activeOrder?.status)}`}>
                {getStatusText(activeOrder?.status)}
              </div>
            </div>
            
            {/* Прогресс бар */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Заказ принят</span>
                <span>В производстве</span>
                <span>Произведен</span>
                <span>В пути</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: activeOrder?.status === 'pending' ? '25%' : 
                           activeOrder?.status === 'processing' ? '50%' : 
                           activeOrder?.status === 'ready' ? '75%' : 
                           activeOrder?.status === 'delivering' || activeOrder?.status === 'completed' ? '100%' : '0%'
                  }}
                ></div>
              </div>
            </div>
            
            {/* Детали заказа */}
            {activeOrder?.items && activeOrder.items.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-sm font-semibold mb-2">Состав заказа:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activeOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                      <span className="font-medium">{formatPrice(parseFloat(item.price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="font-bold">Итого:</span>
                  <span className="font-bold text-lg">{formatPrice(activeOrder?.total_amount)}</span>
                </div>
              </div>
            )}
            
            {/* Адрес доставки */}
            {activeOrder?.address && (
              <div className="mt-3 text-sm text-gray-600">
                <span className="font-semibold">Адрес:</span> {activeOrder.address}
              </div>
            )}
          </div>
          
          {/* Кнопка перехода в профиль */}
          <div className="px-4 pb-4">
            <a
              href="#/profile"
              className="block w-full bg-brand-yellow text-brand-black text-center py-2 rounded-full font-bold hover:bg-yellow-500 transition-colors"
            >
              Подробнее в профиле
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusNotification;
