import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Percent, Tag, X, Check, RefreshCw } from 'lucide-react';

// Используем относительный путь для работы через nginx
const API_URL = (process.env.REACT_APP_FONTPAD_API || '') + '/api';

function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percent',
    value: 0,
    min_order_amount: 0,
    max_discount_amount: '',
    code: '',
    is_active: true,
    valid_from: '',
    valid_to: '',
    usage_limit: ''
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch(`${API_URL}/discounts`);
      const data = await response.json();
      setDiscounts(data);
    } catch (error) {
      console.error('Ошибка загрузки скидок:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки скидок' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = editingDiscount 
        ? `${API_URL}/discounts/${editingDiscount.id}`
        : `${API_URL}/discounts`;
      const method = editingDiscount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          max_discount_amount: formData.max_discount_amount || null,
          usage_limit: formData.usage_limit || null,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_to || null
        })
      });
      
      if (!response.ok) throw new Error('Ошибка сохранения');
      
      setMessage({ type: 'success', text: editingDiscount ? 'Скидка обновлена' : 'Скидка создана' });
      setShowModal(false);
      setEditingDiscount(null);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      type: discount.type,
      value: discount.value,
      min_order_amount: discount.min_order_amount || 0,
      max_discount_amount: discount.max_discount_amount || '',
      code: discount.code || '',
      is_active: discount.is_active === 1,
      valid_from: discount.valid_from || '',
      valid_to: discount.valid_to || '',
      usage_limit: discount.usage_limit || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту скидку?')) return;
    
    try {
      const response = await fetch(`${API_URL}/discounts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
      
      setMessage({ type: 'success', text: 'Скидка удалена' });
      fetchDiscounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      await fetch(`${API_URL}/discounts/${discount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...discount, is_active: discount.is_active === 1 ? 0 : 1 })
      });
      fetchDiscounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percent',
      value: 0,
      min_order_amount: 0,
      max_discount_amount: '',
      code: '',
      is_active: true,
      valid_from: '',
      valid_to: '',
      usage_limit: ''
    });
  };

  const handleSyncToSite = async () => {
    try {
      const response = await fetch(`${API_URL}/discounts/sync-to-site`, { method: 'POST' });
      const data = await response.json();
      setMessage({ type: 'success', text: data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Управление скидками</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleSyncToSite}>
            <RefreshCw size={18} />
            Синхронизировать с сайтом
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} />
            Добавить скидку
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
              <th>Название</th>
              <th>Код</th>
              <th>Тип</th>
              <th>Значение</th>
              <th>Мин. сумма</th>
              <th>Использовано</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map(discount => (
              <tr key={discount.id}>
                <td>
                  <div className="discount-name">
                    <Tag size={16} />
                    {discount.name}
                  </div>
                  {discount.description && (
                    <div className="discount-description">{discount.description}</div>
                  )}
                </td>
                <td><code>{discount.code || '-'}</code></td>
                <td>
                  <span className={`badge badge-${discount.type}`}>
                    {discount.type === 'percent' ? `${discount.value}%` : `${discount.value} руб.`}
                  </span>
                </td>
                <td>
                  {discount.type === 'percent' && discount.max_discount_amount ? (
                    <span className="text-muted">до {discount.max_discount_amount} руб.</span>
                  ) : '-'}
                </td>
                <td>{discount.min_order_amount > 0 ? `${discount.min_order_amount} руб.` : '-'}</td>
                <td>
                  {discount.usage_limit ? `${discount.total_used || 0}/${discount.usage_limit}` : discount.total_used || 0}
                </td>
                <td>
                  <button 
                    className={`btn-toggle ${discount.is_active === 1 ? 'active' : ''}`}
                    onClick={() => handleToggleActive(discount)}
                  >
                    {discount.is_active === 1 ? <Check size={16} /> : <X size={16} />}
                  </button>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => handleEdit(discount)} title="Редактировать">
                      <Edit size={16} />
                    </button>
                    <button className="btn-icon delete" onClick={() => handleDelete(discount.id)} title="Удалить">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {discounts.length === 0 && (
        <div className="empty-state">
          <Percent size={48} />
          <p>Скидок пока нет</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Создать первую скидку
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDiscount ? 'Редактировать скидку' : 'Новая скидка'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Название *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Например: Скидка 10%"
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Описание</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Описание для администратора"
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label>Тип скидки</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="percent">Процент</option>
                    <option value="fixed">Фиксированная сумма</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Значение {formData.type === 'percent' ? '(%)' : '(руб.)'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Промокод</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="Например: SAVE10"
                  />
                </div>

                <div className="form-group">
                  <label>Мин. сумма заказа (руб.)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_order_amount}
                    onChange={e => setFormData({...formData, min_order_amount: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>Макс. скидка (руб.)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_discount_amount}
                    onChange={e => setFormData({...formData, max_discount_amount: e.target.value})}
                    placeholder="Только для процентных"
                  />
                </div>

                <div className="form-group">
                  <label>Лимит использований</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usage_limit}
                    onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                    placeholder="Без ограничений"
                  />
                </div>

                <div className="form-group">
                  <label>Действует с</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={e => setFormData({...formData, valid_from: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Действует до</label>
                  <input
                    type="date"
                    value={formData.valid_to}
                    onChange={e => setFormData({...formData, valid_to: e.target.value})}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    />
                    Скидка активна
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : (editingDiscount ? 'Обновить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Discounts;
