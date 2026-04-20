import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle } from 'lucide-react';
import axios from 'axios';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const AddonTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    default_price: '',
    unit: 'шт',
    is_active: 1
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/addon-templates`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingTemplate) {
        await axios.put(`${FRONTPAD_API}/api/addon-templates/${editingTemplate.id}`, formData);
      } else {
        await axios.post(`${FRONTPAD_API}/api/addon-templates`, formData);
      }
      
      setShowModal(false);
      setEditingTemplate(null);
      setFormData({ name: '', default_price: '', unit: 'шт', is_active: 1 });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Ошибка при сохранении: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      default_price: template.default_price || '',
      unit: template.unit || 'шт',
      is_active: template.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот шаблон допа?')) return;
    
    try {
      await axios.delete(`${FRONTPAD_API}/api/addon-templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Ошибка при удалении: ' + (error.response?.data?.error || error.message));
    }
  };

  const toggleActive = async (template) => {
    try {
      await axios.put(`${FRONTPAD_API}/api/addon-templates/${template.id}`, {
        ...template,
        is_active: template.is_active ? 0 : 1
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  if (loading) return <div className="card">Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Шаблоны допов</h2>
        <button className="btn btn-primary" onClick={() => {
          setEditingTemplate(null);
          setFormData({ name: '', default_price: '', unit: 'шт', is_active: 1 });
          setShowModal(true);
        }}>
          <Plus size={18} />
          Добавить шаблон
        </button>
      </div>

      <div className="card">
        {templates.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цена</th>
                <th>Ед.</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id}>
                  <td style={{ fontWeight: '500' }}>{template.name}</td>
                  <td>{parseFloat(template.default_price || 0).toFixed(2)} ₽</td>
                  <td>{template.unit || 'шт'}</td>
                  <td>
                    <span className={`badge ${template.is_active ? 'badge-active' : 'badge-cancelled'}`}>
                      {template.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => toggleActive(template)}
                        title={template.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(template)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(template.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Шаблоны допов не созданы
          </div>
        )}
      </div>

      {/* Модалка создания/редактирования */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон допа'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Например: Дополнительный сыр"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Цена (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.default_price}
                      onChange={(e) => setFormData({...formData, default_price: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Единица измерения</label>
                    <select
                      className="form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    >
                      <option value="шт">шт</option>
                      <option value="г">г</option>
                      <option value="мл">мл</option>
                      <option value="порция">порция</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                    />
                    Активен
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonTemplates;
