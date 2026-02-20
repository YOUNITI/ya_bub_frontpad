import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Eye, Trash2, X, Printer, RotateCcw, Bell, Calendar, Edit2, History, Star, Percent } from 'lucide-react';
import moment from 'moment-timezone';
import { useData } from '../context/DataContext';
import { playNotificationSound } from './SoundNotification';

// API и WebSocket URL - относительные пути для работы через nginx
const FRONTPAD_API = '';
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';

// Получение текущей даты по московскому времени
const getMoscowDate = () => {
  return moment().tz('Europe/Moscow').format('YYYY-MM-DD');
};

const Orders = () => {
  // Используем DataContext для товаров и категорий (централизованное кэширование)
  const { products, loading: dataLoading, updateProductInCache } = useData();
  
  const [orders, setOrders] = useState([]);
  const [preorders, setPreorders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
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
    items: []
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
  const [discountModal, setDiscountModal] = useState(null);
  const [discountForm, setDiscountForm] = useState({ amount: 0, type: 'rub', reason: '' });

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
    
    // Загружаем preorderDates и потом заказы
    fetchPreorderDates().then((dates) => {
      fetchOrdersWithDate(today, dates);
    });
    
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
        case 'order_status_changed':
        case 'order_updated':
          // Просто обновляем список заказов на текущей дате
          fetchOrdersWithDate(dateFilterRef.current);
          fetchPreorderDates();
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
    
    // Polling fallback каждые 30 секунд
    const pollingInterval = setInterval(() => {
      fetchOrdersWithDate(dateFilterRef.current);
      fetchPreorderDates();
    }, 30000);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(pollingInterval);
    };
  }, []);

  // При изменении фильтра даты загружаем заказы
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[useEffect dateFilter] Fetching orders for date:', dateFilter);
      fetchOrdersWithDate(dateFilter);
    }, 100);
    return () => clearTimeout(timer);
  }, [dateFilter, filter]);

  // Функция fetchOrders с возможностью передать конкретную дату
  const fetchOrdersWithDate = async (dateParamOverride, preorderDatesParam = null) => {
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
        // Для всех остальных дат - обычные заказы
        const params = { date: dateParam, _t: cacheBuster };
        console.log('[fetchOrders] Отправка запроса с params:', params);
        if (filter !== 'all') {
          params.status = filter;
        }
        const response = await axios.get(`${FRONTPAD_API}/api/orders`, { params });
        console.log('[fetchOrders] Ответ получен, количество заказов:', response.data?.length || 0);
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Обёртка для fetchOrders которая использует текущий dateFilter
  const fetchOrders = () => {
    fetchOrdersWithDate(dateFilterRef.current);
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

  const fetchPreorderDates = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/preorder-dates`);
      const dates = response.data || [];
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
        total_amount
      });
      setShowModal(false);
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        order_type: 'delivery',
        payment: 'cash',
        comment: '',
        items: []
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
        status: editOrder.status
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
  const showSizeSelection = async (product) => {
    // Если размеры уже загружены в продукте, показываем сразу
    if (product.sizes && product.sizes.length > 0) {
      setSizeModal(product);
      return;
    }
    
    // Иначе загружаем размеры лениво
    const sizes = await fetchProductSizes(product.id);
    
    // Обновляем продукт в кэше через DataContext
    const updatedProduct = { ...product, sizes };
    updateProductInCache(updatedProduct);
    
    // Показываем модалку
    setSizeModal(updatedProduct);
  };

  const selectSize = (size) => {
    if (!sizeModal) return;

    const existingItem = formData.items.find(item =>
      item.product_id === sizeModal.id && item.size_id === size.id
    );

    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map(item =>
          item.product_id === sizeModal.id && item.size_id === size.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          product_id: sizeModal.id,
          product_name: sizeModal.name,
          name: `${sizeModal.name} (${size.name})`,
          price: size.price || sizeModal.price,
          quantity: 1,
          size_id: size.id,
          size_name: size.name
        }]
      });
    }

    setSizeModal(null);
  };

  const addItem = (product) => {
    // Проверяем, есть ли у товара размеры
    if (product.sizes && product.sizes.length > 0) {
      showSizeSelection(product);
    } else {
      const existingItem = formData.items.find(item => item.product_id === product.id && !item.size_id);
      if (existingItem) {
        setFormData({
          ...formData,
          items: formData.items.map(item =>
            item.product_id === product.id && !item.size_id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        });
      } else {
        setFormData({
          ...formData,
          items: [...formData.items, {
            product_id: product.id,
            product_name: product.name,
            name: product.name,
            price: product.price,
            quantity: 1
          }]
        });
      }
    }
  };

  const removeItem = (productId, sizeId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item =>
        sizeId ? (item.product_id !== productId || item.size_id !== sizeId) : (item.product_id !== productId)
      )
    });
  };

  const updateQuantity = (productId, quantity, sizeId) => {
    if (quantity <= 0) {
      removeItem(productId, sizeId);
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.map(item => {
        const matchesProduct = item.product_id === productId;
        const matchesSize = sizeId ? item.size_id === sizeId : !item.size_id;
        if (matchesProduct && matchesSize) {
          return { ...item, quantity };
        }
        return item;
      })
    });
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${FRONTPAD_API}/api/orders/${id}/status`, { status });
      fetchOrders();
      fetchPreorderDates();
      if (showDetails && showDetails.id === id) {
        const response = await axios.get(`${FRONTPAD_API}/api/orders/${id}`);
        setShowDetails(response.data);
      }
      if (editOrder && editOrder.id === id) {
        setEditOrder({ ...editOrder, status });
      }
    } catch (error) {
      console.error('Error updating order:', error);
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
      pending: <span className="badge badge-new">Новый</span>,
      processing: <span className="badge badge-processing">В обработке</span>,
      ready: <span className="badge badge-ready">Готов</span>,
      delivered: <span className="badge badge-delivered">Доставлен</span>,
      cancelled: <span className="badge badge-cancelled">Отменён</span>
    };
    return badges[status] || status;
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Статистика
  const todayOrders = orders.filter(o => o.status !== 'cancelled');
  const totalRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const avgCheck = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

  // Открыть редактирование заказа
  const handleEditOrder = (order) => {
    setEditOrder({
      ...order,
      items: order.items || []
    });
  };

  // Добавить товар в редактируемый заказ
  const addItemToEdit = (product) => {
    if (!editOrder) return;
    const existingItem = editOrder.items.find(item => item.product_id === product.id);
    let newItems;
    if (existingItem) {
      newItems = editOrder.items.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newItems = [...editOrder.items, {
        product_id: product.id,
        product_name: product.name,
        name: product.name,
        price: product.price,
        quantity: 1
      }];
    }
    setEditOrder({ ...editOrder, items: newItems });
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
          {preorderDates.length > 0 && (
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
                const todayPreorder = preorderDates.find(d => d.delivery_date === today);
                const targetDate = todayPreorder ? today : preorderDates[0].delivery_date;
                fetchPreordersForDate(targetDate);
                setCurrentPreorderDate(targetDate);
                setDateFilter(targetDate);
              }}
            >
              <Bell size={16} />
              {preorderDates.length} дат с предзаказами
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
          {preorderDates.length > 0 && (
            <button 
              className="btn btn-danger"
              onClick={() => {
                const today = getMoscowDate();
                const todayPreorder = preorderDates.find(d => d.delivery_date === today);
                const targetDate = todayPreorder ? today : preorderDates[0].delivery_date;
                fetchPreordersForDate(targetDate);
                setDateFilter(targetDate);
              }}
              style={{ background: '#dc2626', color: 'white' }}
            >
              <Calendar size={16} />
              Предзаказы ({preorderDates.reduce((sum, d) => sum + d.order_count, 0)})
            </button>
          )}
          <select className="form-select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все заказы</option>
            <option value="pending">Новые</option>
            <option value="processing">В обработке</option>
            <option value="ready">Готовы</option>
            <option value="delivered">Доставлены</option>
            <option value="cancelled">Отменены</option>
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
                    {order.address && ` - ${order.address}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>{order.total_amount} ₽</span>
                  <span className={`badge badge-${order.status === 'pending' ? 'new' : order.status === 'processing' ? 'processing' : order.status === 'ready' ? 'ready' : 'delivered'}`}>
                    {order.status === 'pending' ? 'Новый' : order.status === 'processing' ? 'В обработке' : order.status === 'ready' ? 'Готов' : order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '12px' }}>
        <div style={{ display: 'grid', gap: '10px', maxWidth: '100%' }}>
          {orders.map(order => (
            <div 
              key={order.id} 
              style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb', 
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
                  {new Date(order.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                  {order.guest_name || 'Гость'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                  {order.guest_phone}
                </div>
                {(order.address || order.street) && (
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {order.address || `${order.street}${order.building ? ', д.' + order.building : ''}${order.apartment ? ', кв.' + order.apartment : ''}`}
                  </div>
                )}
                <div style={{ marginTop: '6px', padding: '6px', background: 'white', borderRadius: '4px', fontSize: '11px' }}>
                  {(order.items || []).slice(0, 2).map((item, idx) => (
                    <div key={`${order.id}-${item.product_id}-${item.size_id || 'nosize'}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>{item.name || item.product_name} ×{item.quantity}</span>
                      <span style={{ marginLeft: '6px' }}>{item.price * item.quantity} ₽</span>
                    </div>
                  ))}
                  {(order.items || []).length > 2 && (
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      +{(order.items.length - 2)}
                    </div>
                  )}
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
                  <option value="pending">Новый</option>
                  <option value="processing">В обработке</option>
                  <option value="ready">Готов</option>
                  <option value="delivered">Доставлен</option>
                  <option value="cancelled">Отменён</option>
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
                  color: order.order_type === 'delivery' ? '#1d4ed8' : '#92400e'
                }}>
                  {order.order_type === 'delivery' ? '🚚' : '🏃'}
                </div>
              </div>
            </div>
          ))}
        </div>
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
                      {formData.items.map((item, idx) => (
                        <div
                          key={`${item.product_id}-${item.size_id || 'nosize'}-${idx}`}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            <span style={{ fontSize: '13px' }}>{item.name}</span>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              {item.price} ₽ × {item.quantity} шт.
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.size_id)}
                                style={{ padding: '2px 6px', minWidth: '24px' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '13px', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.size_id)}
                                style={{ padding: '2px 6px', minWidth: '24px' }}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeItem(item.product_id, item.size_id)}
                              style={{ padding: '2px 6px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
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
                <div className="form-group">
                  <label className="form-label">Статус заказа</label>
                  <select
                    className="form-select"
                    value={editOrder.status || 'pending'}
                    onChange={(e) => setEditOrder({...editOrder, status: e.target.value})}
                  >
                    <option value="pending">Новый</option>
                    <option value="processing">В обработке</option>
                    <option value="ready">Готов</option>
                    <option value="delivered">Доставлен</option>
                    <option value="cancelled">Отменён</option>
                  </select>
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
                  <div style={{ fontWeight: '600', marginBottom: '12px' }}>Товары в заказе:</div>
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
                          showDetails.payment === 'cash' ? '💵 Наличные' : 
                          showDetails.payment === 'card' ? '💳 Карта' : '💻 Онлайн'
                        }</div>
                        <div><strong>Статус:</strong> {getStatusBadge(showDetails.status)}</div>
                        <div><strong>Дата:</strong> {new Date(showDetails.created_at).toLocaleString('ru-RU')}</div>
                      </div>
                    </div>
                    
                    {(showDetails.address || showDetails.street) && (
                      <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>Адрес доставки</div>
                        <div style={{ fontSize: '13px' }}>
                          {showDetails.address || `${showDetails.street}${showDetails.building ? ', д.' + showDetails.building : ''}${showDetails.apartment ? ', кв.' + showDetails.apartment : ''}`}
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
                          <div key={`${item.product_id}-${item.size_id || 'nosize'}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                            <span>{item.name || item.product_name} ×{item.quantity}</span>
                            <span style={{ fontWeight: '500' }}>{item.price * item.quantity} ₽</span>
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
                    {discountModal.payment === 'cash' ? '💵 Наличные' : discountModal.payment === 'card' ? '💳 Карта' : '💻 Онлайн'}
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
    </div>
  );
};

export default Orders;
