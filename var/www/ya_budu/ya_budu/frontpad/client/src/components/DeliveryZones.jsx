import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Check } from 'lucide-react';

const API_URL = '/api';

function DeliveryZones() {
  const [zones, setZones] = useState([]);
  const [points, setPoints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    min_order_amount: 0,
    delivery_price: 0,
    is_active: true,
    sort_order: 0,
    point_id: 1
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchZones();
    fetchPoints();
  }, []);
  
  const fetchPoints = async () => {
    try {
      const response = await fetch(`${API_URL}/points`);
      if (response.ok) {
        const data = await response.json();
        setPoints(data);
      }
    } catch (e) {}
  };

  const fetchZones = async () => {
    try {
      const response = await fetch(`${API_URL}/delivery-zones`);
      if (response.ok) {
        const data = await response.json();
        setZones(data || []);
      }
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = editingZone 
        ? `${API_URL}/delivery-zones/${editingZone.id}`
        : `${API_URL}/delivery-zones`;
      const method = editingZone ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Ошибка сохранения');
      
      setMessage({ type: 'success', text: editingZone ? 'Район обновлён' : 'Район создан' });
      setShowModal(false);
      setEditingZone(null);
      resetForm();
      fetchZones();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      min_order_amount: zone.min_order_amount || 0,
      delivery_price: zone.delivery_price || 0,
      is_active: zone.is_active === 1,
      sort_order: zone.sort_order || 0,
      point_id: zone.point_id || 1
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот район доставки?')) return;
    
    try {
      const response = await fetch(`${API_URL}/delivery-zones/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
      
      setMessage({ type: 'success', text: 'Район удалён' });
      fetchZones();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleActive = async (zone) => {
    try {
      await fetch(`${API_URL}/delivery-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...zone, 
          is_active: zone.is_active === 1 ? 0 : 1 
        })
      });
      fetchZones();
    } catch (error) {}
  };

  const resetForm = () => {
    setFormData({
      name: '',
      min_order_amount: 0,
      delivery_price: 0,
      is_active: true,
      sort_order: 0,
      point_id: 1
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Районы доставки</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} />
            Добавить район
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Район</th>
              <th>Точка</th>
              <th>Мин. сумма</th>
              <th>Стоимость</th>
              <th>Порядок</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id} style={{ opacity: zone.is_active === 1 ? 1 : 0.6 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: zone.is_active === 1 ? '#f59e0b' : '#9ca3af' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: zone.is_active === 1 ? 'inherit' : '#9ca3af' }}>{zone.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>ID: {zone.id} {zone.is_active === 0 ? '(Неактивен)' : ''}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ 
                    fontSize: '12px', 
                    background: '#dbeafe', 
                    color: '#1e40af', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    {points.find(p => p.id === zone.point_id)?.name || `Точка ${zone.point_id || 1}`}
                  </span>
                </td>
                <td>
                  {zone.min_order_amount > 0 ? (
                    <div>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>{zone.min_order_amount} ₽</span>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>≥ {zone.min_order_amount} ₽ = бесплатно</div>
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280' }}>Доставка всегда платная</span>
                  )}
                </td>
                <td>
                  {zone.delivery_price > 0 ? (
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{zone.delivery_price} ₽</span>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>при заказе &lt; {zone.min_order_amount || '∞'} ₽</div>
                    </div>
                  ) : (
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>Бесплатно</span>
                  )}
                </td>
                <td>
                  <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{zone.sort_order || 0}</div>
                </td>
                <td>
                  <button 
                    style={{
                      background: 'none',
                      border: zone.is_active === 1 ? '2px solid #10b981' : '2px solid #ef4444',
                      borderRadius: '20px',
                      width: '40px',
                      height: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => handleToggleActive(zone)}
                  >
                    {zone.is_active === 1 ? (
                      <Check size={14} style={{ color: '#10b981' }} />
                    ) : (
                      <X size={14} style={{ color: '#ef4444' }} />
                    )}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px' }}
                      onClick={() => handleEdit(zone)}
                      title="Редактировать"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                      onClick={() => handleDelete(zone.id)}
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {zones.length === 0 && (
        <div className="empty-state">
          <MapPin size={48} />
          <p>Районов доставки пока нет</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Создать первый район
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editingZone ? 'Редактировать район' : 'Новый район'}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Настройте условия доставки</p>
              </div>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Название района *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Например: Центральный район"
                  />
                </div>
                
                <div className="form-group">
                  <label>Минимальная сумма для бесплатной доставки (₽)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.min_order_amount}
                    onChange={e => setFormData({...formData, min_order_amount: parseInt(e.target.value) || 0})}
                    placeholder="0 - доставка всегда платная"
                  />
                </div>

                <div className="form-group">
                  <label>Стоимость доставки (₽)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData.delivery_price}
                    onChange={e => setFormData({...formData, delivery_price: parseInt(e.target.value) || 0})}
                    placeholder="100"
                  />
                </div>

                <div className="form-group">
                  <label>Порядок сортировки</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>

                {points.length > 0 && (
                  <div className="form-group">
                    <label>Точка/Ресторан</label>
                    <select
                      value={formData.point_id}
                      onChange={e => setFormData({...formData, point_id: parseInt(e.target.value)})}
                      className="form-select"
                    >
                      {points.map(point => (
                        <option key={point.id} value={point.id}>
                          {point.name} {point.address ? `- ${point.address}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    />
                    <span>Район активен (клиенты видят его)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : (editingZone ? 'Обновить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryZones;
