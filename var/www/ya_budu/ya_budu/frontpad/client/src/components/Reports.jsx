import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Calendar, DollarSign, Package } from 'lucide-react';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const Reports = () => {
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        axios.get(`${FRONTPAD_API}/api/reports/sales`, { params: { date_from: dateRange.from, date_to: dateRange.to } }),
        axios.get(`${FRONTPAD_API}/api/reports/top-products`, { params: { date_from: dateRange.from, date_to: dateRange.to, limit: 10 } })
      ]);
      setSalesData(salesRes.data);
      setTopProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = salesData.reduce((sum, day) => sum + (day.total_sales || 0), 0);
  const totalOrders = salesData.reduce((sum, day) => sum + (day.order_count || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="card">Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Отчёты и аналитика</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            value={dateRange.from}
            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
          />
          <span>—</span>
          <input
            type="date"
            className="form-input"
            value={dateRange.to}
            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Выручка</div>
              <div className="stat-value">{totalSales.toLocaleString()} ₽</div>
            </div>
            <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '10px' }}>
              <DollarSign size={24} color="#059669" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Заказов</div>
              <div className="stat-value">{totalOrders}</div>
            </div>
            <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px' }}>
              <TrendingUp size={24} color="#2563eb" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Средний чек</div>
              <div className="stat-value">{Math.round(avgOrderValue).toLocaleString()} ₽</div>
            </div>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px' }}>
              <Calendar size={24} color="#d97706" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Продажи по дням</h3>
          </div>
          {salesData.length > 0 ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '20px 0' }}>
              {salesData.slice(0, 30).reverse().map((day, index) => {
                const maxSales = Math.max(...salesData.map(d => d.total_sales || 0));
                const height = maxSales > 0 ? ((day.total_sales || 0) / maxSales) * 100 : 0;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div 
                      style={{ 
                        width: '100%', 
                        height: `${height}%`, 
                        background: '#4361ee',
                        borderRadius: '4px 4px 0 0',
                        minHeight: (day.total_sales || 0) > 0 ? '4px' : '0'
                      }} 
                      title={`${formatDate(day.date)}: ${day.total_sales || 0} ₽ (${day.order_count || 0} заказов)`}
                    />
                    <span style={{ fontSize: '9px', color: '#6b7280', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                      {formatDate(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Нет данных за выбранный период
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Топ товаров</h3>
          </div>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topProducts.map((product, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: index < 3 ? '#4361ee' : '#e5e7eb',
                      color: index < 3 ? 'white' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>{product.product_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600' }}>{product.total_quantity} шт</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{product.total_revenue} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Нет данных
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Детализация продаж</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Заказов</th>
              <th>Выручка</th>
              <th>Средний чек</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((day, index) => (
              <tr key={index}>
                <td>{new Date(day.date).toLocaleDateString('ru-RU')}</td>
                <td>{day.order_count || 0}</td>
                <td><strong>{(day.total_sales || 0).toLocaleString()} ₽</strong></td>
                <td>{Math.round(day.avg_order_value || 0).toLocaleString()} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
        {salesData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Нет данных за выбранный период
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;