import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Package, AlertTriangle, Download, Upload, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const UNIT_TYPES = ['шт', 'г', 'кг', 'мл', 'л', 'ч.л.', 'ст.л.', 'стакан', 'пучок', 'зубчик', 'ломтик', 'кусок', 'пласт', 'уп'];

function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    unit: 'шт',
    current_quantity: 0,
    min_quantity: 0,
    cost_per_unit: 0,
    supplier: ''
  });
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/ingredients`);
      const data = await response.json();
      setIngredients(data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки ингредиентов:', error);
      setLoading(false);
    }
  };

  // Экспорт в Excel
  const handleExport = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/export/ingredients`);
      const data = await response.json();
      
      // Создаём книгу Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ингредиенты');
      
      // Скачиваем файл
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `ingredients_${date}.xlsx`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка экспорта: ' + error.message);
    }
  };

  // Обработка выбора файла для импорта
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          alert('Файл пустой или содержит некорректные данные');
          return;
        }
        
        setImportFile(file);
        setImportPreview(data.slice(0, 5)); // Показываем первые 5 строк
        setShowImportModal(true);
      } catch (error) {
        console.error('Ошибка чтения файла:', error);
        alert('Ошибка чтения файла: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Импорт из Excel
  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const response = await fetch(`${FRONTPAD_API}/api/import/ingredients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: data })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(result.message);
          fetchIngredients();
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          alert('Ошибка импорта: ' + result.error);
        }
        setImporting(false);
      };
      reader.readAsBinaryString(importFile);
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('Ошибка импорта: ' + error.message);
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      const url = editing 
        ? `${FRONTPAD_API}/api/ingredients/${editing}`
        : `${FRONTPAD_API}/api/ingredients`;
      const method = editing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (response.ok) {
        fetchIngredients();
        setShowModal(false);
        setEditing(null);
        setForm({ name: '', unit: 'шт', current_quantity: 0, min_quantity: 0, cost_per_unit: 0, supplier: '' });
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить ингредиент?')) return;
    
    try {
      await fetch(`${FRONTPAD_API}/api/ingredients/${id}`, { method: 'DELETE' });
      fetchIngredients();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleRestock = async () => {
    if (restockQty <= 0) return;
    
    try {
      await fetch(`${FRONTPAD_API}/api/ingredients/${restockId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseFloat(restockQty), reason: 'Пополнение' })
      });
      fetchIngredients();
      setShowRestockModal(false);
      setRestockId(null);
      setRestockQty(0);
    } catch (error) {
      console.error('Ошибка пополнения:', error);
    }
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      unit: item.unit,
      current_quantity: item.current_quantity,
      min_quantity: item.min_quantity,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier || ''
    });
    setShowModal(true);
  };

  const openRestock = (id) => {
    setRestockId(id);
    setShowRestockModal(true);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  // Фильтрация по поиску
  const filteredIngredients = ingredients.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ingredients-page">
      <div className="page-header">
        <h1>Ингредиенты</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Поиск по ингредиентам */}
          <input
            type="text"
            className="form-input"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px' }}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            title="Импорт из Excel"
          >
            <Upload size={18} /> Импорт
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleExport}
            title="Экспорт в Excel"
          >
            <Download size={18} /> Экспорт
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', unit: 'шт', current_quantity: 0, min_quantity: 0, cost_per_unit: 0, supplier: '' }); setShowModal(true); }}>
            <Plus size={18} /> Добавить
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Ед. изм.</th>
              <th>Остаток</th>
              <th>Мин. остаток</th>
              <th>Себестоимость</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.map(item => {
              const isCritical = parseFloat(item.current_quantity) <= parseFloat(item.min_quantity);
              return (
                <tr key={item.id} style={isCritical ? { border: '2px solid #ef4444', backgroundColor: '#fef2f2' } : {}}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} color="#6b7280" />
                      {item.name}
                    </div>
                  </td>
                  <td>{item.unit}</td>
                  <td>
                    <strong style={isCritical ? { color: '#ef4444' } : {}}>{parseFloat(item.current_quantity).toFixed(2)}</strong>
                  </td>
                  <td>{parseFloat(item.min_quantity).toFixed(2)}</td>
                  <td>{parseFloat(item.cost_per_unit).toFixed(2)} руб.</td>
                  <td>
                    {isCritical ? (
                      <span className="badge badge-cancelled" style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #ef4444' }}>
                        <AlertTriangle size={12} /> Критично
                      </span>
                    ) : (
                      <span className="badge badge-delivered">OK</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openRestock(item.id)} title="Пополнить">
                        +
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)} title="Редактировать">
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)} title="Удалить">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredIngredients.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>
                  {searchTerm ? 'Ингредиенты не найдены' : 'Ингредиенты не добавлены'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка добавления/редактирования */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Редактировать' : 'Добавить ингредиент'}</h3>
              <button onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Название</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Единица измерения</label>
                  <select 
                    className="form-select"
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    {UNIT_TYPES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Текущее количество</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    value={form.current_quantity}
                    onChange={e => setForm({ ...form, current_quantity: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Минимальный остаток</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    value={form.min_quantity}
                    onChange={e => setForm({ ...form, min_quantity: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Себестоимость за единицу</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input"
                    value={form.cost_per_unit}
                    onChange={e => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Поставщик</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={form.supplier}
                  onChange={e => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleSave}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка пополнения */}
      {showRestockModal && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Пополнение остатка</h3>
              <button onClick={() => setShowRestockModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Количество для добавления</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRestockModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleRestock}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка импорта */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileSpreadsheet size={20} style={{ marginRight: '8px' }} />
                Импорт ингредиентов из Excel
              </h3>
              <button onClick={closeImportModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <strong>Файл:</strong> {importFile?.name}
              </div>
              
              {importPreview.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Предпросмотр (первые 5 строк):</strong>
                  <table className="table" style={{ marginTop: '8px', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {Object.keys(importPreview[0]).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => (
                            <td key={i}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div style={{ 
                padding: '12px', 
                background: '#e0f2fe', 
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <strong>Формат колонок:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Название (обязательно)</li>
                  <li>Единица измерения (опционально, по умолчанию "шт")</li>
                  <li>Текущее количество (опционально, по умолчанию 0)</li>
                  <li>Минимальное количество (опционально, по умолчанию 0)</li>
                  <li>Себестоимость за единицу (опционально, по умолчанию 0)</li>
                  <li>Поставщик (опционально)</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeImportModal}>Отмена</button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Импорт...' : 'Импортировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ingredients;
