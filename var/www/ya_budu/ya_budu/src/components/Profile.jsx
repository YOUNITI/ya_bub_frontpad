import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'orders'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Форматирование даты и времени
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование суммы
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  // Форматирование телефона (safe)
  const formatPhone = (phone) => {
    if (phone === null || phone === undefined || phone === '') {
      return '—';
    }
    return phone;
  };

  // Получение текста статуса
  const getStatusText = (status) => {
    const statuses = {
      'pending': 'Новый',
      'processing': 'В производстве',
      'ready': 'Произведен',
      'delivering': 'В пути',
      'completed': 'Выполнен',
      'cancelled': 'Отменён',
      'rejected': 'Отклонён',
      'отменён': 'Отклонён'
    };
    return statuses[status] || status;
  };

  // Получение текста способа оплаты
  const getPaymentText = (payment) => {
    const payments = {
      'cash': 'Наличными при получении',
      'card': 'Картой при получении',
      'online': 'Онлайн оплата',
      'transfer': 'Переводом при получении'
    };
    return payments[payment] || payment;
  };

  // Получение цвета статуса
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'ready': 'bg-green-100 text-green-800',
      'delivering': 'bg-purple-100 text-purple-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rejected': 'bg-red-100 text-red-800',
      'отменён': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Проверка активного заказа (pending, processing или delivering)
  // Включаем все статусы - и русские, и английские
  const isActiveOrder = (status) => {
    return status === 'pending' || status === 'новый' || 
           status === 'processing' || status === 'в производстве' ||
           status === 'delivering' || status === 'в пути';
  };

  // Загрузка профиля пользователя
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.customer_id) return;
    
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/customers/${user.customer_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        // Инициализируем форму редактирования
        setEditForm({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Загрузка заказов
  useEffect(() => {
    loadOrders();
  }, [user]);

  // WebSocket для обновления статуса заказов
  useEffect(() => {
    // Подключаемся к WebSocket
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    let ws;
    let reconnectTimeout;
    
    const connectWebSocket = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[Profile] WebSocket подключён');
        // Авторизуемся
        if (user?.customer_id) {
          ws.send(JSON.stringify({ type: 'auth', userId: user.customer_id }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Profile] WebSocket сообщение:', data);
          
          if (data.type === 'order_status_changed') {
            // Обновляем заказы при изменении статуса
            console.log('[Profile] Получено обновление статуса заказа:', data.order);
            
            // Перезагружаем заказы
            loadOrders();
            
            // Также показываем уведомление пользователю
            if (data.order) {
              const statusTexts = {
                'pending': 'Новый',
                'новый': 'Новый',
                'processing': 'В производстве',
                'в производстве': 'В производстве',
                'ready': 'Произведен',
                'произведен': 'Произведен',
                'delivering': 'В пути',
                'в пути': 'В пути',
                'completed': 'Выполнен',
                'выполнен': 'Выполнен',
                'cancelled': 'Отменён',
                'rejected': 'Отклонён',
                'отменён': 'Отменён'
              };
              const statusText = statusTexts[data.order.status] || data.order.status;
              console.log(`[Profile] Статус заказа изменён на: ${statusText}`);
            }
          }
          
          // Если заказ удалён во Frontpad - удаляем из списка
          if (data.type === 'order_deleted') {
            console.log('[Profile] Заказ удалён:', data.id);
            loadOrders();
          }
        } catch (err) {
          console.error('[Profile] Ошибка парсинга WebSocket сообщения:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[Profile] WebSocket отключён, переподключаемся...');
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('[Profile] WebSocket ошибка:', err);
      };
    };
    
    if (user?.customer_id) {
      connectWebSocket();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/orders/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Обработка изменения полей формы
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Сохранение изменений профиля
  const handleSaveProfile = async () => {
    if (!user?.customer_id) return;
    
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/customers/${user.customer_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedData = await response.json();
        setProfileData(updatedData);
        // Обновляем имя пользователя в контексте
        if (setUser && updatedData.name) {
          setUser(prev => ({ ...prev, name: updatedData.name }));
        }
        setSaveSuccess('Профиль успешно обновлён!');
        setIsEditing(false);
        // Скрываем сообщение об успехе через 3 секунды
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setSaveError(errorData.message || 'Ошибка при сохранении профиля');
      }
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      setSaveError('Ошибка при сохранении профиля');
    } finally {
      setSaving(false);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditForm({
      name: profileData?.name || '',
      phone: profileData?.phone || '',
      address: profileData?.address || ''
    });
    setIsEditing(false);
    setSaveError('');
  };

  // Сортировка заказов по дате (новые первыми)
  const sortedOrders = [...orders].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Получение активных заказов (pending или processing)
  const activeOrders = sortedOrders.filter(order => isActiveOrder(order.status));

  // История заказов (все заказы, отсортированные)
  const historyOrders = sortedOrders;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-brand-yellow p-6">
          <h1 className="text-3xl font-bold text-brand-black">Личный кабинет</h1>
          <p className="text-brand-black mt-2">Добро пожаловать, {user?.name || 'Пользователь'}!</p>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex p-2 gap-2 bg-gray-100">
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-center font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-brand-black shadow-md'
                : 'bg-transparent text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user mr-2"></i>
            Мой профиль
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-center font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-green-700 text-white shadow-md'
                : 'bg-green-500 text-white shadow-md'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shopping-bag mr-2"></i>
            Мои заказы
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Сообщения об успехе/ошибке */}
              {saveSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                  <i className="fas fa-check-circle mr-2"></i>
                  {saveSuccess}
                </div>
              )}
              {saveError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {saveError}
                </div>
              )}

              {/* Информация о пользователе */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {isEditing ? 'Редактирование профиля' : 'Информация о профиле'}
                </h2>
                
                {isEditing ? (
                  // Форма редактирования
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-600 font-medium mb-2">Имя:</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                        placeholder="Ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-2">Телефон:</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditChange}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                        placeholder="+7 (XXX) XXX-XX-XX"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-2">Адрес доставки:</label>
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleEditChange}
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow resize-none"
                        placeholder="Улица, дом, квартира"
                      />
                    </div>

                    {/* Кнопки сохранения/отмены */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 bg-brand-yellow text-brand-black px-6 py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <><i className="fas fa-spinner fa-spin mr-2"></i> Сохранение...</>
                        ) : (
                          <><i className="fas fa-save mr-2"></i> Сохранить</>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-bold hover:bg-gray-300 transition-colors"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  // Отображение информации
                  <div className="space-y-4">
                    <div className="flex items-center py-2 border-b border-gray-200">
                      <span className="w-32 text-gray-600 font-medium">Имя:</span>
                      <span className="text-gray-800 font-medium">{loadingProfile ? 'Загрузка...' : (profileData?.name || user?.name || 'Не указано')}</span>
                    </div>

                    <div className="flex items-center py-2 border-b border-gray-200">
                      <span className="w-32 text-gray-600 font-medium">Email:</span>
                      <span className="text-gray-800">{user?.email || 'Не указано'}</span>
                    </div>

                    <div className="flex items-center py-2 border-b border-gray-200">
                      <span className="w-32 text-gray-600 font-medium">Телефон:</span>
                      <span className="text-gray-800">{loadingProfile ? 'Загрузка...' : formatPhone(profileData?.phone)}</span>
                    </div>

                    <div className="flex items-start py-2 border-b border-gray-200">
                      <span className="w-32 text-gray-600 font-medium pt-1">Адрес:</span>
                      <span className="text-gray-800 flex-1">{loadingProfile ? 'Загрузка...' : (profileData?.address || 'Не указан')}</span>
                    </div>

                    <div className="flex items-center py-2">
                      <span className="w-32 text-gray-600 font-medium">Дата регистрации:</span>
                      <span className="text-gray-800">{loadingProfile ? 'Загрузка...' : formatDate(profileData?.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопка редактирования (только если не в режиме редактирования) */}
              {!isEditing && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    className="flex-1 bg-brand-yellow text-brand-black px-6 py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors hover-lift"
                    onClick={() => setIsEditing(true)}
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Редактировать профиль
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Мои заказы</h2>
              
              {loadingOrders ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-gray-500 mt-2">Загрузка заказов...</p>
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">У вас пока нет заказов</p>
                  <a
                    href="#/menu"
                    className="inline-block mt-4 bg-brand-yellow text-brand-black px-6 py-2 rounded-full font-bold hover:bg-yellow-500 transition-colors"
                  >
                    Сделать заказ
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">
                            Заказ №{order.id}
                          </p>
                          <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
                          {/* Время готовности заказа */}
                          {order.ready_time && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              ⏱ Будет готов в: {order.ready_time}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-3">
                        {/* Информация о заказе */}
                        <div className="grid grid-cols-1 gap-2 mb-3 text-sm">
                          {order.guest_phone && (
                            <div className="flex items-center text-gray-600">
                              <i className="fas fa-phone w-6 text-brand-yellow"></i>
                              <span>📞 {order.guest_phone}</span>
                            </div>
                          )}
                          {order.address && (
                            <div className="flex items-center text-gray-600">
                              <i className="fas fa-map-marker-alt w-6 text-brand-yellow"></i>
                              <span>📍 {order.address}</span>
                            </div>
                          )}
                          {order.payment && (
                            <div className="flex items-center text-gray-600">
                              <i className="fas fa-credit-card w-6 text-brand-yellow"></i>
                              <span>💳 {getPaymentText(order.payment)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.name} × {item.quantity}</span>
                              <span className="text-gray-800">{formatPrice(parseFloat(item.price) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="font-semibold text-gray-800">Итого:</span>
                          <span className="font-bold text-brand-black">{formatPrice(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
