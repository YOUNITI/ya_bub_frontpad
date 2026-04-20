import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, DollarSign, Users, Package, TrendingUp, Clock } from 'lucide-react';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/reports/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '28px' }}>Панель управления</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Заказов сегодня</div>
              <div className="stat-value">{stats?.today_orders?.count || 0}</div>
              <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                {(stats?.today_orders?.total || 0).toLocaleString()} ₽
                {stats?.today_orders?.avg_check > 0 && (
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    • сред. {stats.today_orders.avg_check.toFixed(0)} ₽
                  </span>
                )}
              </div>
            </div>
            <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px' }}>
              <ShoppingCart size={24} color="#2563eb" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Вчера</div>
              <div className="stat-value">{stats?.yesterday_orders?.count || 0}</div>
              <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                {(stats?.yesterday_orders?.total || 0).toLocaleString()} ₽
                {stats?.yesterday_orders?.avg_check > 0 && (
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    • сред. {stats.yesterday_orders.avg_check.toFixed(0)} ₽
                  </span>
                )}
              </div>
            </div>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px' }}>
              <TrendingUp size={24} color="#d97706" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">В этом месяце</div>
              <div className="stat-value">{stats?.month_orders?.count || 0}</div>
              <div style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                {(stats?.month_orders?.total || 0).toLocaleString()} ₽
                {stats?.month_orders?.avg_check > 0 && (
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    • сред. {stats.month_orders.avg_check.toFixed(0)} ₽
                  </span>
                )}
              </div>
            </div>
            <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '10px' }}>
              <DollarSign size={24} color="#059669" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">В производстве</div>
              <div className="stat-value">{stats?.pending_orders?.count || 0}</div>
              <div style={{ color: '#f59e0b', marginTop: '4px', fontSize: '14px' }}>
                требуют внимания
              </div>
            </div>
            <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '10px' }}>
              <Clock size={24} color="#dc2626" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Товаров в меню</div>
              <div className="stat-value">{stats?.active_products?.count || 0}</div>
            </div>
            <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '10px' }}>
              <Package size={24} color="#4f46e5" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Всего клиентов</div>
              <div className="stat-value">{stats?.total_customers?.count || 0}</div>
            </div>
            <div style={{ background: '#fce7f3', padding: '10px', borderRadius: '10px' }}>
              <Users size={24} color="#be185d" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Быстрые действия</h3>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/orders" className="btn btn-primary">
            <ShoppingCart size={18} />
            Создать заказ
          </a>
          <a href="/products" className="btn btn-success">
            <Package size={18} />
            Добавить товар
          </a>
          <a href="/reports" className="btn btn-secondary">
            <TrendingUp size={18} />
            Просмотреть отчёты
          </a>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Интеграция с сайтом</h3>
        </div>
        <div style={{ color: '#6b7280' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#10b981' }}>✓</strong> Меню синхронизировано с сайтом
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#10b981' }}>✓</strong> Заказы с сайта появляются автоматически
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#10b981' }}>✓</strong> WebSocket подключение активно
          </p>
          <p>
            <strong style={{ color: '#10b981' }}>✓</strong> Автоматическая печать чеков включена
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
