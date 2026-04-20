import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${FRONTPAD_API}/api/categories/${editingCategory.id}`, formData);
      } else {
        await axios.post(`${FRONTPAD_API}/api/categories`, { ...formData, sort_order: categories.length });
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Ошибка при сохранении категории');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      await axios.delete(`${FRONTPAD_API}/api/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Невозможно удалить категорию с товарами');
    }
  };

  // Обработка завершения drag-and-drop
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) {
      console.log('[DragEnd] No destination, exiting');
      return;
    }
    console.log('[DragEnd] source:', result.source.index, '-> destination:', result.destination.index);

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Обновляем локально немедленно
    setCategories(items);

    // Отправляем новый порядок на сервер
    try {
      const reorderedCategories = items.map((cat, index) => ({
        id: cat.id,
        sort_order: index
      }));
      await axios.put(`${FRONTPAD_API}/api/categories/reorder`, { categories: reorderedCategories });
      console.log('Порядок категорий сохранён');
    } catch (error) {
      console.error('Ошибка сохранения порядка категорий:', error);
      // При ошибке возвращаем исходный порядок
      fetchCategories();
    }
  }, [categories]);

  if (loading) return <div className="card">Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Категории</h2>
        <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setShowModal(true); }}>
          <Plus size={18} />
          Добавить категорию
        </button>
      </div>

      <div className="card">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <table className="table" {...provided.droppableProps} ref={provided.innerRef}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Название</th>
                    <th>Slug</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => (
                    <Draggable key={category.id.toString()} draggableId={category.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            background: snapshot.isDragging ? '#f0f9ff' : undefined,
                            ...provided.draggableProps.style
                          }}
                        >
                          <td {...provided.dragHandleProps}>
                            <GripVertical size={18} color="#9ca3af" style={{ cursor: 'grab' }} />
                          </td>
                          <td style={{ fontWeight: '500' }}>{category.name}</td>
                          <td>
                            <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                              {category.slug}
                            </code>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(category)}>
                                <Edit2 size={16} />
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(category.id)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
        {categories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Категорий пока нет
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h3>
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
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
