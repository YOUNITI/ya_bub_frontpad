import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Eye, Trash2, X, Printer, RotateCcw, Bell, Calendar, Edit2, History, Star, Percent, Check } from 'lucide-react';
import moment from 'moment-timezone';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from './SoundNotification';

// API и WebSocket URL - относительные пути для работы через nginx
const FRONTPAD_API = '';
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';

// Получение текущей даты по московскому времени
const getMoscowDate = () => {
  return moment().tz('Europe/Moscow').format('YYYY-MM-DD');
};

// Компонент для выбора допов
const AddonSelector = ({ addons, onApply, onCancel }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, {
          id: addon.addon_template_id || addon.id,
          name: addon.addon_name || addon.name,
          price: parseFloat(addon.custom_price || addon.default_price || addon.price || 0),
          quantity: 1
        }];
      }
    });
  };

  const updateAddonQuantity = (addonId, quantity) => {
    if (quantity <= 0) {
      setSelectedAddons(prev => prev.filter(a => a.id !== addonId));
    } else {
      setSelectedAddons(prev => prev.map(a =>
        a.id === addonId ? { ...a, quantity } : a
      ));
    }
  };

  const totalAddonsPrice = selectedAddons.reduce((sum, addon) => sum + (parseFloat(addon.price || 0) * parseInt(addon.quantity || 1)), 0);

  return (
    <div>
      <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
        {addons.map(addon => {
          const isSelected = selectedAddons.some(a => a.id === (addon.addon_template_id || addon.id));
          const selectedAddon = selectedAddons.find(a => a.id === (addon.addon_template_id || addon.id));

          return (
            <div
              key={addon.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                border: `1px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '8px',
                marginBottom: '8px',
                background: isSelected ? '#f0fdf4' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => toggleAddon(addon)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: '500' }}>{addon.addon_name || addon.name}</span>
                {addon.description && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{addon.description}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: '600', color: '#10b981' }}>
                  +{(addon.custom_price || addon.default_price || addon.price || 0)} ₽
                </span>

                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAddonQuantity(selectedAddon.id, selectedAddon.quantity - 1);
                      }}
                      style={{ padding: '2px 6px', minWidth: '24px' }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center' }}>{selectedAddon.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAddonQuantity(selectedAddon.id, selectedAddon.quantity + 1);
                      }}
                      style={{ padding: '2px 6px', minWidth: '24px' }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Выбрано допов: {selectedAddons.length}
          </div>
          {totalAddonsPrice > 0 && (
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
              Допы: +{totalAddonsPrice} ₽
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApply(selectedAddons)}
          >
            Добавить в заказ
          </button>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  // Используем DataContext для товаров и категорий (централизованное кэширование)
  const { products, loading: dataLoading, updateProductInCache } = useData();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [filter, setFilter] = useState('all');
  // Используем useRef для хранения даты чтобы избежать race condition
  const dateFilterRef = useRef(getMoscowDate());
  const [dateFilter, setDateFilterState] = useState(getMoscowDate());
  const wsRef = useRef(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    order_type: 'delivery',
    payment: 'cash',
    comment: '',
    items: [],
    pickup_location: '1' // ID точки самовывоза по умолчанию
  });
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [preorderDates, setPreorderDates] = useState([]);
  const [showPreorders, setShowPreorders] = useState(false);
  const [currentPreorderDate, setCurrentPreorderDate] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [customerRecommendations, setCustomerRecommendations] = useState({ recommendations: [] });
  const [activeTab, setActiveTab] = useState('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [sizeModal, setSizeModal] = useState(null);
  const [addonModal, setAddonModal] = useState(null);
  const [discountModal, setDiscountModal] = useState(null);
  const [discountForm, setDiscountForm] = useState({ amount: 0, type: 'rub', reason: '' });
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [acceptModal, setAcceptModal] = useState(null);
  const [readyTime, setReadyTime] = useState('');
  const [couriers, setCouriers] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const currentPointId = user?.point_id || 1;

  // Пункты самовывоза
  const pickupLocations = [
    {
      id: '1',
      name: 'Ресторан "ЯБУДУ"',
      address: 'Профессора Малигонова 35',
      schedule: 'Пн-Чт 11:00-22:00, Пт-Сб 11:00-23:00, Вс 11:00-22:00'
    },
    {
      id: '2',
      name: 'Мурата Ахеджака 26',
      address: 'Мурата Ахеджака 26',
      schedule: 'Пн-Вс 10:00-22:00'
    }
  ];

  // Функция для обновления даты в ref и state
  const setDateFilter = (date) => {
    dateFilterRef.current = date;
    setDateFilterState(date);
  };

  // Очищаем localStorage и сбрасываем дату на актуальную при монтировании
  useEffect(() => {
    localStorage.removeItem('orders_dateFilter');
    // Принудительно сбрасываем дату на текущую московскую
    const today = getMoscowDate();
    setDateFilter(today);
    
    // Товары уже загружены через DataContext
    
    // Загружаем заказы и даты предзаказов параллельно (без ожидания)
    fetchOrdersWithDate(today);
    fetchPreorderDates();
    
    // Подключение WebSocket
    wsRef.current = new WebSocket(WS_URL);
    
    wsRef.current.onopen = () => {
      console.log('WebSocket подключен');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket сообщение:', data);
      
      switch (data.type) {
        case 'new_order':
          // НЕ обрабатываем new_order здесь - только App.js обрабатывает автоматическую печать
          // Показываем уведомление о новом заказе (из App.js оно уже придёт)
          // Просто перезагружаем заказы
          const currentDate = getMoscowDate();
          setDateFilter(currentDate);
          fetchOrdersWithDate(currentDate);
          break;
        case 'order_accepted':
        case 'order_rejected':
        case 'order_status_changed':
        case 'order_updated':
          // Просто обновляем список заказов на текущей дате
          // Не вызываем fetchOrdersWithDate с фильтром - используем текущий фильтр
          // Это предотвращает race condition с локальным обновлением
          fetchOrdersWithDate(dateFilterRef.current);
          fetchPreorderDates();

          // Если пользователь находится в режиме просмотра предзаказов, обновляем их список
          if (showPreorders && currentPreorderDate) {
            fetchPreordersForDate(currentPreorderDate);
          }
          break;
        case 'order_deleted':
          // Просто обновляем список заказов на текущей дате
          fetchOrdersWithDate(dateFilterRef.current);
          fetchPreorderDates();
          break;
        case 'print_receipt':
          // PRI POLUCHENII KOMANDY PECHATI OT SERVERA - IGNORIRUEM VSEGDA
          // POTOMU CHTO ESLI POL'ZOVATEL' NAZHAL KNOPKU, MY UZHE RASPECHATALI
          // I BROADCAST OT SERVERA SOZDAET DUBLICAT, KOTORYY NUJNO IGNORIROVAT
          console.log('[AUTO_PRINT] Poluchena komanda pechati, ignoriruyu (izbegayem dublikacii)');
          break;
        default:
          break;
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('WebSocket отключен, переподключение...');
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          wsRef.current = new WebSocket(WS_URL);
        }
      }, 3000);
    };
    
    // Polling fallback каждые 10 секунд (для более быстрого обновления)
    const pollingInterval = setInterval(() => {
      fetchOrdersWithDate(dateFilterRef.current);
      fetchPreorderDates();
    }, 10000);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(pollingInterval);
    };
  }, []);

  // При изменении фильтра даты загружаем заказы
  useEffect(() => {
    console.log('[useEffect dateFilter] Fetching orders for date:', dateFilter);
    fetchOrdersWithDate(dateFilter);
  }, [dateFilter, filter]);

  // Функция fetchOrders с возможностью передать конкретную дату
  // forcedFilter позволяет принудительно использовать определённый фильтр
  const fetchOrdersWithDate = async (dateParamOverride, preorderDatesParam = null, forcedFilter = null) => {
    try {
      // Получаем текущую дату по московскому времени с использованием moment-timezone
      const moscowNow = moment().tz('Europe/Moscow');
      const moscowToday = moscowNow.format('YYYY-MM-DD');
      
      // Используем переданную дату или текущий фильтр
      let dateParam = dateParamOverride || dateFilterRef.current;
      
      console.log('[fetchOrders] dateParam:', dateParam, 'moscowToday:', moscowToday);
      
      // Инициализируем dateParam
      if (dateParam === 'today') {
        dateParam = moscowToday;
      } else if (dateParam === 'yesterday') {
        const yesterday = moscowNow.clone().subtract(1, 'day');
        dateParam = yesterday.format('YYYY-MM-DD');
      } else if (dateParam === 'tomorrow') {
        const tomorrow = moscowNow.clone().add(1, 'day');
        dateParam = tomorrow.format('YYYY-MM-DD');
      }
      
      console.log('[fetchOrders] final dateParam:', dateParam);
      
      // Добавляем timestamp для предотвращения кэширования
      const cacheBuster = Date.now();
      
      // Получаем preorderDates если не переданы
      const preordersData = preorderDatesParam || preorderDates;
      
      // Для дат с предзаказами используем endpoint предзаказов
      // Проверяем является ли эта дата датой с предзаказами
      const hasPreordersOnDate = preordersData.some(d => d.delivery_date === dateParam);
      if (hasPreordersOnDate) {
        const response = await axios.get(`${FRONTPAD_API}/api/preorders/${dateParam}?_t=${cacheBuster}`);
        setOrders(response.data || []);
      } else {
        const params = { date: dateParam, _t: cacheBuster };
        console.log('[fetchOrders] Отправка запроса с params:', params);
        
        // Используем forcedFilter если передан, иначе используем filter из state
        const effectiveFilter = forcedFilter !== null ? forcedFilter : filter;
        console.log('[fetchOrders] effectiveFilter:', effectiveFilter, '(forced:', forcedFilter, ', state:', filter, ')');
        
        if (effectiveFilter !== 'all') {
          params.status = effectiveFilter;
        }
        const response = await axios.get(`${FRONTPAD_API}/api/orders`, { params });
        console.log('[fetchOrders] Ответ получен, количество заказов:', response.data?.length || 0);
        console.log('[fetchOrders] Orders is_asap values:', response.data?.map(o => ({ id: o.id, is_asap: o.is_asap, delivery_date: o.delivery_date })));
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Обёртка для fetchOrders которая использует текущий dateFilter
  // Может принимать явный параметр filter для принудительного сброса фильтра
  const fetchOrders = (forcedFilter = null) => {
    // Если передан forcedFilter - используем его, иначе используем текущий filter из state
    if (forcedFilter) {
      fetchOrdersWithDate(dateFilterRef.current, null, forcedFilter);
    } else {
      fetchOrdersWithDate(dateFilterRef.current);
    }
  };

  // fetchProducts удалён - товары загружаются через DataContext

  // Функция для ленивой загрузки размеров товара (вызывается только при добавлении в заказ)
  const fetchProductSizes = async (productId) => {
    try {
      const sizesResponse = await axios.get(`${FRONTPAD_API}/api/products/${productId}/sizes`);
      return sizesResponse.data;
    } catch (error) {
      console.error(`Error fetching sizes for product ${productId}:`, error);
      return [];
    }
  };

  // Функция для загрузки допов товара
  const fetchProductAddons = async (productId) => {
    try {
      const addonsResponse = await axios.get(`${FRONTPAD_API}/api/products/${productId}/addons`);
      return addonsResponse.data;
    } catch (error) {
      console.error(`Error fetching addons for product ${productId}:`, error);
      return [];
    }
  };

  // Функция для загрузки допов размера
  const fetchSizeAddons = async (sizeId) => {
    try {
      const addonsResponse = await axios.get(`${FRONTPAD_API}/api/sizes/${sizeId}/size-addons`);
      return addonsResponse.data;
    } catch (error) {
      console.error(`Error fetching size addons for size ${sizeId}:`, error);
      return [];
    }
  };

  const fetchPreorderDates = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/preorder-dates`);
      const dates = response.data || [];
      console.log('[fetchPreorderDates] Received dates:', dates);
      setPreorderDates(dates);
      return dates;
    } catch (error) {
      console.error('Error fetching preorder dates:', error);
      return [];
    }
  };

  const fetchPreordersForDate = async (date) => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/preorders/${date}`);
      setPreorders(response.data || []);
      setShowPreorders(true);
    } catch (error) {
      console.error('Error fetching preorders:', error);
    }
  };

  // Загрузка истории заказов клиента
  const fetchCustomerOrders = async (phone) => {
    if (!phone) return;
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/customers/${phone}/orders`);
      setCustomerOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setCustomerOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Загрузка рекомендаций для клиента
  const fetchCustomerRecommendations = async (phone) => {
    if (!phone) return;
    setLoadingRecommendations(true);
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/customers/${phone}/recommendations`);
      setCustomerRecommendations(response.data || { recommendations: [] });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setCustomerRecommendations({ recommendations: [] });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Загрузка списка курьеров
  const fetchCouriers = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/couriers`);
      setCouriers(response.data || []);
    } catch (error) {
      console.error('Error fetching couriers:', error);
      setCouriers([]);
    }
  };

  // Назначить курьера на заказ
  const assignCourier = async (orderId, courierId) => {
    if (!courierId) {
      alert('Выберите курьера');
      return;
    }
    
    // Получаем имя курьера из списка
    const courier = couriers.find(c => c.id == courierId);
    const courierName = courier?.name || 'Курьер';
    
    try {
      const response = await axios.put(`${FRONTPAD_API}/api/orders/${orderId}/assign-courier`, { 
        courier_id: courierId,
        courier_name: courierName
      });
      console.log('[ASSIGN_COURIER] Курьер назначен:', response.data);
      
      // Обновляем заказ в списке
      fetchOrders();
      
      // Обновляем в деталях если открыто
      if (showDetails && showDetails.id === orderId) {
        setShowDetails({ ...showDetails, courier_id: courierId, courier_name: couriers.find(c => c.id == courierId)?.name });
      }
      
      // Обновляем в редактировании если открыто
      if (editOrder && editOrder.id === orderId) {
        setEditOrder({ ...editOrder, courier_id: courierId, courier_name: courierName });
      }
      
      alert('Курьер назначен');
    } catch (error) {
      console.error('Error assigning courier:', error);
      alert('Ошибка при назначении курьера');
    }
  };

  // Открыть детали заказа с загрузкой истории и рекомендаций
  const handleShowDetails = async (order) => {
    setShowDetails(order);
    setActiveTab('details');
    setCustomerOrders([]);
    setCustomerRecommendations({ recommendations: [] });
    
    if (order.guest_phone) {
      await Promise.all([
        fetchCustomerOrders(order.guest_phone),
        fetchCustomerRecommendations(order.guest_phone)
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }
    
    try {
      const total_amount = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      // Разбираем адрес на компоненты
      const addressParts = formData.customer_address ? formData.customer_address.split(',').map(s => s.trim()) : [];
      
      // Отправляем данные с правильными именами полей для API
      await axios.post(`${FRONTPAD_API}/api/orders`, {
        guest_name: formData.customer_name,
        guest_phone: formData.customer_phone,
        guest_email: null,
        order_type: formData.order_type,
        street: addressParts[0] || '',
        building: addressParts[1] || '',
        apartment: addressParts[2] || '',
        entrance: null,
        floor: null,
        intercom: null,
        is_asap: 1,
        delivery_date: null,
        delivery_time: null,
        custom_time: null,
        payment: formData.payment,
        comment: formData.comment,
        items: formData.items,
        total_amount,
        point_id: currentPointId
      });
      setShowModal(false);
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        order_type: 'delivery',
        payment: 'cash',
        comment: '',
        items: [],
        pickup_location: '1'
      });
      // После создания заказа переключаемся на текущую дату
      const currentDate = getMoscowDate();
      setDateFilter(currentDate);
      fetchOrdersWithDate(currentDate);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ошибка при создании заказа');
    }
  };

  // Обновление заказа
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!editOrder || !editOrder.items || editOrder.items.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }
    
    try {
      const total_amount = editOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      await axios.put(`${FRONTPAD_API}/api/orders/${editOrder.id}`, {
        guest_name: editOrder.guest_name,
        guest_phone: editOrder.guest_phone,
        order_type: editOrder.order_type,
        address: editOrder.address,
        street: editOrder.street,
        building: editOrder.building,
        apartment: editOrder.apartment,
        entrance: editOrder.entrance,
        floor: editOrder.floor,
        intercom: editOrder.intercom,
        delivery_date: editOrder.delivery_date,
        delivery_time: editOrder.delivery_time,
        payment: editOrder.payment,
        comment: editOrder.comment,
        items: editOrder.items,
        total_amount,
        status: editOrder.status,
        location_id: editOrder.order_type === 'pickup' ? parseInt(editOrder.location_id) : null,
        point_id: currentPointId
      });
      setEditOrder(null);
      fetchOrders();
      if (showDetails && showDetails.id === editOrder.id) {
        setShowDetails({ ...editOrder, items: editOrder.items, total_amount });
      }
      alert('Заказ успешно обновлён');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Ошибка при обновлении заказа');
    }
  };

  useEffect(() => {
    if (products.length > 0 && expandedCategories.length === 0) {
      const categories = Object.keys(products.reduce((acc, product) => {
        const category = product.category_name || 'Без категории';
        acc[category] = true;
        return acc;
      }, {}));
      setExpandedCategories(categories);
    }
  }, [products, expandedCategories.length]);

  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category_name || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});

  const filteredGroupedProducts = Object.keys(groupedProducts).reduce((acc, category) => {
    const categoryProducts = groupedProducts[category].filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (categoryProducts.length > 0) {
      acc[category] = categoryProducts;
    }
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Функция для показа выбора размера - с ленивой загрузкой размеров
  const showSizeSelection = (product, isEditing = false) => {
    // Показываем модалку выбора размера
    setSizeModal({ ...product, isEditing });
  };

  const selectSize = async (size) => {
    if (!sizeModal) return;

    console.log('[selectSize] Selected size:', size.name, 'for product:', sizeModal.name);

    // После выбора размера всегда проверяем допы товара
    console.log('[selectSize] Checking product addons for selected size');
    const isEditing = sizeModal.isEditing;
    setSizeModal(null);
    await checkAndShowProductAddons(sizeModal, size, isEditing);
  };

  const addItem = async (product) => {
    console.log('[addItem] Adding product:', product.id, product.name);

    // Всегда загружаем размеры для товара
    const sizes = await fetchProductSizes(product.id);
    console.log('[addItem] Loaded sizes:', sizes);

    if (sizes && sizes.length > 0) {
      console.log('[addItem] Showing size selection for product with sizes');
      // Обновляем продукт в кэше с размерами
      updateProductInCache(product.id, { sizes });
      // Показываем выбор размера
      showSizeSelection({ ...product, sizes });
    } else {
      console.log('[addItem] No sizes, checking product addons');
      // Нет размеров - проверяем допы товара
      await checkAndShowProductAddons(product);
    }
  };

  // Отдельная функция для проверки и показа допов товара и размера
  const checkAndShowProductAddons = async (product, selectedSize = null, isEditing = false) => {
    let allAddons = [];

    // Если выбран размер - сначала добавляем допы размера
    if (selectedSize) {
      const sizeAddons = await fetchSizeAddons(selectedSize.id);
      console.log('[checkAndShowProductAddons] Size addons:', sizeAddons);

      if (sizeAddons && sizeAddons.length > 0) {
        allAddons = allAddons.concat(sizeAddons.map(addon => ({
          ...addon,
          addon_name: addon.name,
          custom_price: addon.price,
          is_size_addon: true
        })));
      }
    }

    // Добавляем допы товара
    const productAddons = await fetchProductAddons(product.id);
    console.log('[checkAndShowProductAddons] Product addons:', productAddons);

    if (productAddons && productAddons.length > 0) {
      allAddons = allAddons.concat(productAddons.map(addon => ({
        ...addon,
        is_size_addon: false
      })));
    }

    console.log('[checkAndShowProductAddons] All addons:', allAddons);

    if (allAddons.length > 0) {
      console.log('[checkAndShowProductAddons] Showing combined addon selection');
      setAddonModal({ product, size: selectedSize, addons: allAddons, type: 'combined', isEditing });
    } else {
      console.log('[checkAndShowProductAddons] No addons, adding directly');
      // Нет допов - добавляем сразу
      addItemToOrder(product, [], selectedSize, isEditing);
    }
  };

  // Функция для непосредственного добавления товара в заказ
  const addItemToOrder = (product, selectedAddons = [], selectedSize = null, isEditing = false) => {
    const currentData = isEditing ? editOrder : formData;
    const setCurrentData = isEditing ? setEditOrder : setFormData;

    const existingItem = currentData.items.find(item =>
      item.product_id === product.id &&
      (!selectedSize || item.size_id === selectedSize.id) &&
      JSON.stringify(item.addons || []) === JSON.stringify(selectedAddons || [])
    );

    if (existingItem) {
      setCurrentData({
        ...currentData,
        items: currentData.items.map(item =>
          item.product_id === product.id &&
          (!selectedSize || item.size_id === selectedSize.id) &&
          JSON.stringify(item.addons || []) === JSON.stringify(selectedAddons || [])
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      const itemName = selectedSize ? `${product.name} (${selectedSize.name})` : product.name;
      const itemPrice = parseFloat(selectedSize ? selectedSize.price : product.price) || 0;

      setCurrentData({
        ...currentData,
        items: [...currentData.items, {
          product_id: product.id,
          product_name: product.name,
          name: itemName,
          price: itemPrice,
          quantity: 1,
          size_id: selectedSize ? selectedSize.id : null,
          size_name: selectedSize ? selectedSize.name : null,
          addons: selectedAddons || []
        }]
      });
    }
  };

  const removeItem = (productId, sizeId, addonIndex) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item, index) => {
        if (addonIndex !== undefined) {
          // Удаление по индексу в массиве (для товаров с допами)
          return index !== addonIndex;
        }
        // Удаление по product_id и size_id
        return sizeId ? (item.product_id !== productId || item.size_id !== sizeId) : (item.product_id !== productId);
      })
    });
  };

  const updateQuantity = (productId, quantity, sizeId, addonIndex) => {
    if (quantity <= 0) {
      removeItem(productId, sizeId, addonIndex);
      return;
    }

    setFormData({
      ...formData,
      items: formData.items.map((item, index) => {
        if (addonIndex !== undefined) {
          // Обновление по индексу в массиве (для товаров с допами)
          return index === addonIndex ? { ...item, quantity } : item;
        } else {
          // Обновление по product_id и size_id (для товаров без допов)
          const matchesProduct = item.product_id === productId;
          const matchesSize = sizeId ? item.size_id === sizeId : !item.size_id;
          if (matchesProduct && matchesSize) {
            return { ...item, quantity };
          }
          return item;
        }
      })
    });
  };

  // Применить выбранные допы и добавить товар в заказ
  const applyAddonsAndAddToOrder = (selectedAddons) => {
    console.log('[applyAddonsAndAddToOrder] Applying addons:', selectedAddons, 'modal:', addonModal);

    if (!addonModal) return;

    addItemToOrder(addonModal.product, selectedAddons, addonModal.size, addonModal.isEditing);
    setAddonModal(null);
  };

  const updateStatus = async (id, status) => {
    try {
      // Сначала обновляем локально - заказ не исчезает
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === id ? { ...order, status } : order
      ));
      
      // Потом отправляем запрос на сервер
      await axios.put(`${FRONTPAD_API}/api/orders/${id}/status`, { status });
      
      // Сбрасываем фильтр на "Все заказы" чтобы увидеть изменённый заказ
      setFilter('all');
      
      // Обновляем счётчик уведомлений без перезагрузки страницы
      window.dispatchEvent(new Event('orders-updated'));
      
      if (showDetails && showDetails.id === id) {
        const response = await axios.get(`${FRONTPAD_API}/api/orders/${id}`);
        setShowDetails(response.data);
      }
      if (editOrder && editOrder.id === id) {
        setEditOrder({ ...editOrder, status });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      // При ошибке - перезагружаем чтобы вернуть корректное состояние
      fetchOrders();
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Удалить заказ?')) return;
    try {
      await axios.delete(`${FRONTPAD_API}/api/orders/${id}`);
      fetchOrders();
      if (showDetails && showDetails.id === id) {
        setShowDetails(null);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  // Открыть модальное окно принятия заказа с выбором времени
  const openAcceptModal = (order) => {
    setAcceptModal(order);
    // По умолчанию устанавливаем текущее время + 30 минут
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setReadyTime(`${hours}:${minutes}`);
  };

  // Принять заказ с указанным временем готовности
  const handleAcceptOrder = async () => {
    if (!acceptModal) return;
    
    try {
      // Вызов API для принятия заказа с временем готовности
      const response = await axios.put(`${FRONTPAD_API}/api/orders/${acceptModal.id}/accept`, { ready_time: readyTime });
      
      console.log('[ACCEPT_ORDER] Заказ принят:', acceptModal.id, 'Время готовности:', readyTime, 'Ответ:', response.data);
      
      // Закрываем модальное окно
      setAcceptModal(null);
      setReadyTime('');
      
      // Сбрасываем фильтр на "Все заказы" чтобы увидеть изменённый заказ
      setFilter('all');
      
      // Дожидаемся завершения запроса - НЕ вызываем fetchOrders отдельно
      // Сервер уже отправил order_accepted broadcast, и WebSocket обновит список
      // Просто обновляем локально изменённый заказ
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order.id === acceptModal.id) {
            return { 
              ...order, 
              status: 'в производстве', 
              ready_time: readyTime 
            };
          }
          return order;
        });
      });
      
      console.log('[ACCEPT_ORDER] Заказ обновлён локально, ID:', acceptModal.id);
    } catch (error) {
      console.error('Error accepting order:', error);
      // Показываем ошибку если есть ответ от сервера
      if (error.response?.data?.error) {
        alert('Ошибка: ' + error.response.data.error);
      } else {
        alert('Ошибка при принятии заказа');
      }
    }
  };

  // Отказать в заказе
  const handleRejectOrder = async (orderId) => {
    // Запрашиваем причину отказа
    const reason = window.prompt('Укажите причину отказа (необязательно):');
    
    if (!window.confirm('Отказать в заказе?')) return;
    
    try {
      // Вызов API для отказа от заказа
      await axios.put(`${FRONTPAD_API}/api/orders/${orderId}/reject`, { reason: reason || null });
      
      console.log('[REJECT_ORDER] Заказ отклонён:', orderId, 'Причина:', reason);
      
      // Сбрасываем фильтр на "Все заказы" чтобы увидеть изменённый заказ
      setFilter('all');
      
      // Обновляем локально - НЕ вызываем fetchOrders отдельно
      // Сервер отправит broadcast, и WebSocket обновит список
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order.id === orderId) {
            return { 
              ...order, 
              status: 'отклонён',
              comment: reason ? `[ОТКЛОНЁН: ${reason}] ${order.comment || ''}` : order.comment
            };
          }
          return order;
        });
      });
    } catch (error) {
      console.error('Error rejecting order:', error);
      // Показываем ошибку если есть ответ от сервера
      if (error.response?.data?.error) {
        alert('Ошибка: ' + error.response.data.error);
      } else {
        alert('Ошибка при отказе от заказа');
      }
    }
  };

  // Обновление скидки заказа
  const updateDiscount = async (orderId, discountAmount, discountReason, discountType = 'rub') => {
    try {
      // Если скидка в процентах, вычисляем сумму
      let finalAmount = parseFloat(discountAmount) || 0;
      if (discountType === 'percent') {
        // Получаем текущую сумму заказа
        const orderResponse = await axios.get(`${FRONTPAD_API}/api/orders/${orderId}`);
        const orderTotal = parseFloat(orderResponse.data.total_amount) || 0;
        finalAmount = (orderTotal * parseFloat(discountAmount) / 100);
      }
      
      const response = await axios.put(`${FRONTPAD_API}/api/orders/${orderId}/discount`, {
        discount_amount: finalAmount,
        discount_reason: discountReason || ''
      });
      
      console.log('[DISCOUNT] Скидка обновлена:', response.data);
      
      // Обновляем заказ в списке
      fetchOrders();
      
      // Обновляем в деталях если открыто
      if (showDetails && showDetails.id === orderId) {
        setShowDetails(response.data);
      }
      
      // Обновляем в редактировании если открыто
      if (editOrder && editOrder.id === orderId) {
        setEditOrder(response.data);
      }
      
      setDiscountModal(null);
      alert('Скидка успешно применена');
    } catch (error) {
      console.error('Error updating discount:', error);
      alert('Ошибка при обновлении скидки');
    }
  };

  // Вычислить сумму скидки
  const calculateDiscountAmount = (totalAmount, amount, type) => {
    const value = parseFloat(amount) || 0;
    if (type === 'percent') {
      return totalAmount * value / 100;
    }
    return value;
  };

  // Открыть модальное окно скидки
  const openDiscountModal = (order) => {
    setDiscountModal(order);
    setDiscountForm({
      amount: order.discount_amount || 0,
      type: 'rub',
      reason: order.discount_reason || ''
    });
  };

  const printReceipt = async (order, source = 'unknown') => {
    console.log(`[CLIENT_PRINT] Запрос на печать чека для заказа #${order.id}, источник: ${source}`);
    try {
      console.log(`[CLIENT_PRINT] Отправка POST запроса к ${FRONTPAD_API}/api/orders/${order.id}/print`);
      const response = await axios.post(`${FRONTPAD_API}/api/orders/${order.id}/print`);
      console.log(`[CLIENT_PRINT] Ответ получен:`, response.status, response.data);
      
      if (!response.data || !response.data.html) {
        console.error(`[CLIENT_PRINT] ОШИБКА: Нет HTML в ответе!`, response.data);
        alert('Ошибка: не получен HTML чек');
        return;
      }
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        console.log(`[CLIENT_PRINT] Окно печати открыто, записываем HTML...`);
        printWindow.document.write(response.data.html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
          console.log(`[CLIENT_PRINT] Вызов print()`);
          printWindow.print();
          printWindow.close();
        };
      } else {
        console.error(`[CLIENT_PRINT] ОШИБКА: Не удалось открыть окно печати (заблокировано?)`);
        alert('Не удалось открыть окно печати. Возможно, браузер заблокировал всплывающее окно.');
      }
    } catch (error) {
      console.error('[CLIENT_PRINT] Ошибка при печати:', error);
      console.error('[CLIENT_PRINT] Детали ошибки:', error.response?.data || error.message);
      alert('Ошибка при печати: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'новый': <span className="badge badge-new">Новый</span>,
      'в производстве': <span className="badge badge-processing">В производстве</span>,
      'произведен': <span className="badge badge-ready">Произведен</span>,
      'в пути': <span className="badge badge-delivering">В пути</span>,
      'выполнен': <span className="badge badge-completed">Выполнен</span>,
      'отменён': <span className="badge badge-cancelled">Отменён</span>
    };
    return badges[status] || status;
  };

  const totalAmount = formData.items.reduce((sum, item) => {
    const addonsPrice = (item.addons || []).reduce((addonSum, addon) => addonSum + (parseFloat(addon.price || 0) * parseInt(addon.quantity || 1)), 0);
    return sum + ((parseFloat(item.price || 0) + addonsPrice) * parseInt(item.quantity || 1));
  }, 0);

  // Функция для получения времени готовности для отображения на карточке заказа
  // Показываем ready_time (время готовности) если есть, иначе ничего
  const getReadyTime = (order) => {
    // Если есть ready_time и статус не "новый" - показываем время готовности
    if (order.ready_time && order.status !== 'новый') {
      return order.ready_time;
    }
    return null;
  };

  // Статистика - не учитываем отклонённые заказы
  const todayOrders = orders.filter(o => o.status !== 'отменён' && o.status !== 'rejected');
  const totalRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const avgCheck = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  // Показываем ВСЕ заказы в одном списке (не разделяем на active/completed/rejected)
  // Это нужно чтобы заказ не исчезал при смене статуса
  const allOrdersForDisplay = orders;

  // Фильтруем заказы по статусу для отображения
  // Учитываем ВСЕ возможные варианты статусов из базы данных
  const activeOrders = orders.filter(o => 
    o.status !== 'выполнен' && 
    o.status !== 'completed' &&
    o.status !== 'delivered' &&
    o.status !== 'ready' &&
    o.status !== 'отклонён' &&
    o.status !== 'rejected' &&
    o.status !== 'cancelled'
  );
  
  const completedOrders = orders.filter(o => 
    o.status === 'выполнен' || 
    o.status === 'completed' ||
    o.status === 'delivered' ||
    o.status === 'ready'
  );

  // Открыть редактирование заказа
  const handleEditOrder = (order) => {
    setEditOrder({
      ...order,
      items: order.items || []
    });
    // Загружаем список курьеров для назначения
    fetchCouriers();
    setSelectedCourierId(order.courier_id || '');
  };

  // Добавить товар в редактируемый заказ
  const addItemToEdit = async (product) => {
    if (!editOrder) return;

    // Используем ту же логику, что и при создании заказа
    console.log('[addItemToEdit] Adding product to edit order:', product.id, product.name);

    // Всегда загружаем размеры для товара
    const sizes = await fetchProductSizes(product.id);
    console.log('[addItemToEdit] Loaded sizes:', sizes);

    if (sizes && sizes.length > 0) {
      console.log('[addItemToEdit] Showing size selection for product with sizes');
      // Обновляем продукт в кэше с размерами
      updateProductInCache(product.id, { sizes });
      // Показываем выбор размера
      showSizeSelection({ ...product, sizes }, true); // true = редактирование
    } else {
      console.log('[addItemToEdit] No sizes, checking product addons');
      // Нет размеров - проверяем допы товара
      await checkAndShowProductAddons(product, null, true); // true = редактирование
    }
  };

  const removeItemFromEdit = (productId) => {
    if (!editOrder) return;
    setEditOrder({
      ...editOrder,
      items: editOrder.items.filter(item => item.product_id !== productId)
    });
  };

  const updateEditQuantity = (productId, quantity) => {
    if (!editOrder) return;
    if (quantity <= 0) {
      removeItemFromEdit(productId);
      return;
    }
    setEditOrder({
      ...editOrder,
      items: editOrder.items.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    });
  };

  // Добавить рекомендуемый товар в заказ
  const addRecommendationToOrder = async (recommendation) => {
    if (!showDetails && !editOrder) return;
    
    const product = products.find(p => p.id === recommendation.product_id);
    if (!product) {
      alert('Товар не найден');
      return;
    }
    
    if (editOrder) {
      // Добавляем в редактируемый заказ
      addItemToEdit(product);
    } else if (showDetails) {
      // Если заказ открыт в режиме просмотра, открываем редактирование
      handleEditOrder(showDetails);
    }
  };

  if (dataLoading || ordersLoading) return <div className="card">Загрузка...</div>;

  return (
    <div>
      {/* Уведомление о новом заказе */}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '28px' }}>Заказы</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Точка:</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
              {pickupLocations.find(p => p.id === currentPointId.toString())?.name || `Точка ${currentPointId}`}
            </span>
          </div>
          
          {console.log('[RENDER] preorderDates.length:', preorderDates.length, 'orders with is_asap=0:', orders.filter(o => o.is_asap === 0).length)}
          {(preorderDates.length > 0 || orders.some(order => order.is_asap === 0)) && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: '#fee2e2', 
                color: '#dc2626', 
                padding: '8px 16px', 
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => {
                const today = getMoscowDate();
                const todayPreorder = orders.find(o => o.is_asap === 0 && o.delivery_date === today);
                const preorderDatesList = orders.filter(o => o.is_asap === 0).map(o => o.delivery_date);
                const uniqueDates = [...new Set(preorderDatesList)].filter(Boolean);
                const targetDate = todayPreorder ? today : (uniqueDates.length > 0 ? uniqueDates[0] : today);
                fetchPreordersForDate(targetDate);
                setCurrentPreorderDate(targetDate);
                setDateFilter(targetDate);
              }}
            >
              <Bell size={16} />
              Предзаказы
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchOrders}>
            <RotateCcw size={18} />
            Обновить
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Новый заказ
          </button>
        </div>
      </div>

      <div className="filters">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setDateFilter(getMoscowDate());
              setShowPreorders(false);
            }}
          >
            Сегодня
          </button>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setShowPreorders(false);
            }}
          />
          {(preorderDates.length > 0 || orders.some(order => order.is_asap === 0)) && (
            <button 
              className="btn btn-danger"
              onClick={() => {
                const today = getMoscowDate();
                const todayPreorder = preorderDates.find(d => d.delivery_date === today) || orders.find(o => o.is_asap === 0 && o.delivery_date === today);
                const targetDate = todayPreorder ? today : (preorderDates.length > 0 ? preorderDates[0].delivery_date : orders.filter(o => o.is_asap === 0)[0]?.delivery_date);
                if (targetDate) {
                  fetchPreordersForDate(targetDate);
                  setDateFilter(targetDate);
                }
              }}
              style={{ background: '#dc2626', color: 'white' }}
            >
              <Calendar size={16} />
              Предзаказы {preorderDates.length > 0 ? `(${preorderDates.reduce((sum, d) => sum + d.order_count, 0)})` : ''}
            </button>
          )}
          <select className="form-select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все заказы</option>
            <option value="новый">Новые</option>
            <option value="в производстве">В производстве</option>
            <option value="произведен">Произведены</option>
            <option value="в пути">В пути</option>
            <option value="выполнен">Выполнены</option>
            <option value="отменён">Отменены</option>
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px', 
        marginBottom: '20px',
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e' }}>
            {todayOrders.length}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Заказов</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
            {avgCheck.toFixed(0)} ₽
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Средний чек</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#4361ee' }}>
            {totalRevenue.toLocaleString()} ₽
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Выручка</div>
        </div>
      </div>

      {/* Список предзаказов */}
      {showPreorders && preorders.length > 0 && (
        <div style={{ 
          background: '#fef3c7', 
          border: '2px solid #f59e0b', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e' }}>
              <Calendar size={18} style={{ marginRight: '8px', display: 'inline' }} />
              Предзаказы на {new Date(currentPreorderDate || dateFilter).toLocaleDateString('ru-RU')}
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {preorderDates.length > 1 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className="btn btn-sm btn-secondary"
                    disabled={preorderDates.findIndex(d => d.delivery_date === currentPreorderDate) <= 0}
                    onClick={() => {
                      const currentIndex = preorderDates.findIndex(d => d.delivery_date === currentPreorderDate);
                      if (currentIndex > 0) {
                        const prevDate = preorderDates[currentIndex - 1].delivery_date;
                        fetchPreordersForDate(prevDate);
                        setCurrentPreorderDate(prevDate);
                        setDateFilter(prevDate);
                      }
                    }}
                  >
                    ←
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                    disabled={preorderDates.findIndex(d => d.delivery_date === currentPreorderDate) >= preorderDates.length - 1}
                    onClick={() => {
                      const currentIndex = preorderDates.findIndex(d => d.delivery_date === currentPreorderDate);
                      if (currentIndex < preorderDates.length - 1) {
                        const nextDate = preorderDates[currentIndex + 1].delivery_date;
                        fetchPreordersForDate(nextDate);
                        setCurrentPreorderDate(nextDate);
                        setDateFilter(nextDate);
                      }
                    }}
                  >
                    →
                  </button>
                </div>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => setShowPreorders(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {preorders.map(order => (
              <div 
                key={order.id} 
                style={{ 
                  background: 'white', 
                  padding: '12px', 
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>#{order.id}</strong> - {order.guest_name || 'Гость'} ({order.guest_phone})
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {order.delivery_time && `Доставка: ${order.delivery_time}`}
                    {(order.address || order.street || order.building) && ` - ${order.address || [order.street, order.building ? 'д.' + order.building : null, order.apartment ? 'кв.' + order.apartment : null].filter(Boolean).join(', ')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>{order.total_amount} ₽</span>
                  <span className={`badge badge-${order.status === 'новый' || order.status === 'new' ? 'new' : order.status === 'в производстве' || order.status === 'processing' ? 'processing' : order.status === 'произведен' || order.status === 'ready' ? 'ready' : order.status === 'в пути' || order.status === 'delivering' ? 'delivering' : order.status === 'выполнен' || order.status === 'completed' ? 'completed' : 'cancelled'}`}>
                    {order.status === 'новый' || order.status === 'new' ? 'Новый' : order.status === 'в производстве' || order.status === 'processing' ? 'В производстве' : order.status === 'произведен' || order.status === 'ready' ? 'Произведен' : order.status === 'в пути' || order.status === 'delivering' ? 'В пути' : order.status === 'выполнен' || order.status === 'completed' ? 'Выполнен' : order.status === 'отменён' || order.status === 'rejected' || order.status === 'cancelled' ? 'Отменён' : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '12px' }}>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '100%' }}>
          {/* Активные заказы (не выполненные и не отменённые) */}
          {activeOrders.map(order => (
            <div 
              key={order.id} 
              style={{ 
                background: order.status === 'новый' ? '#fee2e2' : order.status === 'в производстве' ? '#dbeafe' : order.status === 'произведен' ? '#dcfce7' : order.status === 'в пути' ? '#fef9c3' : order.status === 'выполнен' ? '#ffffff' : '#f3f4f6',
                border: `2px solid ${order.status === 'новый' ? '#ef4444' : order.status === 'в производстве' ? '#3b82f6' : order.status === 'произведен' ? '#22c55e' : order.status === 'в пути' ? '#eab308' : order.status === 'выполнен' ? '#9ca3af' : '#d1d5db'}`, 
                borderRadius: '10px', 
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '12px',
                alignItems: 'start'
              }}
            >
              <div style={{ textAlign: 'center', minWidth: '50px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#374151' }}>#{order.id}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {getReadyTime(order)}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                  {order.guest_name || 'Гость'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                  {order.guest_phone}
                </div>
                {/* Адрес в списке заказов */}
                {(order.address || order.street || order.building) && (
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {order.address || [order.street, order.building ? 'д.' + order.building : null, order.apartment ? 'кв.' + order.apartment : null, order.entrance ? 'под.' + order.entrance : null, order.floor ? 'эт.' + order.floor : null].filter(Boolean).join(', ')}
                  </div>
                )}
                <div style={{ marginTop: '6px', padding: '6px', background: 'white', borderRadius: '4px', fontSize: '11px' }}>
                  {/* Индикатор предзаказа */}
                  {order.is_asap === 0 && (
                    <div style={{ background: '#fef3c7', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', fontSize: '11px', color: '#92400e', fontWeight: '500' }}>
                      📅 Предзаказ {order.delivery_date && `на ${new Date(order.delivery_date).toLocaleDateString('ru-RU')}`} {order.delivery_time && `к ${order.delivery_time}`}
                    </div>
                  )}
                  {(order.items || []).map((item, idx) => (
                    <div key={`${order.id}-${item.product_id}-${item.size_id || 'nosize'}-${idx}`} style={{ display: 'flex', flexDirection: 'column', padding: '2px 0', borderBottom: idx < (order.items || []).length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.name || item.product_name} ×{item.quantity}</span>
                        <span style={{ marginLeft: '6px' }}>{item.price * item.quantity} ₽</span>
                      </div>
                      {/* Размер */}
                      {(item.size_name || item.size?.name) && (
                        <span style={{ fontSize: '10px', color: '#0ea5e9', marginLeft: '8px' }}>Размер: {item.size_name || item.size?.name}</span>
                      )}
                      {/* Обычные допы */}
                      {item.addons && item.addons.length > 0 && (
                        <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '8px' }}>Допы: {item.addons.map(a => a.name).join(', ')}</span>
                      )}
                      {/* Допы к размеру */}
                      {item.sizeAddons && item.sizeAddons.length > 0 && (
                        <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '8px' }}>Допы к размеру: {item.sizeAddons.map(a => a.name).join(', ')}</span>
                      )}
                    </div>
                  ))}
                  {(order.items.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      Всего товаров: {order.items.length}
                    </div>
                  ))}
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '12px' }}>
                    <span>Итого:</span>
                    <span>{order.total_amount} ₽</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#10b981' }}>
                      <span>Скидка:</span>
                      <span>-{order.discount_amount} ₽</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', color: '#10b981' }}>
                      <span>К оплате:</span>
                      <span>{(order.total_amount - order.discount_amount).toFixed(2)} ₽</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                <select 
                  className="form-select form-select-sm" 
                  style={{ minWidth: '110px', padding: '4px 8px', fontSize: '11px' }}
                  value={order.status} 
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                >
                  <option value="новый">Новый</option>
                  <option value="в производстве">В производстве</option>
                  <option value="произведен">Произведен</option>
                  <option value="в пути">В пути</option>
                  <option value="выполнен">Выполнен</option>
                  <option value="отменён">Отменён</option>
                </select>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(order.status === 'новый' || order.status === 'new' || order.status === 'pending') && (
                    <>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => openAcceptModal(order)} 
                        title="Принять заказ"
                        style={{ padding: '4px 8px', background: '#10b981', color: 'white' }}
                      >
                        <Check size={14} /> Принять
                      </button>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleRejectOrder(order.id)} 
                        title="Отказать в заказе"
                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white' }}
                      >
                        <X size={14} /> Отказать
                      </button>
                    </>
                  )}
                  <button className="btn btn-sm btn-secondary" onClick={() => handleShowDetails(order)} title="Детали" style={{ padding: '4px 8px' }}>
                    <Eye size={14} />
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { handleEditOrder(order); setShowDetails(null); }} title="Редактировать" style={{ padding: '4px 8px' }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => printReceipt(order)} title="Печать" style={{ padding: '4px 8px' }}>
                    <Printer size={14} />
                  </button>
                  <button className="btn btn-sm" onClick={() => openDiscountModal(order)} title="Скидка" style={{ padding: '4px 8px', background: (order.discount_amount > 0 ? '#10b981' : '#f59e0b'), color: 'white' }}>
                    <Percent size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteOrder(order.id)} title="Удалить" style={{ padding: '4px 8px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  background: order.order_type === 'delivery' ? '#dbeafe' : '#fef3c7',
                  color: order.order_type === 'delivery' ? '#1d4ed8' : '#92400e',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <span>{order.order_type === 'delivery' ? '🚚 Доставка' : '🏃 Самовывоз'}</span>
                  <span>{order.payment === 'cash' ? '💵 Наличными при получении' : order.payment === 'card' ? '💳 Картой при получении' : order.payment === 'transfer' ? '📱 Переводом при получении' : '?'}</span>
                </div>
                {/* Отображение курьера */}
                {(order.courier_name || order.courier_id) && (
                  <div style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    background: '#dcfce7',
                    color: '#059669',
                    marginTop: '4px',
                    fontWeight: '500'
                  }}>
                    👤 {order.courier_name || (order.courier_id ? 'Курьер #' + order.courier_id : 'Не назначен')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Выполненные заказы - показываем секцию даже если нет заказов (пользователь может изменить статус) */}
        {true && (
          <div style={{ marginTop: '16px', borderTop: '2px dashed #e5e7eb', paddingTop: '16px' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '12px',
                background: '#f3f4f6',
                borderRadius: '8px',
                marginBottom: showCompletedOrders ? '12px' : '0'
              }}
              onClick={() => setShowCompletedOrders(!showCompletedOrders)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#4b5563' }}>
                <span>{showCompletedOrders ? '▼' : '▶'}</span>
                <History size={18} />
                Выполненные заказы ({completedOrders.length})
              </div>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCompletedOrders(!showCompletedOrders);
                }}
              >
                {showCompletedOrders ? 'Свернуть' : 'Развернуть'}
              </button>
            </div>
            
            {showCompletedOrders && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {completedOrders.map(order => (
                  <div 
                    key={order.id} 
                    style={{ 
                      background: order.status === 'выполнен' ? '#ffffff' : '#f3f4f6',
                      border: `2px solid ${order.status === 'выполнен' ? '#9ca3af' : '#d1d5db'}`, 
                      borderRadius: '10px', 
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '12px',
                      alignItems: 'start',
                      opacity: 0.8
                    }}
                  >
                    <div style={{ textAlign: 'center', minWidth: '50px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#374151' }}>#{order.id}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {getReadyTime(order)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px', color: '#6b7280' }}>
                        {order.guest_name || 'Гость'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>
                        {order.guest_phone}
                      </div>
                      {(order.address || order.street || order.building) && (
                        <div style={{ fontSize: '11px', color: '#d1d5db' }}>
                          {order.address || [order.street, order.building ? 'д.' + order.building : null, order.apartment ? 'кв.' + order.apartment : null].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div style={{ marginTop: '6px', padding: '6px', background: 'white', borderRadius: '4px', fontSize: '11px' }}>
                        {(order.items || []).map((item, idx) => (
                          <div key={`${order.id}-${item.product_id}-${item.size_id || 'nosize'}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span style={{ color: '#6b7280' }}>{item.name || item.product_name} ×{item.quantity}</span>
                            <span style={{ marginLeft: '6px', color: '#6b7280' }}>{item.price * item.quantity} ₽</span>
                          </div>
                        ))}
                        {(order.items.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                            Всего товаров: {order.items.length}
                          </div>
                        ))}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '12px' }}>
                          <span style={{ color: '#6b7280' }}>Итого:</span>
                          <span>{order.total_amount} ₽</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <select 
                        className="form-select form-select-sm" 
                        style={{ minWidth: '110px', padding: '4px 8px', fontSize: '11px' }}
                        value={order.status} 
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                      >
                        <option value="новый">Новый</option>
                        <option value="в производстве">В производстве</option>
                        <option value="произведен">Произведен</option>
                        <option value="в пути">В пути</option>
                        <option value="выполнен">Выполнен</option>
                        <option value="отменён">Отменён</option>
                      </select>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleShowDetails(order)} title="Детали" style={{ padding: '4px 8px' }}>
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { handleEditOrder(order); setShowDetails(null); }} title="Редактировать" style={{ padding: '4px 8px' }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => printReceipt(order)} title="Печать" style={{ padding: '4px 8px' }}>
                          <Printer size={14} />
                        </button>
                        <button className="btn btn-sm" onClick={() => openDiscountModal(order)} title="Скидка" style={{ padding: '4px 8px', background: (order.discount_amount > 0 ? '#10b981' : '#f59e0b'), color: 'white' }}>
                          <Percent size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteOrder(order.id)} title="Удалить" style={{ padding: '4px 8px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: order.order_type === 'delivery' ? '#dbeafe' : '#fef3c7',
                        color: order.order_type === 'delivery' ? '#1d4ed8' : '#92400e',
                        display: 'flex',
                        gap: '4px'
                      }}>
                        <span>{order.order_type === 'delivery' ? '🚚 Доставка' : '🏃 Самовывоз'}</span>
                        <span>{order.payment === 'cash' ? '💵 Наличными при получении' : order.payment === 'card' ? '💳 Картой при получении' : order.payment === 'transfer' ? '📱 Переводом при получении' : '?'}</span>
                      </div>
                      {/* Отображение курьера */}
                      {(order.courier_name || order.courier_id) && (
                        <div style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: '#dcfce7',
                          color: '#059669',
                          marginTop: '4px',
                          fontWeight: '500'
                        }}>
                          👤 {order.courier_name || (order.courier_id ? 'Курьер #' + order.courier_id : 'Не назначен')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
            Заказов пока нет
          </div>
        )}
      </div>

      {/* Модальное окно выбора размера */}
      {sizeModal && (
        <div className="modal-overlay" onClick={() => setSizeModal(null)} style={{ zIndex: 10000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', zIndex: 10001 }}>
            <div className="modal-header">
              <h3 className="modal-title">Выберите размер</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setSizeModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>{sizeModal.name}</h4>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Выберите нужный размер для добавления в заказ</p>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {console.log('[SizeModal] Rendering sizes:', sizeModal.sizes)}
                {sizeModal.sizes.map(size => (
                  <div
                    key={size.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => selectSize(size)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div>
                      <div style={{ fontWeight: '600' }}>{size.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {size.size_value || size.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                      {size.price || sizeModal.price} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора допов */}
      {addonModal && (
        <div className="modal-overlay" onClick={() => setAddonModal(null)} style={{ zIndex: 10000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', zIndex: 10001 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Выберите допы {addonModal.size ? `для ${addonModal.product.name} (${addonModal.size.name})` : `для ${addonModal.product.name}`}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setAddonModal(null)}>
                <X size={18} />
              </button>
            </div>
            {console.log('[AddonModal] Rendering modal:', addonModal)}
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>
                  {addonModal.type === 'size' ? `${addonModal.product.name} (${addonModal.size.name})` : addonModal.product.name}
                </h4>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Выберите дополнительные ингредиенты</p>
              </div>

              <AddonSelector
                addons={addonModal.addons}
                onApply={applyAddonsAndAddToOrder}
                onCancel={() => setAddonModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания заказа */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">Новый заказ</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Имя клиента</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Телефон</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Адрес доставки</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Тип заказа</label>
                    <select
                      className="form-select"
                      value={formData.order_type}
                      onChange={(e) => setFormData({...formData, order_type: e.target.value})}
                    >
                      <option value="delivery">Доставка</option>
                      <option value="pickup">Самовывоз</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Способ оплаты</label>
                    <select
                      className="form-select"
                      value={formData.payment}
                      onChange={(e) => setFormData({...formData, payment: e.target.value})}
                    >
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="online">Онлайн</option>
                    </select>
                  </div>
                </div>

                {/* Выбор пункта самовывоза */}
                {formData.order_type === 'pickup' && (
                  <div className="form-group">
                    <label className="form-label">Пункт самовывоза</label>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {pickupLocations.map(location => (
                        <div
                          key={location.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '16px',
                            border: `2px solid ${formData.pickup_location === location.id ? '#10b981' : '#e5e7eb'}`,
                            borderRadius: '12px',
                            background: formData.pickup_location === location.id ? '#f0fdf4' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setFormData({...formData, pickup_location: location.id})}
                        >
                          <div style={{ marginRight: '12px', marginTop: '2px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${formData.pickup_location === location.id ? '#10b981' : '#d1d5db'}`,
                              background: formData.pickup_location === location.id ? '#10b981' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {formData.pickup_location === location.id && (
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
                              )}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{location.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px' }}>{location.address}</div>
                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>{location.schedule}</div>
                          </div>
                          <div style={{ marginLeft: '12px' }}>
                            <i className="fas fa-store text-xl text-green-600"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Товары</label>
                  
                  {/* Поиск товаров */}
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Поиск товаров..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ padding: '10px 16px', fontSize: '14px' }}
                    />
                  </div>

                  {/* Список категорий и товаров */}
                  <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                    {Object.keys(filteredGroupedProducts).map(category => (
                      <div key={category} style={{ marginBottom: '8px' }}>
                        {/* Заголовок категории с кнопкой разворачивания */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginBottom: '4px'
                          }}
                          onClick={() => toggleCategory(category)}
                        >
                          <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {expandedCategories.includes(category) ? '▼' : '▶'} {category}
                          </div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{filteredGroupedProducts[category].length} шт.</span>
                        </div>

                        {/* Товары категории */}
                        {expandedCategories.includes(category) && (
                          <div style={{ paddingLeft: '16px' }}>
                            {filteredGroupedProducts[category].map(product => (
                              <div
                                key={product.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 12px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  marginBottom: '4px',
                                  background: 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                onClick={() => addItem(product)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f9fafb';
                                  e.currentTarget.style.borderColor = '#4361ee';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{product.name}</span>
                                  {product.description && (
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{product.description.substring(0, 40)}...</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#10b981' }}>{product.price} ₽</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addItem(product);
                                    }}
                                    style={{ padding: '4px 10px' }}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {Object.keys(filteredGroupedProducts).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                        Товары не найдены
                      </div>
                    )}
                  </div>

                  {/* Выбранные товары */}
                  {formData.items.length > 0 && (
                    <div style={{ 
                      background: '#f0fdf4', 
                      border: '1px solid #86efac', 
                      borderRadius: '8px', 
                      padding: '12px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '8px', color: '#166534' }}>
                        Выбрано товаров: {formData.items.length} на сумму {totalAmount} ₽
                      </div>
                      {formData.items.map((item, idx) => {
                        const addonsPrice = (item.addons || []).reduce((sum, addon) => sum + (parseFloat(addon.price || 0) * parseInt(addon.quantity || 1)), 0);
                        const totalItemPrice = (parseFloat(item.price || 0) + addonsPrice) * parseInt(item.quantity || 1);

                        return (
                          <div
                            key={`${item.product_id}-${item.size_id || 'nosize'}-${JSON.stringify(item.addons || [])}-${idx}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              background: 'white',
                              borderRadius: '4px',
                              marginBottom: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
                              <span style={{ fontSize: '13px' }}>{item.name}</span>
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                {item.price} ₽ × {item.quantity} шт.
                                {addonsPrice > 0 && ` + допы ${addonsPrice} ₽`}
                              </span>
                              {/* Отображение допов */}
                              {item.addons && item.addons.length > 0 && (
                                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                  Допы: {item.addons.map(addon => `${addon.name} (${addon.price} ₽)`).join(', ')}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '600', fontSize: '13px', minWidth: '50px', textAlign: 'right' }}>
                                {totalItemPrice} ₽
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size_id, idx)}
                                  style={{ padding: '2px 6px', minWidth: '24px' }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '13px', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size_id, idx)}
                                  style={{ padding: '2px 8px', minWidth: '24px' }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => removeItem(item.product_id, item.size_id, idx)}
                                style={{ padding: '2px 6px' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Комментарий</label>
                  <textarea
                    className="form-input"
                    value={formData.comment}
                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                    rows={2}
                    placeholder="Дополнительные пожелания к заказу..."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={formData.items.length === 0}
                  style={{ opacity: formData.items.length === 0 ? 0.5 : 1 }}
                >
                  Создать заказ ({totalAmount} ₽)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования заказа */}
      {editOrder && (
        <div className="modal-overlay" onClick={() => setEditOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">Редактирование заказа #{editOrder.id}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateOrder}>
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Имя клиента</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOrder.guest_name || ''}
                      onChange={(e) => setEditOrder({...editOrder, guest_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Телефон</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editOrder.guest_phone || ''}
                      onChange={(e) => setEditOrder({...editOrder, guest_phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Адрес</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editOrder.address || editOrder.street || ''}
                    onChange={(e) => setEditOrder({...editOrder, address: e.target.value})}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Улица</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOrder.street || ''}
                      onChange={(e) => setEditOrder({...editOrder, street: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Дом</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOrder.building || ''}
                      onChange={(e) => setEditOrder({...editOrder, building: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Квартира</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOrder.apartment || ''}
                      onChange={(e) => setEditOrder({...editOrder, apartment: e.target.value})}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Тип заказа</label>
                    <select
                      className="form-select"
                      value={editOrder.order_type || 'delivery'}
                      onChange={(e) => setEditOrder({...editOrder, order_type: e.target.value})}
                    >
                      <option value="delivery">Доставка</option>
                      <option value="pickup">Самовывоз</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Способ оплаты</label>
                    <select
                      className="form-select"
                      value={editOrder.payment || 'cash'}
                      onChange={(e) => setEditOrder({...editOrder, payment: e.target.value})}
                    >
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="online">Онлайн</option>
                    </select>
                  </div>
                </div>

                {/* Выбор пункта самовывоза в редактировании */}
                {editOrder.order_type === 'pickup' && (
                  <div className="form-group">
                    <label className="form-label">Пункт самовывоза</label>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {pickupLocations.map(location => (
                        <div
                          key={location.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            padding: '16px',
                            border: `2px solid ${editOrder.location_id == location.id ? '#10b981' : '#e5e7eb'}`,
                            borderRadius: '12px',
                            background: editOrder.location_id == location.id ? '#f0fdf4' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setEditOrder({...editOrder, location_id: location.id})}
                        >
                          <div style={{ marginRight: '12px', marginTop: '2px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${editOrder.location_id == location.id ? '#10b981' : '#d1d5db'}`,
                              background: editOrder.location_id == location.id ? '#10b981' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {editOrder.location_id == location.id && (
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
                              )}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{location.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px' }}>{location.address}</div>
                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>{location.schedule}</div>
                          </div>
                          <div style={{ marginLeft: '12px' }}>
                            <i className="fas fa-store text-xl text-green-600"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Статус заказа</label>
                  <select
                    className="form-select"
                    value={editOrder.status || 'новый'}
                    onChange={(e) => setEditOrder({...editOrder, status: e.target.value})}
                  >
                    <option value="новый">Новый</option>
                    <option value="в производстве">В производстве</option>
                    <option value="произведен">Произведен</option>
                    <option value="в пути">В пути</option>
                    <option value="выполнен">Выполнен</option>
                    <option value="отменён">Отменён</option>
                  </select>
                </div>
                
                {/* Секция выбора курьера */}
                <div style={{ 
                  background: editOrder.order_type === 'delivery' ? '#fef3c7' : '#f3f4f6', 
                  padding: '16px', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                    🚚 Назначение курьера
                  </div>
                  
                  {editOrder.order_type === 'delivery' ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="form-label">Выберите курьера</label>
                        <select
                          className="form-select"
                          value={selectedCourierId}
                          onChange={(e) => setSelectedCourierId(e.target.value)}
                        >
                          <option value="">-- Выберите курьера --</option>
                          {couriers.map(courier => (
                            <option key={courier.id} value={courier.id}>
                              {courier.name} ({courier.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={() => assignCourier(editOrder.id, selectedCourierId)}
                        disabled={!selectedCourierId}
                        style={{ opacity: !selectedCourierId ? 0.5 : 1 }}
                      >
                        Назначить
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Курьер назначается только для заказов с доставкой
                    </div>
                  )}
                  
                  {/* Информация о текущем курьере */}
                  {(editOrder.courier_id || editOrder.courier_name) && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px 12px', 
                      background: '#dcfce7', 
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <strong>Текущий курьер:</strong> {editOrder.courier_name || (editOrder.courier_id ? 'Курьер #' + editOrder.courier_id : 'Не назначен')}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Комментарий</label>
                  <textarea
                    className="form-input"
                    value={editOrder.comment || ''}
                    onChange={(e) => setEditOrder({...editOrder, comment: e.target.value})}
                    rows={2}
                  />
                </div>
                
                {/* Список товаров в заказе */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600' }}>Товары в заказе:</div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowProductModal(true)}
                    >
                      <Plus size={14} />
                      Добавить товар
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {editOrder.items && editOrder.items.map((item, idx) => (
                      <div
                        key={`${item.product_id}-${item.size_id || 'nosize'}-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '500' }}>{item.name || item.product_name}</span>
                          {/* Размер */}
                          {item.size && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Размер: {item.size.name}</span>
                          )}
                          {/* Обычные допы */}
                          {item.addons && item.addons.length > 0 && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Допы: {item.addons.map(a => a.name).join(', ')}</span>
                          )}
                          {/* Допы к размеру */}
                          {item.sizeAddons && item.sizeAddons.length > 0 && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Допы к размеру: {item.sizeAddons.map(a => a.name).join(', ')}</span>
                          )}
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.price} ₽ × {item.quantity} шт.
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600', minWidth: '60px', textAlign: 'right' }}>
                            {item.price * item.quantity} ₽
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => updateEditQuantity(item.product_id, item.quantity - 1)}
                            style={{ padding: '2px 8px' }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => updateEditQuantity(item.product_id, item.quantity + 1)}
                            style={{ padding: '2px 8px' }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              const newItems = editOrder.items.filter((_, i) => i !== idx);
                              setEditOrder({ ...editOrder, items: newItems });
                            }}
                            style={{ padding: '2px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!editOrder.items || editOrder.items.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                        Нет товаров в заказе
                      </div>
                    )}
                  </div>
                  
                  {/* Итого */}
                  {editOrder.items && editOrder.items.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginTop: '16px',
                      padding: '12px',
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      border: '1px solid #86efac'
                    }}>
                      <span style={{ fontWeight: '600' }}>Итого:</span>
                      <span style={{ fontWeight: '700', fontSize: '18px', color: '#10b981' }}>
                        {editOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} ₽
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditOrder(null)}>
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!editOrder.items || editOrder.items.length === 0}
                  style={{ opacity: !editOrder.items || editOrder.items.length === 0 ? 0.5 : 1 }}
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра деталей заказа */}
      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">Заказ #{showDetails.id}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowDetails(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
              {/* Вкладки */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                <button
                  className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('details')}
                >
                  Детали
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('history')}
                >
                  История ({loadingHistory ? '...' : customerOrders.length})
                </button>
                <button
                  className={`btn btn-sm ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('recommendations')}
                >
                  Рекомендации
                </button>
              </div>

              {/* Вкладка деталей */}
              {activeTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Информация о клиенте</div>
                      <div style={{ fontSize: '13px', display: 'grid', gap: '4px' }}>
                        <div><strong>Имя:</strong> {showDetails.guest_name || 'Гость'}</div>
                        <div><strong>Телефон:</strong> {showDetails.guest_phone}</div>
                        <div><strong>Тип:</strong> {showDetails.order_type === 'delivery' ? '🚚 Доставка' : '🏃 Самовывоз'}</div>
                        <div><strong>Оплата:</strong> {
                          showDetails.payment === 'cash' ? '💵 Наличными при получении' :
                          showDetails.payment === 'card' ? '💳 Картой при получении' :
                          showDetails.payment === 'transfer' ? '📱 Переводом при получении' : '?'
                        }</div>
                        <div><strong>Статус:</strong> {getStatusBadge(showDetails.status)}</div>
                        <div><strong>Дата:</strong> {new Date(showDetails.created_at).toLocaleString('ru-RU')}</div>
                      </div>
                    </div>
                    
                    {/* Адрес в деталях заказа */}
                    {(showDetails.address || showDetails.street || showDetails.building) && (
                      <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Адрес доставки</div>
                        <div style={{ fontSize: '13px' }}>
                          {showDetails.address || [showDetails.street, showDetails.building ? 'д.' + showDetails.building : null, showDetails.apartment ? 'кв.' + showDetails.apartment : null, showDetails.entrance ? 'под.' + showDetails.entrance : null, showDetails.floor ? 'эт.' + showDetails.floor : null, showDetails.intercom ? 'домофон: ' + showDetails.intercom : null].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    )}
                    
                    {showDetails.comment && (
                      <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>📝 Комментарий</div>
                        <div style={{ fontSize: '13px' }}>{showDetails.comment}</div>
                      </div>
                    )}

                    <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Состав заказа</div>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {showDetails.items && showDetails.items.map((item, idx) => (
                          <div key={`${item.product_id}-${item.size_id || 'nosize'}-${idx}`} style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.name || item.product_name} ×{item.quantity}</span>
                              <span style={{ fontWeight: '500' }}>{item.price * item.quantity} ₽</span>
                            </div>
                            {/* Размер */}
                            {item.size && (
                              <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>Размер: {item.size.name}</span>
                            )}
                            {/* Обычные допы */}
                            {item.addons && item.addons.length > 0 && (
                              <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>Допы: {item.addons.map(a => a.name).join(', ')}</span>
                            )}
                            {/* Допы к размеру */}
                            {item.sizeAddons && item.sizeAddons.length > 0 && (
                              <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>Допы к размеру: {item.sizeAddons.map(a => a.name).join(', ')}</span>
                            )}
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid #10b981' }}>
                          <span>Итого:</span>
                          <span style={{ color: '#10b981' }}>{showDetails.total_amount} ₽</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Вкладка истории */}
              {activeTab === 'history' && (
                <div>
                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>
                  ) : customerOrders.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {customerOrders.map(order => (
                        <div
                          key={order.id}
                          style={{
                            padding: '10px 12px',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid #e5e7eb'
                          }}
                          onClick={() => {
                            const orderWithItems = typeof order.items === 'string' ? { ...order, items: JSON.parse(order.items) } : order;
                            setShowDetails(orderWithItems);
                            setActiveTab('details');
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600' }}>Заказ #{order.id}</span>
                            <span style={{ fontWeight: '500', color: '#10b981' }}>{order.total_amount} ₽</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(order.created_at).toLocaleString('ru-RU')} • {getStatusBadge(order.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                      История заказов пуста
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка рекомендаций */}
              {activeTab === 'recommendations' && (
                <div>
                  {loadingRecommendations ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>
                  ) : customerRecommendations.recommendations && customerRecommendations.recommendations.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {customerRecommendations.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 12px',
                            background: '#eff6ff',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer'
                          }}
                          onClick={() => addRecommendationToOrder(rec)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                                {products.find(p => p.id === rec.product_id)?.name || 'Товар #' + rec.product_id}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Рекомендовано: заказывали {rec.order_count} раз
                              </div>
                            </div>
                            <button className="btn btn-sm btn-primary" onClick={(e) => {
                              e.stopPropagation();
                              addRecommendationToOrder(rec);
                            }}>
                              <Plus size={14} /> Добавить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                      Нет рекомендаций
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetails(null)}>
                Закрыть
              </button>
              <button className="btn btn-primary" onClick={() => {
                const orderWithItems = typeof showDetails.items === 'string' ? { ...showDetails, items: JSON.parse(showDetails.items) } : showDetails;
                setEditOrder(orderWithItems);
                setShowDetails(null);
              }}>
                <Edit2 size={16} /> Редактировать
              </button>
              <button className="btn btn-secondary" onClick={() => printReceipt(showDetails)}>
                <Printer size={16} /> Печать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно скидки */}
      {discountModal && (
        <div className="modal-overlay" onClick={() => setDiscountModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Скидка на заказ #{discountModal.id}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setDiscountModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {/* Информация о заказе */}
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Текущая сумма заказа:</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{discountModal.total_amount} ₽</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  <span style={{ background: discountModal.payment === 'cash' ? '#dbeafe' : '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                    {discountModal.payment === 'cash' ? '💵 Наличными при получении' : discountModal.payment === 'card' ? '💳 Картой при получении' : discountModal.payment === 'transfer' ? '📱 Переводом при получении' : '?'}
                  </span>
                  <span style={{ background: discountModal.order_type === 'pickup' ? '#fef3c7' : '#dbeafe', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }}>
                    {discountModal.order_type === 'pickup' ? '🏃 Самовывоз' : '🚚 Доставка'}
                  </span>
                </div>
              </div>
              
              {/* Быстрые скидки */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Быстрые скидки:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const percent = 3;
                      const amount = (discountModal.total_amount * percent / 100).toFixed(2);
                      setDiscountForm({ ...discountForm, amount: amount, reason: 'Оплата наличными 3%' });
                    }}
                  >
                    💵 Наличные (-3%)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#4361ee', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const percent = 10;
                      const amount = (discountModal.total_amount * percent / 100).toFixed(2);
                      setDiscountForm({ ...discountForm, amount: amount, reason: 'Самовывоз 10%' });
                    }}
                  >
                    🏃 Самовывоз (-10%)
                  </button>
                </div>
              </div>

              {/* Тип скидки */}
              <div className="form-group">
                <label className="form-label">Тип скидки</label>
                <select 
                  className="form-select" 
                  value={discountForm.type}
                  onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                >
                  <option value="rub">Рубли (руб.)</option>
                  <option value="percent">Проценты (%)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  {discountForm.type === 'percent' ? `Скидка (${discountForm.amount || 0}%)` : 'Сумма скидки (руб.)'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={discountForm.amount}
                  min="0"
                  max={discountForm.type === 'percent' ? 100 : discountModal.total_amount}
                  step="1"
                  onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Причина скидки</label>
                <select 
                  className="form-select" 
                  value={discountForm.reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                >
                  <option value="">- Выберите причину -</option>
                  <option value="Оплата наличными 3%">Оплата наличными 3%</option>
                  <option value="Самовывоз 10%">Самовывоз 10%</option>
                  <option value="Подарок от заведения">Подарок от заведения</option>
                  <option value="Постоянный клиент">Постоянный клиент</option>
                  <option value="Праздничная скидка">Праздничная скидка</option>
                  <option value="Некачественное блюдо">Некачественное блюдо</option>
                  <option value="Долгая доставка">Долгая доставка</option>
                  <option value="Бонус">Бонус</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>
              
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: '#f0fdf4', 
                borderRadius: '8px',
                border: '1px solid #86efac'
              }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Итого к оплате:</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {(discountModal.total_amount - calculateDiscountAmount(discountModal.total_amount, discountForm.amount, discountForm.type)).toFixed(2)} ₽
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDiscountModal(null)}>
                Отмена
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  updateDiscount(discountModal.id, discountForm.amount, discountForm.reason, discountForm.type);
                }}
              >
                Применить скидку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно принятия заказа с выбором времени готовности */}
      {acceptModal && (
        <div className="modal-overlay" onClick={() => setAcceptModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Принять заказ #{acceptModal.id}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setAcceptModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {/* Информация о заказе */}
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Клиент:</div>
                <div style={{ fontWeight: '600' }}>{acceptModal.guest_name || 'Гость'}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{acceptModal.guest_phone}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px' }}>Сумма: {acceptModal.total_amount} ₽</div>
              </div>

              {/* Выбор времени готовности */}
              <div className="form-group">
                <label className="form-label">Время готовности заказа</label>
                <input
                  type="time"
                  className="form-input"
                  value={readyTime}
                  onChange={(e) => setReadyTime(e.target.value)}
                  style={{ fontSize: '18px', padding: '12px', textAlign: 'center' }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                  Укажите, через сколько заказ будет готов
                </div>
              </div>

              {/* Быстрые варианты времени */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Быстрый выбор:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 15);
                      setReadyTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                    }}
                  >
                    15 мин
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 30);
                      setReadyTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                    }}
                  >
                    30 мин
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 45);
                      setReadyTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                    }}
                  >
                    45 мин
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: 'white', padding: '8px 12px' }}
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 60);
                      setReadyTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                    }}
                  >
                    1 час
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAcceptModal(null)}>
                Отмена
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAcceptOrder}
                disabled={!readyTime}
                style={{ opacity: !readyTime ? 0.5 : 1 }}
              >
                <Check size={16} /> Принять заказ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора товаров для редактирования */}
      {showProductModal && editOrder && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить товар в заказ</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowProductModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {/* Поиск товаров */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Поиск товаров..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '10px 16px', fontSize: '14px' }}
                />
              </div>

              {/* Список категорий и товаров */}
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
                {Object.keys(filteredGroupedProducts).map(category => (
                  <div key={category} style={{ marginBottom: '8px' }}>
                    {/* Заголовок категории с кнопкой разворачивания */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '4px'
                      }}
                      onClick={() => toggleCategory(category)}
                    >
                      <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {expandedCategories.includes(category) ? '▼' : '▶'} {category}
                      </div>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{filteredGroupedProducts[category].length} шт.</span>
                    </div>

                    {/* Товары категории */}
                    {expandedCategories.includes(category) && (
                      <div style={{ paddingLeft: '16px' }}>
                        {filteredGroupedProducts[category].map(product => (
                          <div
                            key={product.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              marginBottom: '4px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onClick={() => {
                              addItemToEdit(product);
                              setShowProductModal(false);
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <div>
                              <div style={{ fontWeight: '500', marginBottom: '2px' }}>{product.name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{product.price} ₽</div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItemToEdit(product);
                                setShowProductModal(false);
                              }}
                            >
                              <Plus size={14} />
                              Добавить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(filteredGroupedProducts).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Товары не найдены
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
