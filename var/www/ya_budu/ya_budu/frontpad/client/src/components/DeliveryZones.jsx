import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Check } from 'lucide-react';

// Используем относительный путь для работы через nginx
const API_URL = '/api';

function DeliveryZones() {
  const [zones, setZones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    min_order_amount: 0,
    delivery_price: 0,
    is_active: true,
    sort_order: 0
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      // Пробуем разные варианты API endpoints
      const endpoints = [
        `${API_URL}/delivery-zones`,
        `${API_URL}/admin/delivery-zones`,
        `/api/delivery-zones`,
        `/api/admin/delivery-zones`
      ];
      
      let data = null;
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result)) {
              data = result;
              success = true;
              break;
            }
          }
        } catch (e) {
          // Пробуем следующий endpoint
        }
      }
      
      if (success && Array.isArray(data)) {
        setZones(data);
      } else {
        console.error('Не удалось загрузить районы доставки. API вернул:', data);
        setZones([]);
        setMessage({ type: 'error', text: 'Ошибка загрузки районов доставки. API недоступен.' });
      }
    } catch (error) {
      console.error('Ошибка загрузки районов доставки:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки районов доставки' });
      setZones([]);
    }
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
      sort_order: zone.sort_order || 0
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
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      min_order_amount: 0,
      delivery_price: 0,
      is_active: true,
      sort_order: 0
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

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start">
          <div className="bg-blue-100 rounded-full p-3 mr-4">
            <i className="fas fa-truck text-blue-600 text-2xl"></i>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 text-lg mb-2">
              Как работает система доставки
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start">
                <i className="fas fa-check-circle text-green-600 mr-2 mt-0.5"></i>
                <p>
                  <strong>Бесплатная доставка:</strong> Если сумма заказа больше или равна минимальной сумме района
                </p>
              </div>
              <div className="flex items-start">
                <i className="fas fa-times-circle text-red-600 mr-2 mt-0.5"></i>
                <p>
                  <strong>Платная доставка:</strong> Если сумма заказа меньше минимальной суммы - применяется стоимость доставки
                </p>
              </div>
              <div className="flex items-start">
                <i className="fas fa-sync text-blue-600 mr-2 mt-0.5"></i>
                <p>
                  <strong>Синхронизация:</strong> Все районы автоматически синхронизируются с основным сайтом
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Район</th>
              <th>Мин. сумма для бесплатной доставки</th>
              <th>Стоимость доставки</th>
              <th>Порядок</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id}>
                <td>
                  <div className="zone-name">
                    <MapPin size={16} className="text-brand-yellow" />
                    <div>
                      <div className="font-bold">{zone.name}</div>
                      <div className="text-xs text-gray-500">ID: {zone.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {zone.min_order_amount > 0 ? (
                    <div>
                      <span className="text-success font-bold">{zone.min_order_amount} ₽</span>
                      <div className="text-xs text-gray-500 mt-1">≥ {zone.min_order_amount} ₽ = бесплатно</div>
                    </div>
                  ) : (
                    <span className="text-muted">Доставка всегда платная</span>
                  )}
                </td>
                <td>
                  {zone.delivery_price > 0 ? (
                    <div>
                      <span className="text-warning font-bold">{zone.delivery_price} ₽</span>
                      <div className="text-xs text-gray-500 mt-1">при заказе &lt; {zone.min_order_amount || '∞'} ₽</div>
                    </div>
                  ) : (
                    <span className="text-success font-bold">Бесплатно</span>
                  )}
                </td>
                <td>
                  <div className="text-center font-bold">{zone.sort_order || 0}</div>
                </td>
                <td>
                  <button 
                    className={`btn-toggle ${zone.is_active === 1 ? 'active' : ''}`}
                    onClick={() => handleToggleActive(zone)}
                    title={zone.is_active === 1 ? 'Активен' : 'Неактивен'}
                  >
                    {zone.is_active === 1 ? (
                      <span className="text-green-600"><Check size={16} /></span>
                    ) : (
                      <span className="text-red-600"><X size={16} /></span>
                    )}
                  </button>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon btn-edit" onClick={() => handleEdit(zone)} title="Редактировать район">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(zone.id)} title="Удалить район">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {zones.length > 0 && (
        <div className="table-footer bg-gray-50 p-4 rounded-b-lg border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <i className="fas fa-info-circle mr-2"></i>
              Всего районов: <strong>{zones.length}</strong>
            </div>
            <div>
              <i className="fas fa-check-circle mr-2 text-green-600"></i>
              Активных: <strong>{zones.filter(z => z.is_active === 1).length}</strong>
            </div>
          </div>
        </div>
      )}

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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editingZone ? 'Редактировать район доставки' : 'Новый район доставки'}</h3>
                <p className="text-sm text-gray-500 mt-1">Настройте условия доставки для этого района</p>
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
                    placeholder="Например: Центральный район, Поселок Прогресс"
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
                  <small className="form-hint">
                    <i className="fas fa-info-circle mr-1"></i>
                    При заказе на эту сумму или больше - доставка бесплатная
                  </small>
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
                  <small className="form-hint">
                    <i className="fas fa-info-circle mr-1"></i>
                    Применяется, если сумма заказа меньше минимальной
                  </small>
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
                  <small className="form-hint">Районы с меньшим числом показываются первыми</small>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    />
                    <span className="flex items-center">
                      <i className="fas fa-check-circle mr-2 text-green-600"></i>
                      Район активен (клиенты видят его при оформлении заказа)
                    </span>
                  </label>
                </div>

                <div className="form-group full-width">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-blue-900 mb-3">
                      <i className="fas fa-calculator mr-2"></i>
                      Пример расчета стоимости доставки
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-gray-700">Заказ на 500 ₽:</span>
                        <span className="font-bold">
                          {formData.min_order_amount > 0 && 500 < formData.min_order_amount ? (
                            <span className="text-orange-600">
                              {formData.delivery_price > 0 ? `${formData.delivery_price} ₽` : 'Бесплатно'}
                            </span>
                          ) : (
                            <span className="text-green-600">Бесплатно</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-gray-700">Заказ на 1000 ₽:</span>
                        <span className="font-bold">
                          {formData.min_order_amount > 0 && 1000 < formData.min_order_amount ? (
                            <span className="text-orange-600">
                              {formData.delivery_price > 0 ? `${formData.delivery_price} ₽` : 'Бесплатно'}
                            </span>
                          ) : (
                            <span className="text-green-600">Бесплатно</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded">
                        <span className="text-gray-700">Заказ на 2000 ₽:</span>
                        <span className="font-bold">
                          {formData.min_order_amount > 0 && 2000 < formData.min_order_amount ? (
                            <span className="text-orange-600">
                              {formData.delivery_price > 0 ? `${formData.delivery_price} ₽` : 'Бесплатно'}
                            </span>
                          ) : (
                            <span className="text-green-600">Бесплатно</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {formData.min_order_amount > 0 && (
                      <p className="text-xs text-blue-700 mt-3">
                        <i className="fas fa-lightbulb mr-1"></i>
                        При заказе от {formData.min_order_amount} ₽ доставка будет бесплатной
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  <i className="fas fa-times mr-2"></i>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Сохранение...</>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      {editingZone ? 'Обновить' : 'Создать'}
                    </>
                  )}
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
