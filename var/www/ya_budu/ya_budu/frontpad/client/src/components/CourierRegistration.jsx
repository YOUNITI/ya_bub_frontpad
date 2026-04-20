import React, { useState } from 'react';
import axios from 'axios';
import { User, Phone, Lock, Plus, X, Eye, EyeOff, Trash2, Package, Key } from 'lucide-react';

const FRONTPAD_API = '';

const CourierRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    can_take_orders: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingCourier, setEditingCourier] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Загрузка списка курьеров
  const fetchCouriers = async () => {
    setLoadingCouriers(true);
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/couriers`);
      setCouriers(response.data || []);
    } catch (err) {
      console.error('Error fetching couriers:', err);
    } finally {
      setLoadingCouriers(false);
    }
  };

  React.useEffect(() => {
    fetchCouriers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await axios.post(`${FRONTPAD_API}/api/couriers`, formData);
      setMessage('Курьер успешно зарегистрирован!');
      setFormData({ name: '', login: '', password: '', can_take_orders: true });
      fetchCouriers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при регистрации курьера');
    } finally {
      setLoading(false);
    }
  };

  // Удаление курьера
  const handleDeleteCourier = async (courierId) => {
    try {
      await axios.delete(`${FRONTPAD_API}/api/couriers/${courierId}`);
      setShowDeleteConfirm(null);
      fetchCouriers();
    } catch (err) {
      alert('Ошибка при удалении курьера: ' + (err.response?.data?.error || err.message));
    }
  };

  // Переключение активности курьера
  const toggleCourierActive = async (courierId, currentStatus) => {
    try {
      await axios.put(`${FRONTPAD_API}/api/couriers/${courierId}/toggle-active`, {
        is_active: currentStatus === 1 ? 0 : 1
      });
      fetchCouriers();
    } catch (err) {
      alert('Ошибка при изменении статуса: ' + (err.response?.data?.error || err.message));
    }
  };

  // Изменение пароля курьера
  const handleChangePassword = async (courierId) => {
    if (!newPassword || newPassword.length < 4) {
      alert('Пароль должен быть минимум 4 символа');
      return;
    }
    try {
      await axios.put(`${FRONTPAD_API}/api/couriers/${courierId}/change-password`, {
        password: newPassword
      });
      setNewPassword('');
      setEditingCourier(null);
      alert('Пароль успешно изменён!');
    } catch (err) {
      alert('Ошибка при изменении пароля: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>🚚 Управление курьерами</h2>

      {/* Форма регистрации */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} />
          Регистрация нового курьера
        </h3>

        {message && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#dcfce7', 
            color: '#166534', 
            borderRadius: '8px', 
            marginBottom: '16px' 
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px', 
            marginBottom: '16px' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ marginRight: '6px' }} />
                Имя курьера
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Иван Иванов"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ marginRight: '6px' }} />
                Логин
              </label>
              <input
                type="text"
                name="login"
                className="form-input"
                value={formData.login}
                onChange={handleChange}
                required
                placeholder="courier1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ marginRight: '6px' }} />
                Пароль
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Минимум 4 символа"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="can_take_orders"
                  checked={formData.can_take_orders}
                  onChange={(e) => setFormData({ ...formData, can_take_orders: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px' }}>Доступ к свободным заказам</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ height: '42px' }}
            >
              {loading ? 'Добавление...' : (
                <>
                  <Plus size={18} style={{ marginRight: '6px' }} />
                  Добавить
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Список курьеров */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
          Список курьеров ({couriers.length})
        </h3>

        {loadingCouriers ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>
        ) : couriers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Курьеры не найдены. Добавьте первого курьера.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {couriers.map(courier => (
              <div
                key={courier.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: courier.is_active ? '#f9fafb' : '#f3f4f6',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  opacity: courier.is_active ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#4361ee',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {courier.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{courier.name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Логин: {courier.login}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Статус доступа к заказам */}
                  <button
                    onClick={() => toggleCourierActive(courier.id, courier.is_active)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      background: courier.is_active ? '#dcfce7' : '#fee2e2',
                      color: courier.is_active ? '#166534' : '#dc2626'
                    }}
                  >
                    {courier.is_active ? '✓ Может брать заказы' : '✕ Заблокирован'}
                  </button>

                  {/* Кнопка изменения пароля */}
                  {editingCourier === courier.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '13px',
                          width: '120px'
                        }}
                      />
                      <button
                        onClick={() => handleChangePassword(courier.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#4361ee',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => { setEditingCourier(null); setNewPassword(''); }}
                        style={{
                          padding: '6px 12px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingCourier(courier.id)}
                      style={{
                        padding: '8px',
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#4361ee'
                      }}
                      title="Изменить пароль"
                    >
                      <Key size={18} />
                    </button>
                  )}

                  {/* Кнопка удаления */}
                  {showDeleteConfirm === courier.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px' }}>Удалить?</span>
                      <button
                        onClick={() => handleDeleteCourier(courier.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Да
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        style={{
                          padding: '6px 12px',
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(courier.id)}
                      style={{
                        padding: '8px',
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                      title="Удалить курьера"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourierRegistration;
