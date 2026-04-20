import React, { useState, useEffect, useRef } from 'react';
import { Bike, Package, MapPin, Phone, CheckCircle, Clock, LogOut, RefreshCw, MessageSquare } from 'lucide-react';
import axios from 'axios';

const FRONTPAD_API = '';
const API_HOST = '';

function CourierDashboard({ user, logout, wsRef }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'active', 'completed'
  const [error, setError] = useState('');

  // Загрузка заказов
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${FRONTPAD_API}/api/couriers/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
      setError('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Слушатель WebSocket
  useEffect(() => {
    if (wsRef?.current) {
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_order' || data.type === 'courier_assigned') {
          fetchOrders();
        }
      };
    }
  }, [wsRef]);

  // Начать доставку
  const startDelivery = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${FRONTPAD_API}/api/orders/${orderId}/start-delivery`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      console.error('Ошибка начала доставки:', err);
    }
  };

  // Отметить доставленным
  const markDelivered = async (orderId, comment = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${FRONTPAD_API}/api/orders/${orderId}/delivered`, { comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      console.error('Ошибка отметки доставки:', err);
    }
  };

  // Открыть маршрут в Яндекс.Картах
  const openRoute = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://yandex.ru/maps/?text=${encodedAddress}`, '_blank');
  };

  // Позвонить клиенту
  const callClient = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  // Фильтрация заказов по статусу
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'new') return !order.courier_id || order.courier_id === user.id;
    if (activeTab === 'active') return order.courier_id === user.id && order.status !== 'доставлен';
    if (activeTab === 'completed') return order.courier_id === user.id && order.status === 'доставлен';
    return true;
  });

  // Получить цвет статуса
  const getStatusColor = (status) => {
    switch (status) {
      case 'новый': return '#3b82f6';
      case 'в производстве': return '#f59e0b';
      case 'готов': return '#10b981';
      case 'в доставке': return '#8b5cf6';
      case 'доставлен': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6',
      padding: '16px',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bike size={24} />
              Курьер
            </h1>
            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>{user.name}</p>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Табы */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px'
      }}>
        {[
          { key: 'new', label: 'Новые', icon: Package },
          { key: 'active', label: 'В работе', icon: Bike },
          { key: 'completed', label: 'Доставлено', icon: CheckCircle }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.key ? '#667eea' : 'white',
              color: activeTab === tab.key ? 'white' : '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Кнопка обновления */}
      <button
        onClick={fetchOrders}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '16px',
          background: 'white',
          border: 'none',
          borderRadius: '12px',
          color: '#667eea',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <RefreshCw size={18} />
        Обновить
      </button>

      {/* Список заказов */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Загрузка...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <Package size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Нет заказов</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredOrders.map(order => (
            <div
              key={order.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              {/* Заголовок заказа */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{ fontWeight: '700', fontSize: '18px' }}>Заказ #{order.id}</span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: getStatusColor(order.status) + '20',
                  color: getStatusColor(order.status),
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {order.status}
                </span>
              </div>

              {/* Клиент */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {order.guest_name || 'Клиент'}
                </div>
                {order.guest_phone && (
                  <button
                    onClick={() => callClient(order.guest_phone)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={16} />
                    {order.guest_phone}
                  </button>
                )}
              </div>

              {/* Адрес */}
              {order.address && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <MapPin size={16} style={{ marginTop: '2px' }} />
                    <span>{order.address}</span>
                  </div>
                </div>
              )}

              {/* Товары */}
              <div style={{ 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '12px',
                marginBottom: '12px'
              }}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '14px'
                  }}>
                    <span>{item.name} ×{item.quantity}</span>
                    <span style={{ fontWeight: '600' }}>{item.price * item.quantity} ₽</span>
                  </div>
                ))}
              </div>

              {/* Итого */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: '700',
                fontSize: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <span>Итого:</span>
                <span>{order.total_amount} ₽</span>
              </div>

              {/* Кнопки действий */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '16px' 
              }}>
                {/* Кнопка маршрута */}
                {order.address && (
                  <button
                    onClick={() => openRoute(order.address)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MapPin size={18} />
                    Маршрут
                  </button>
                )}

                {/* Кнопка начать доставку */}
                {order.status === 'готов' && !order.delivery_started_at && (
                  <button
                    onClick={() => startDelivery(order.id)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Bike size={18} />
                    В путь
                  </button>
                )}

                {/* Кнопка доставлено */}
                {order.status === 'в доставке' && (
                  <button
                    onClick={() => markDelivered(order.id)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle size={18} />
                    Доставлено
                  </button>
                )}
              </div>

              {/* Время */}
              {order.ready_time && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#f59e0b',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  <Clock size={16} />
                  К {order.ready_time}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CourierDashboard;
