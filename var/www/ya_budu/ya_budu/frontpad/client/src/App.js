import React, { useState, useEffect, useRef, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Tags, Users, BarChart3, ChevronLeft, ChevronRight, Menu, Settings as SettingsIcon, BookOpen, TrendingUp, MessageSquare, Percent, PlusCircle, AlertTriangle, LogOut, Printer } from 'lucide-react';
import axios from 'axios';
import './App.css';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth, setupAxiosInterceptors } from './context/AuthContext';
import SoundNotification, { playNotificationSound } from './components/SoundNotification';
import Login from './components/Login';

// Настройка axios interceptor при импорте
setupAxiosInterceptors();

// API URLs - используем относительные пути для работы через nginx
// В production используем относительный путь (сервер на том же домене)
const getApiUrl = () => {
  // Пробуем использовать переменную окружения
  if (process.env.REACT_APP_FONTPAD_API) {
    return process.env.REACT_APP_FONTPAD_API;
  }
  // Для production - используем относительный путь (nginx проксирует)
  if (process.env.NODE_ENV === 'production') {
    return ''; // относительный путь - работает через nginx
  }
  // В development используем текущий хост
  return 'http://' + window.location.host;
};

const getWsUrl = () => {
  // Пробуем использовать переменную окружения
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  // Для production - используем относительный путь
  if (process.env.NODE_ENV === 'production') {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    return protocol + window.location.host + '/ws';
  }
  // В development используем текущий хост
  return 'ws://' + window.location.host;
};

const API_HOST = getApiUrl().replace('http://', '').replace('https://', '');
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
const WS_URL = getWsUrl();
const FRONTPAD_API = getApiUrl();

// Lazy loading компонентов для оптимизации переключения вкладок
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Orders = React.lazy(() => import('./components/Orders'));
const Products = React.lazy(() => import('./components/Products'));
const Categories = React.lazy(() => import('./components/Categories'));
const Customers = React.lazy(() => import('./components/Customers'));
const Reports = React.lazy(() => import('./components/Reports'));
const Settings = React.lazy(() => import('./components/Settings'));
const Ingredients = React.lazy(() => import('./components/Ingredients'));
const Recipes = React.lazy(() => import('./components/Recipes'));
const Inventory = React.lazy(() => import('./components/Inventory'));
const Messenger = React.lazy(() => import('./components/Messenger'));
const Discounts = React.lazy(() => import('./components/Discounts'));
const AddonTemplates = React.lazy(() => import('./components/AddonTemplates'));

// Компонент, который использует useAuth
function AppContent() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [criticalIngredients, setCriticalIngredients] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showAlert, setShowAlert] = useState(null);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const wsRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Функция печати чека (глобальная)
  const printReceipt = async (order, source = 'unknown') => {
    console.log(`[GLOBAL_PRINT] Запрос на печать чека для заказа #${order.id}, источник: ${source}`);
    try {
      const response = await axios.post(`${FRONTPAD_API}/api/orders/${order.id}/print`);
      console.log('[GLOBAL_PRINT] Ответ от сервера:', response.data);
      
      // Проверяем, пришёл ли html - сервер возвращает { html: '...', message: '...' }
      // response.data может быть { data: { html: '...' } } или напрямую { html: '...' }
      const html = response.data?.html || response.data?.data?.html;
      console.log('[GLOBAL_PRINT] Извлечённый html:', html ? 'ЕСТЬ (' + html.length + ' символов)' : 'ПУСТО');
      
      if (!html) {
        console.error('[GLOBAL_PRINT] НЕТ HTML в ответе! response:', response.data);
        return;
      }
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        // Добавляем HTML с кнопкой автопечати (обход блокировки)
        const htmlWithAutoPrint = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Чек #${order.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
              .header { text-align: center; margin-bottom: 20px; }
              .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .order-info { margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; }
              .total { font-weight: bold; font-size: 16px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 10px; }
              .print-btn { 
                display: block; 
                width: 100%; 
                padding: 15px; 
                background: #10b981; 
                color: white; 
                border: none; 
                font-size: 18px; 
                cursor: pointer; 
                margin-bottom: 10px;
              }
              .print-btn:hover { background: #059669; }
              .countdown { color: #666; text-align: center; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <button class="print-btn" id="autoPrintBtn">🖨️ НАЖМИТЕ ДЛЯ ПЕЧАТИ</button>
            <div class="countdown" id="countdown">Автопечать через 3 сек...</div>
            ${html}
            <script>
              // Автопечать с обратным отсчётом
              let seconds = 3;
              const btn = document.getElementById('autoPrintBtn');
              const countdown = document.getElementById('countdown');
              
              const timer = setInterval(() => {
                seconds--;
                if (seconds > 0) {
                  countdown.textContent = 'Автопечать через ' + seconds + ' сек...';
                } else {
                  clearInterval(timer);
                  countdown.textContent = 'Печатаем...';
                  // Пытаемся автопечать
                  try { window.print(); } catch(e) {}
                }
              }, 1000);
              
              // Печать по клику
              btn.onclick = function() {
                clearInterval(timer);
                try { window.print(); } catch(e) {}
              };
              
              // Фокус на кнопку
              btn.focus();
            </script>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlWithAutoPrint);
        printWindow.document.close();
        printWindow.focus();
        
        console.log('[GLOBAL_PRINT] Окно печати открыто с автопечатью');
      } else {
        console.error('[GLOBAL_PRINT] Не удалось открыть окно печати (заблокировано?)');
      }
    } catch (error) {
      console.error('[GLOBAL_PRINT] Error printing receipt:', error);
    }
  };
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Загрузка критичных ингредиентов и непрочитанных сообщений при монтировании
  useEffect(() => {
    // WebSocket подключаем сразу (не зависит от авторизации)
    if (WS_URL) {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket подключен');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket сообщение:', data);
        
        if (data.type === 'ingredient_low_stock') {
          setCriticalIngredients(prev => {
            const exists = prev.find(i => i.id === data.ingredient.id);
            if (exists) return prev;
            return [...prev, data.ingredient];
          });
          setShowAlert(data.ingredient);
          fetchCriticalIngredients();
        } else if (data.type === 'new_order') {
          playNotificationSound('order');
          fetchCriticalIngredients();
          fetchUnreadMessagesCount();
          
          console.log('[App.js new_order] autoPrint:', data.autoPrint, 'order:', data.order?.id);
          
          // Показываем глобальное уведомление о новом заказе
          setNewOrderAlert(data.order);
          
          // Автоматическая печать если это синхронизированный заказ с сайта (autoPrint: true)
          // Для локальных заказов из Frontpad (autoPrint: undefined) - НЕ печатаем автоматически
          if (data.autoPrint === true) {
            console.log('[AUTO_PRINT] Запуск автоматической печати для синхронизированного заказа #' + data.order.id);
            setTimeout(() => {
              printReceipt(data.order, 'auto_print_sync');
            }, 2000);
          }
        } else if (data.type === 'new_message') {
          fetchUnreadMessagesCount();
          playNotificationSound('message');
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket отключен, переподключение...');
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current = new WebSocket(WS_URL);
          }
        }, 3000);
      };
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Загружаем данные только если авторизованы
  useEffect(() => {
    if (!user && !isAuthenticated) return;
    
    fetchCriticalIngredients();
    fetchUnreadMessagesCount();
    
    // Слушатель для сброса счётчика сообщений при открытии Messenger
    const handleStorageChange = () => {
      const lastOpened = localStorage.getItem('messenger_opened');
      if (lastOpened) {
        fetchUnreadMessagesCount();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('messenger-opened', fetchUnreadMessagesCount);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('messenger-opened', fetchUnreadMessagesCount);
    };
  }, [user, isAuthenticated]);
  
  const fetchCriticalIngredients = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/ingredients/critical`);
      setCriticalIngredients(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки критичных ингредиентов:', error);
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/chats`);
      const chats = Array.isArray(response.data) ? response.data : [];
      const count = chats.filter(chat => chat.unread_count > 0).length;
      setUnreadMessagesCount(count);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  // Компонент загрузки
  const LoadingFallback = () => (
    <div className="loading">
      <div className="loading-spinner"></div>
      <div>Загрузка...</div>
    </div>
  );

  // Если не авторизован - показываем форму входа
  if (!user) {
    return <Login />;
  }

  return (
    <DataProvider>
      <Router>
        <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
              {!sidebarCollapsed && <h1>YounitiPad</h1>}
              <button 
                className="collapse-btn"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>
            <nav className="nav">
              <NavLink to="/" className="nav-link" end>
                <LayoutDashboard size={20} />
                {!sidebarCollapsed && <span>Панель</span>}
              </NavLink>
              <NavLink to="/orders" className="nav-link">
                <ShoppingCart size={20} />
                {!sidebarCollapsed && <span>Заказы</span>}
              </NavLink>
              <NavLink to="/products" className="nav-link">
                <Package size={20} />
                {!sidebarCollapsed && <span>Товары</span>}
              </NavLink>
              <NavLink to="/categories" className="nav-link">
                <Tags size={20} />
                {!sidebarCollapsed && <span>Категории</span>}
              </NavLink>
              <NavLink to="/customers" className="nav-link">
                <Users size={20} />
                {!sidebarCollapsed && <span>Клиенты</span>}
              </NavLink>
              <NavLink to="/reports" className="nav-link">
                <BarChart3 size={20} />
                {!sidebarCollapsed && <span>Отчёты</span>}
              </NavLink>
              <NavLink to="/ingredients" className="nav-link">
                <Package size={20} />
                {!sidebarCollapsed && <span>Склад/Ингр.</span>}
                {criticalIngredients.length > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    right: sidebarCollapsed ? '5px' : '10px',
                    background: '#ef4444', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {criticalIngredients.length}
                  </span>
                )}
              </NavLink>
              <NavLink to="/recipes" className="nav-link">
                <BookOpen size={20} />
                {!sidebarCollapsed && <span>Рецептуры</span>}
              </NavLink>
              <NavLink to="/inventory" className="nav-link">
                <TrendingUp size={20} />
                {!sidebarCollapsed && <span>Себестоим.</span>}
              </NavLink>
              <NavLink to="/messenger" className="nav-link">
                <MessageSquare size={20} />
                {!sidebarCollapsed && <span>Сообщения</span>}
                {unreadMessagesCount > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    right: sidebarCollapsed ? '5px' : '10px',
                    background: '#ef4444', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {unreadMessagesCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/discounts" className="nav-link">
                <Percent size={20} />
                {!sidebarCollapsed && <span>Скидки</span>}
              </NavLink>
              <NavLink to="/addon-templates" className="nav-link">
                <PlusCircle size={20} />
                {!sidebarCollapsed && <span>Допы</span>}
              </NavLink>
              <NavLink to="/settings" className="nav-link">
                <SettingsIcon size={20} />
                {!sidebarCollapsed && <span>Настройки</span>}
              </NavLink>
              <button 
                onClick={logout}
                className="nav-link"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  width: '100%', 
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                <LogOut size={20} />
                {!sidebarCollapsed && <span>Выход</span>}
              </button>
            </nav>
          </aside>
          <main className="main-content">
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            
            {/* Уведомление о критичном ингредиенте */}
            {showAlert && (
              <div style={{ 
                position: 'fixed', 
                top: '20px', 
                right: '20px', 
                background: '#ef4444', 
                color: 'white', 
                padding: '16px 24px', 
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 9999,
                animation: 'slideIn 0.3s ease',
                maxWidth: '350px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} />
                  Критичный остаток!
                </div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong>{showAlert.name}</strong> - осталось {showAlert.current_quantity} {showAlert.unit}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  Минимум: {showAlert.min_quantity} {showAlert.unit}
                </div>
                <button 
                  style={{ 
                    marginTop: '12px', 
                    background: 'white', 
                    color: '#ef4444', 
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  onClick={() => setShowAlert(null)}
                >
                  Понятно
                </button>
              </div>
            )}
            
            {/* Глобальное уведомление о новом заказе */}
            {newOrderAlert && (
              <div style={{ 
                position: 'fixed', 
                top: '20px', 
                right: '20px', 
                background: '#10b981', 
                color: 'white', 
                padding: '16px 24px', 
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 9999,
                animation: 'slideIn 0.3s ease'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Новый заказ! #{newOrderAlert.id}</div>
                <div style={{ fontSize: '14px' }}>{newOrderAlert.guest_name} — {newOrderAlert.total_amount} ₽</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-sm" 
                    style={{ background: 'white', color: '#10b981' }}
                    onClick={() => { printReceipt(newOrderAlert, 'alert_button'); setNewOrderAlert(null); }}
                  >
                    <Printer size={14} /> Печать
                  </button>
                  <button 
                    className="btn btn-sm" 
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                    onClick={() => setNewOrderAlert(null)}
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
            
            <Routes>
              <Route path="/" element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
              <Route path="/orders" element={<Suspense fallback={<LoadingFallback />}><Orders /></Suspense>} />
              <Route path="/products" element={<Suspense fallback={<LoadingFallback />}><Products /></Suspense>} />
              <Route path="/categories" element={<Suspense fallback={<LoadingFallback />}><Categories /></Suspense>} />
              <Route path="/customers" element={<Suspense fallback={<LoadingFallback />}><Customers /></Suspense>} />
              <Route path="/reports" element={<Suspense fallback={<LoadingFallback />}><Reports /></Suspense>} />
              <Route path="/ingredients" element={<Suspense fallback={<LoadingFallback />}><Ingredients /></Suspense>} />
              <Route path="/recipes" element={<Suspense fallback={<LoadingFallback />}><Recipes /></Suspense>} />
              <Route path="/inventory" element={<Suspense fallback={<LoadingFallback />}><Inventory /></Suspense>} />
              <Route path="/messenger" element={<Suspense fallback={<LoadingFallback />}><Messenger /></Suspense>} />
              <Route path="/discounts" element={<Suspense fallback={<LoadingFallback />}><Discounts /></Suspense>} />
              <Route path="/addon-templates" element={<Suspense fallback={<LoadingFallback />}><AddonTemplates /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<LoadingFallback />}><Settings /></Suspense>} />
            </Routes>
          </main>
        </div>
      </Router>
    </DataProvider>
  );
}

// Оборачиваем App в AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <SoundNotification enabled={true} />
      <AppContent />
    </AuthProvider>
  );
}
