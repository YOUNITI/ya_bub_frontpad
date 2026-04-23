import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Order = () => {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    building: '',
    apartment: '',
    entrance: '',
    floor: '',
    intercom: '',
    deliveryTime: 'asap',
    deliveryDate: 'today',
    customDate: '',
    customTime: '',
    payment: 'cash',
    comment: '',
    agreement: false,
    orderType: 'delivery',
    pickupLocation: '1'
  });
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [deliveryPrice, setDeliveryPrice] = useState(0);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'deliveryDate') {
      if (value === 'later') {
        setShowCustomTime(true);
      } else {
        setShowCustomTime(false);
      }
    }
    if (name === 'deliveryTime') {
      setShowCustomTime(value === 'later');
    }
    if (name === 'zone') {
      const zone = deliveryZones.find(z => z.id === parseInt(value));
      setSelectedZone(zone);
      const cartTotal = getTotal();
      if (zone) {
        if (zone.min_order_amount && cartTotal >= zone.min_order_amount) {
          setDeliveryPrice(0);
        } else {
          setDeliveryPrice(zone.delivery_price || zone.price || 0);
        }
      } else {
        setDeliveryPrice(0);
      }
    }
  };

  useEffect(() => {
    const fetchDeliveryZones = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/delivery-zones`);
        if (response.ok) {
          const zones = await response.json();
          setDeliveryZones(zones);
          console.log('Районы доставки загружены:', zones.length);
        } else {
          console.error('Ошибка загрузки районов доставки:', response.status);
        }
      } catch (err) {
        console.error('Ошибка загрузки районов доставки:', err.message);
        setError('Не удалось загрузить районы доставки. Пожалуйста, обновите страницу.');
      }
    };
    fetchDeliveryZones();
  }, []);

  useEffect(() => {
    if (selectedZone) {
      const cartTotal = getTotal();
      if (selectedZone.min_order_amount && cartTotal >= selectedZone.min_order_amount) {
        setDeliveryPrice(0);
      } else {
        setDeliveryPrice(selectedZone.delivery_price || selectedZone.price || 0);
      }
    }
  }, [getTotal(), selectedZone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone) {
      setError('Пожалуйста, заполните имя и телефон');
      return;
    }

    if (formData.orderType === 'delivery') {
      if (!selectedZone) {
        setError('Пожалуйста, выберите район доставки');
        return;
      }
      if (!formData.street || !formData.building) {
        setError('Пожалуйста, укажите улицу и номер дома');
        return;
      }
    }

    const phoneRegex = /^(\d{10,15})$/;
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      setError('Пожалуйста, введите корректный номер телефона');
      return;
    }

    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }

    setLoading(true);

    try {
      const fullAddress = formData.street || formData.building 
        ? `${formData.street || ''} ${formData.building || ''} ${formData.apartment ? 'кв.' + formData.apartment : ''}`.trim()
        : '';
      
      let deliveryDateValue = null;
      let deliveryTimeValue = 'Как можно скорее';
      let isAsapValue = 1;
      
      if (formData.deliveryDate === 'today') {
        deliveryDateValue = new Date().toISOString().split('T')[0];
        if (formData.deliveryTime === 'later' && formData.customTime) {
          deliveryTimeValue = formData.customTime;
          isAsapValue = 0;
        }
      } else if (formData.deliveryDate === 'later' && formData.customDate) {
        deliveryDateValue = formData.customDate;
        if (formData.customTime) {
          deliveryTimeValue = formData.customTime;
          isAsapValue = 0;
        }
      }

      const cartTotal = getTotal();
      const finalTotal = cartTotal + deliveryPrice;

      const orderData = {
        customer_id: user?.customer_id || null,
        guest_name: formData.name,
        guest_phone: formData.phone,
        guest_email: null,
        order_type: formData.orderType,
        street: formData.street,
        building: formData.building,
        apartment: formData.apartment,
        entrance: formData.entrance,
        floor: formData.floor,
        intercom: formData.intercom,
        is_asap: isAsapValue,
        delivery_date: deliveryDateValue,
        delivery_time: deliveryTimeValue,
        payment: formData.payment,
        comment: formData.comment,
        items: items,
        total_amount: finalTotal,
        zone_id: selectedZone ? selectedZone.id : null,
        delivery_price: deliveryPrice,
        location_id: formData.orderType === 'pickup' ? parseInt(formData.pickupLocation) : null,
        zone_name: selectedZone ? selectedZone.name : null
      };

      console.log('[Order] Создание заказа, user:', user);
      console.log('[Order] customer_id:', user?.customer_id);

      const orderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!orderResponse.ok) {
        throw new Error('Ошибка создания заказа');
      }

      const order = await orderResponse.json();
      
      localStorage.setItem('guestOrder', JSON.stringify(order));
      
      setShowSuccess(true);
      clearCart();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-4 text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check-circle text-green-500 text-4xl"></i>
          </div>
          <h3 className="text-2xl font-bold mb-4 font-heading">Спасибо за заказ, {formData.name}!</h3>
          <p className="text-gray-600 mb-6">Ваш заказ успешно оформлен. Мы свяжемся с вами в ближайшее время для подтверждения.</p>
          <Link to="/" className="bg-brand-yellow text-brand-black py-3 px-8 rounded-full font-bold hover:bg-yellow-500 transition-colors">
            Продолжить покупки
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-brand-black text-white py-3 sm:py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Link to="/" className="bg-brand-yellow text-brand-black px-4 sm:px-6 py-2 rounded-full font-bold hover:bg-yellow-500 transition-colors text-sm sm:text-base">
              <i className="fas fa-arrow-left mr-2"></i> Назад
            </Link>
          </div>
        </div>
      </header>

      <section className="py-8 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-bold text-center mb-4 font-heading">
              <span className="text-brand-yellow">Оформление</span> заказа
            </h1>
            <p className="text-base sm:text-xl text-center text-gray-600 mb-8 sm:mb-12">
              Заполните форму ниже, и мы свяжемся с вами для подтверждения
            </p>

            <div className="bg-gray-50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-custom">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Личные данные</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Ваше имя *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                        placeholder="Иван Иванов"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Телефон *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                        placeholder="+7 (XXX) XXX-XX-XX"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Тип заказа</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <label className={`flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all ${formData.orderType === 'delivery' ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="orderType"
                        value="delivery"
                        checked={formData.orderType === 'delivery'}
                        onChange={handleInputChange}
                        className="mr-3 sm:mr-4 w-5 h-5"
                      />
                      <div>
                        <i className="fas fa-shipping-fast text-xl sm:text-2xl text-brand-yellow mr-2"></i>
                        <span className="font-bold text-base sm:text-lg">Доставка</span>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Курьер привезёт заказ по адресу</p>
                      </div>
                    </label>
                    <label className={`flex items-center p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all ${formData.orderType === 'pickup' ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="orderType"
                        value="pickup"
                        checked={formData.orderType === 'pickup'}
                        onChange={handleInputChange}
                        className="mr-3 sm:mr-4 w-5 h-5"
                      />
                      <div>
                        <i className="fas fa-store text-xl sm:text-2xl text-brand-yellow mr-2"></i>
                        <span className="font-bold text-base sm:text-lg">Самовывоз</span>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">Заберёте заказ из ресторана</p>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.orderType === 'delivery' ? (
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 font-heading">Район доставки</h3>
                    {deliveryZones.length > 0 && (
                      <p className="text-sm text-gray-600 mb-4">
                        <i className="fas fa-map-marker-alt text-brand-yellow mr-2"></i>
                        Доступно районов: <strong>{deliveryZones.length}</strong>
                      </p>
                    )}
                    {deliveryZones.length > 0 ? (
                      <div className="mb-6">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
                          <p className="text-blue-800 text-sm">
                            <i className="fas fa-info-circle mr-2"></i>
                            Выберите район доставки. Стоимость зависит от суммы заказа и выбранного района.
                          </p>
                        </div>
                        <select
                          name="zone"
                          value={selectedZone?.id || ''}
                          onChange={handleInputChange}
                          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                        >
                          <option value="">Выберите район доставки</option>
                          {deliveryZones.map(zone => {
                            const minOrder = zone.min_order_amount || 0;
                            const deliveryCost = zone.delivery_price || zone.price || 0;
                            let displayText = zone.name;
                            if (minOrder > 0) {
                              displayText += ` — при заказе от ${minOrder}₽ доставка бесплатно`;
                            } else if (deliveryCost > 0) {
                              displayText += ` — доставка ${deliveryCost}₽`;
                            } else {
                              displayText += ' — бесплатная доставка';
                            }
                            return (
                              <option key={zone.id} value={zone.id}>
                                {displayText}
                              </option>
                            );
                          })}
                        </select>
                        {selectedZone && (
                          <div className="mt-4 space-y-3">
                            <div className={`p-4 rounded-xl border-2 ${deliveryPrice > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
                              <div className="flex items-start">
                                <i className={`fas ${deliveryPrice > 0 ? 'fa-truck text-yellow-600' : 'fa-check-circle text-green-600'} text-xl mr-3 mt-1`}></i>
                                <div>
                                  <p className="font-bold text-base sm:text-lg">
                                    {deliveryPrice > 0 ? `Стоимость доставки: ${deliveryPrice}₽` : 'Бесплатная доставка'}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Район: <strong>{selectedZone.name}</strong>
                                  </p>
                                  {selectedZone.min_order_amount > 0 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      {deliveryPrice > 0 
                                        ? `Закажите еще на ${selectedZone.min_order_amount - getTotal()}₽ для бесплатной доставки`
                                        : `При заказе от ${selectedZone.min_order_amount}₽ доставка бесплатная`
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="flex items-center justify-center p-6 bg-gray-100 rounded-xl">
                          <i className="fas fa-spinner fa-spin text-gray-500 text-2xl mr-3"></i>
                          <p className="text-gray-500">Загрузка районов доставки...</p>
                        </div>
                      </div>
                    )}

                    <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Адрес доставки</h3>
                    <div className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Улица *</label>
                          <input
                            type="text"
                            name="street"
                            value={formData.street}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="Профессора Малигонова"
                            required={formData.orderType === 'delivery'}
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Дом *</label>
                          <input
                            type="text"
                            name="building"
                            value={formData.building}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="35"
                            required={formData.orderType === 'delivery'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Квартира</label>
                          <input
                            type="text"
                            name="apartment"
                            value={formData.apartment}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="123"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Подъезд</label>
                          <input
                            type="text"
                            name="entrance"
                            value={formData.entrance}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Этаж</label>
                          <input
                            type="text"
                            name="floor"
                            value={formData.floor}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="5"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Домофон</label>
                          <input
                            type="text"
                            name="intercom"
                            value={formData.intercom}
                            onChange={handleInputChange}
                            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                            placeholder="1234"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Пункт самовывоза</h3>
                    <p className="text-gray-600 mb-6">Выберите удобный для вас пункт самовывоза:</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                      <p className="text-yellow-800 text-sm"><strong>💡 Подсказка:</strong> Вы можете выбрать один из двух пунктов самовывоза. Заказ будет готов к выдаче в выбранном месте.</p>
                    </div>
                    <div className="space-y-4">
                      <label className={`flex items-start cursor-pointer p-4 sm:p-6 rounded-xl border-2 transition-all ${formData.pickupLocation === '1' ? 'border-green-400 bg-green-50 shadow-md' : 'border-green-200 bg-green-50 hover:border-green-300'}`}>
                        <input
                          type="radio"
                          name="pickupLocation"
                          value="1"
                          checked={formData.pickupLocation === '1'}
                          onChange={handleInputChange}
                          className="mt-1 mr-4 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <i className="fas fa-store text-xl text-green-600 mr-3"></i>
                            <h4 className="font-bold text-lg text-green-800">Ресторан "ЯБУДУ"</h4>
                          </div>
                          <p className="text-gray-700 mb-2">Профессора Малигонова 35</p>
                          <p className="text-gray-500 text-sm">Пн-Чт 11:00-22:00, Пт-Сб 11:00-23:00, Вс 11:00-22:00</p>
                        </div>
                      </label>

                      <label className={`flex items-start cursor-pointer p-4 sm:p-6 rounded-xl border-2 transition-all ${formData.pickupLocation === '2' ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-blue-200 bg-blue-50 hover:border-blue-300'}`}>
                        <input
                          type="radio"
                          name="pickupLocation"
                          value="2"
                          checked={formData.pickupLocation === '2'}
                          onChange={handleInputChange}
                          className="mt-1 mr-4 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                        />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <i className="fas fa-store text-xl text-blue-600 mr-3"></i>
                            <h4 className="font-bold text-lg text-blue-800">Мурата Ахеджака 26</h4>
                          </div>
                          <p className="text-gray-700 mb-2">Мурата Ахеджака 26</p>
                          <p className="text-gray-500 text-sm">Пн-Вс 10:00-22:00</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">
                    {formData.orderType === 'delivery' ? 'Время доставки' : 'Когда заберёте заказ'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Дата</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          type="button"
                          className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                            formData.deliveryDate === 'today' 
                              ? 'border-brand-yellow bg-yellow-50 text-brand-black' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, deliveryDate: 'today', deliveryTime: 'asap', customDate: '', customTime: '' }));
                            setShowCustomTime(false);
                          }}
                        >
                          Сегодня
                        </button>
                        <button
                          type="button"
                          className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                            formData.deliveryDate === 'later' 
                              ? 'border-brand-yellow bg-yellow-50 text-brand-black' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, deliveryDate: 'later', deliveryTime: 'later' }));
                            setShowCustomTime(true);
                          }}
                        >
                          Другая дата
                        </button>
                      </div>
                    </div>

                    {formData.deliveryDate === 'today' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <button
                          type="button"
                          className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                            formData.deliveryTime === 'asap' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, deliveryTime: 'asap', customTime: '' }));
                            setShowCustomTime(false);
                          }}
                        >
                          Как можно скорее
                        </button>
                        <button
                          type="button"
                          className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                            formData.deliveryTime === 'later' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, deliveryTime: 'later' }));
                            setShowCustomTime(true);
                          }}
                        >
                          К определённому времени
                        </button>
                      </div>
                    )}

                    {((formData.deliveryDate === 'today' && formData.deliveryTime === 'later') || formData.deliveryDate === 'later') && (
                      <div>
                        <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                          {formData.orderType === 'delivery' ? 'Время доставки' : 'Время получения'}
                        </label>
                        <input
                          type="time"
                          name="customTime"
                          value={formData.customTime}
                          onChange={handleInputChange}
                          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                          required
                        />
                      </div>
                    )}

                    {formData.deliveryDate === 'later' && (
                      <div>
                        <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Дата доставки</label>
                        <input
                          type="date"
                          name="customDate"
                          value={formData.customDate}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Способ оплаты</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="cash"
                        checked={formData.payment === 'cash'}
                        onChange={handleInputChange}
                        className="mr-3 w-5 h-5"
                      />
                      <span className="text-gray-700 font-medium text-sm sm:text-base">Наличными при получении</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={formData.payment === 'card'}
                        onChange={handleInputChange}
                        className="mr-3 w-5 h-5"
                      />
                      <span className="text-gray-700 font-medium text-sm sm:text-base">Картой при получении(только самовывоз)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="transfer"
                        checked={formData.payment === 'transfer'}
                        onChange={handleInputChange}
                        className="mr-3 w-5 h-5"
                      />
                      <span className="text-gray-700 font-medium text-sm sm:text-base">Переводом при получении</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Комментарий к заказу</label>
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base"
                    rows="3"
                    placeholder="Особые пожелания, аллергии и т.д."
                  ></textarea>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreement"
                    checked={formData.agreement}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 w-5 h-5"
                    required
                  />
                  <label className="text-gray-700 text-xs sm:text-sm">
                    Я согласен с условиями обработки персональных данных
                  </label>
                </div>

                <div className="mt-6 sm:mt-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Ваш заказ</h3>
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
                    <h4 className="font-bold text-base sm:text-lg mb-4">Товары в корзине</h4>
                    {items.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Ваша корзина пуста</p>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl mb-3 sm:mb-4">
                          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                            <img src={item.imageUrl} alt={item.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm sm:text-base truncate">{item.name}</h4>
                              {item.size && (
                                <p className="text-xs sm:text-sm text-gray-600">Размер: {item.size.name}</p>
                              )}
                              {item.addons && item.addons.length > 0 && (
                                <p className="text-xs sm:text-sm text-gray-600 truncate">
                                  Допы: {item.addons.map(a => a.name).join(', ')}
                                </p>
                              )}
                              <p className="text-xs sm:text-sm text-gray-600">{Number(item.price || 0).toFixed(2)} ₽ x {item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-bold text-sm sm:text-base">{(Number(item.price || 0) * item.quantity).toFixed(2)} ₽</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Сумма заказа:</span>
                        <span className="font-bold text-base sm:text-lg">{getTotal().toFixed(2)} ₽</span>
                      </div>
                      {formData.orderType === 'delivery' && selectedZone && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Доставка ({selectedZone.name}):</span>
                          <span className={`font-bold text-base sm:text-lg ${deliveryPrice === 0 ? 'text-green-600' : ''}`}>
                            {deliveryPrice === 0 ? 'Бесплатно' : `${deliveryPrice} ₽`}
                          </span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base sm:text-lg font-bold">Итого к оплате:</span>
                          <span className="text-2xl sm:text-3xl font-bold text-brand-yellow">{(getTotal() + deliveryPrice).toFixed(2)} ₽</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4 sm:pt-6">
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm sm:text-base animate-pulse">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-brand-yellow text-brand-black py-4 px-8 sm:px-12 rounded-xl font-bold text-lg sm:text-xl hover:bg-yellow-500 transition-colors shadow-custom disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {loading ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i> Оформление...</>
                    ) : (
                      <><i className="fas fa-paper-plane mr-2"></i> Оформить заказ</>
                    )}
                  </button>
                  {deliveryPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-4">
                      <i className="fas fa-info-circle mr-1"></i>
                      Стоимость доставки включена в итоговую сумму
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Order;
