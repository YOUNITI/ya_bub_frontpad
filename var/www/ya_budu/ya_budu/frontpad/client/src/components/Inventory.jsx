import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, History, AlertTriangle } from 'lucide-react';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

function Inventory() {
  const [summary, setSummary] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, movementsRes] = await Promise.all([
        fetch(`${FRONTPAD_API}/api/inventory/summary`),
        fetch(`${FRONTPAD_API}/api/inventory-movements?limit=50`)
      ]);

      const summaryData = await summaryRes.json();
      const movementsData = await movementsRes.json();

      setSummary(summaryData);
      setMovements(movementsData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setLoading(false);
    }
  };

  const getTotalCost = () => {
    return summary.reduce((sum, item) => sum + parseFloat(item.cost_price || 0), 0);
  };

  const getTotalRevenue = () => {
    return summary.reduce((sum, item) => {
      const count = summary.filter(s => s.product_id === item.product_id).length;
      return sum + (parseFloat(item.selling_price || 0) * count);
    }, 0);
  };

  const getTotalProfit = () => {
    return summary.reduce((sum, item) => sum + parseFloat(item.profit || 0), 0);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Склад и себестоимость</h1>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('summary')}
        >
          <TrendingUp size={18} /> Себестоимость
        </button>
        <button 
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('movements')}
        >
          <History size={18} /> Движения
        </button>
      </div>

      {activeTab === 'summary' && (
        <>
          {/* Статистика */}
          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-label">Товаров с рецептурой</div>
              <div className="stat-value">{summary.filter(s => s.cost_price > 0).length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Общая себестоимость</div>
              <div className="stat-value">{getTotalCost().toFixed(2)} руб.</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Потенциальная прибыль</div>
              <div className="stat-value" style={{ color: '#10b981' }}>{getTotalProfit().toFixed(2)} руб.</div>
            </div>
          </div>

          {/* Таблица себестоимости */}
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Цена продажи</th>
                  <th>Себестоимость</th>
                  <th>Прибыль</th>
                  <th>Маржа</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item, idx) => (
                  <tr key={item.product_id || idx}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={16} color="#6b7280" />
                        {item.product_name}
                      </div>
                    </td>
                    <td>{parseFloat(item.selling_price).toFixed(2)} руб.</td>
                    <td>
                      {parseFloat(item.cost_price).toFixed(2)} руб.
                      {item.cost_price == 0 && (
                        <span className="badge badge-processing" style={{ marginLeft: '8px' }}>Нет рецептуры</span>
                      )}
                    </td>
                    <td style={{ color: parseFloat(item.profit) >= 0 ? '#10b981' : '#ef4444' }}>
                      {parseFloat(item.profit).toFixed(2)} руб.
                    </td>
                    <td>
                      <span className={`badge ${parseFloat(item.profit_percent) > 0 ? 'badge-delivered' : 'badge-cancelled'}`}>
                        {parseFloat(item.profit_percent).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header">
            <h3>Последние движения</h3>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              <History size={14} /> Обновить
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Ингредиент</th>
                <th>Тип</th>
                <th>Количество</th>
                <th>Причина</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((item, idx) => (
                <tr key={idx}>
                  <td>{new Date(item.created_at).toLocaleString('ru-RU')}</td>
                  <td>{item.ingredient_name}</td>
                  <td>
                    {item.movement_type === 'in' ? (
                      <span className="badge badge-delivered">
                        <TrendingUp size={12} /> Приход
                      </span>
                    ) : (
                      <span className="badge badge-cancelled">
                        <TrendingDown size={12} /> Расход
                      </span>
                    )}
                  </td>
                  <td style={{ 
                    color: item.movement_type === 'in' ? '#10b981' : '#ef4444',
                    fontWeight: 'bold'
                  }}>
                    {item.movement_type === 'in' ? '+' : '-'}{parseFloat(item.quantity).toFixed(3)}
                  </td>
                  <td>{item.reason || '-'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                    Движений нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Inventory;
