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
  const [pickupPoints, setPickupPoints] = useState([]);

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
        } else {
          console.error('Ошибка загрузки районов доставки');
        }
      } catch (error) {
        console.error('Ошибка сети при загрузке районов доставки:', error);
      }
    };

    const fetchPickupPoints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pickup-points`);
        if (response.ok) {
          const points = await response.json();
          setPickupPoints(points);
        } else {
          // Fallback: используем захардкоженные данные для тестирования
          setPickupPoints([
            { id: 1, name: 'Ресторан "ЯБУДУ"', address: 'Профессора Малигонова 35', schedule: 'Пн-Чт 11:00-22:00, Пт-Сб 11:00-23:00, Вс 11:00-22:00' },
            { id: 2, name: 'Ресторан "ЯБУДУ" (2 точка)', address: 'ул. Мурата Ахеджака 26', schedule: 'Пн-Вс 10:00-22:00' },
            { id: 2, name: 'Мурата Ахеджака 26', address: 'Мурата Ахеджака 26', schedule: 'Пн-Вс 10:00-22:00' }
          ]);
        }
      } catch (error) {
        // Fallback: используем захардкоженные данные для тестирования
        setPickupPoints([
          { id: 1, name: 'Ресторан "ЯБУДУ"', address: 'Профессора Малигонова 35', schedule: 'Пн-Чт 11:00-22:00, Пт-Сб 11:00-23:00, Вс 11:00-22:00' },
          { id: 2, name: 'Мурата Ахеджака 26', address: 'Мурата Ахеджака 26', schedule: 'Пн-Вс 10:00-22:00' }
        ]);
      }
    };

    fetchDeliveryZones();
    fetchPickupPoints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      setError('Пожалуйста, заполните обязательные поля');
      return;
    }

    if (formData.orderType === 'delivery' && !formData.street) {
      setError('Пожалуйста, укажите адрес доставки');
      return;
    }

    if (!formData.agreement) {
      setError('Пожалуйста, согласитесь с условиями');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Определяем время доставки
      let isAsapValue = false;
      let deliveryDateValue = null;
      let deliveryTimeValue = null;

      if (formData.deliveryDate === 'today') {
        if (formData.deliveryTime === 'asap') {
          isAsapValue = true;
        } else if (formData.deliveryTime === '1hour') {
          deliveryDateValue = new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[0];
          deliveryTimeValue = new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[1].substring(0, 5);
        } else if (formData.deliveryTime === '2hours') {
          deliveryDateValue = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];
          deliveryTimeValue = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[1].substring(0, 5);
        }
      } else if (formData.deliveryDate === 'later' && formData.customDate) {
        deliveryDateValue = formData.customDate;
        deliveryTimeValue = formData.customTime || null;
      }

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
        total_amount: getTotal() + deliveryPrice,
        zone_id: selectedZone ? selectedZone.id : null,
        delivery_price: deliveryPrice,
        location_id: formData.orderType === 'pickup' ? parseInt(formData.pickupLocation) : null,
      };

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        clearCart();
        setShowSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при оформлении заказа');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 font-heading">
            <span className="text-brand-yellow">Оформление</span> заказа
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {showSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <h3 className="font-bold">Заказ оформлен!</h3>
              <p>Мы свяжемся с вами в ближайшее время для подтверждения.</p>
              <p className="text-sm mt-2">Перенаправление на главную страницу...</p>
            </div>
          )}

          {!showSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Тип заказа */}
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
                      className="mr-3 sm:mr-4 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
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
                      className="mr-3 sm:mr-4 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                    />
                    <div>
                      <i className="fas fa-store text-xl sm:text-2xl text-brand-yellow mr-2"></i>
                      <span className="font-bold text-base sm:text-lg">Самовывоз</span>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Заберёте заказ из ресторана</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Личные данные */}
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

              {/* Адрес доставки или пункт самовывоза */}
              {formData.orderType === 'delivery' ? (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Район доставки</h3>
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
                                  {deliveryPrice > 0 ? `Стоимость доставки: ${deliveryPrice} ₽` : 'Бесплатная доставка'}
                                </p>
                                {selectedZone.min_order_amount && getTotal() < selectedZone.min_order_amount && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    До бесплатной доставки: {(selectedZone.min_order_amount - getTotal()).toFixed(2)} ₽
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-4">
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
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6">
                      <p className="text-yellow-800 text-sm">
                        Районы доставки загружаются...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Пункт самовывоза</h3>
                  <p className="text-gray-600 mb-6">Выберите удобный для вас пункт самовывоза:</p>

                  {pickupPoints.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                      <p className="text-yellow-800 text-sm"><strong>💡 Подсказка:</strong> Вы можете выбрать один из {pickupPoints.length} пунктов самовывоза. Заказ будет готов к выдаче в выбранном месте.</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {pickupPoints.length > 0 ? pickupPoints.map((point, index) => {
                      const isSelected = formData.pickupLocation === point.id.toString();

                      return (
                        <label key={point.id} className={`flex items-start cursor-pointer p-4 sm:p-6 rounded-xl border-2 transition-all ${isSelected ? 'border-green-400 bg-green-50 shadow-md' : 'border-green-200 bg-green-50 hover:border-green-300'}`}>
                          <input
                            type="radio"
                            name="pickupLocation"
                            value={point.id.toString()}
                            checked={isSelected}
                            onChange={handleInputChange}
                            className="mt-1 mr-4 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                          />
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <i className="fas fa-store text-xl text-green-600 mr-3"></i>
                              <h4 className="font-bold text-lg text-green-800">{point.name}</h4>
                            </div>
                            <p className="text-gray-700 mb-2">{point.address}</p>
                            {point.schedule && <p className="text-gray-500 text-sm">{point.schedule}</p>}
                          </div>
                        </label>
                      );
                    }) : (
                      <div className="text-center py-8">
                        <i className="fas fa-store text-4xl text-gray-400 mb-4"></i>
                        <p className="text-gray-500">Загрузка точек самовывоза...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Время доставки/самовывоза */}
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
                          setFormData(prev => ({ ...prev, deliveryDate: 'later' }));
                          setShowCustomTime(true);
                        }}
                      >
                        Другая дата
                      </button>
                    </div>
                  </div>

                  {showCustomTime && (
                    <div>
                      <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Укажите дату и время</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <input
                          type="date"
                          name="customDate"
                          value={formData.customDate}
                          onChange={handleInputChange}
                          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                        />
                        <input
                          type="time"
                          name="customTime"
                          value={formData.customTime}
                          onChange={handleInputChange}
                          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base min-h-[48px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <button
                      type="button"
                      className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                        formData.deliveryTime === 'asap' && formData.deliveryDate === 'today'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, deliveryTime: 'asap' }))}
                    >
                      Как можно скорее
                    </button>
                    <button
                      type="button"
                      className={`p-3 sm:p-4 rounded-xl border-2 text-sm sm:text-base font-medium transition-all ${
                        formData.deliveryTime === '1hour' && formData.deliveryDate === 'today'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, deliveryTime: '1hour' }))}
                    >
                      Через 1 час
                    </button>
                  </div>
                </div>
              </div>

              {/* Способ оплаты */}
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
                      className="mr-3 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                    />
                    <span className="text-gray-700 font-medium text-sm sm:text-base">
                      {formData.orderType === 'delivery' ? 'Наличными при получении' : 'Наличными при самовывозе'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={formData.payment === 'card'}
                      onChange={handleInputChange}
                      className="mr-3 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                    />
                    <span className="text-gray-700 font-medium text-sm sm:text-base">
                      {formData.orderType === 'delivery' ? 'Картой при получении' : 'Картой при самовывозе'}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={formData.payment === 'transfer'}
                      onChange={handleInputChange}
                      className="mr-3 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                    />
                    <span className="text-gray-700 font-medium text-sm sm:text-base">Переводом при получении</span>
                  </label>
                </div>
              </div>

              {/* Комментарий */}
              <div>
                <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">Комментарий к заказу</label>
                <textarea
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent text-base"
                  rows="3"
                  placeholder="Особые пожелания, аллергии и т.д."
                />
              </div>

              {/* Согласие */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreement"
                  checked={formData.agreement}
                  onChange={handleInputChange}
                  className="mt-1 mr-3 w-5 h-5 text-brand-yellow focus:ring-brand-yellow"
                  required
                />
                <label className="text-gray-700 text-xs sm:text-sm">
                  Я согласен с <Link to="/terms" className="text-brand-yellow hover:underline">условиями обработки персональных данных</Link> и <Link to="/privacy" className="text-brand-yellow hover:underline">правилами доставки</Link>
                </label>
              </div>

              {/* Корзина и итого */}
              <div className="mt-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Ваш заказ</h3>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
                  <h4 className="font-bold text-base sm:text-lg mb-4">Товары в корзине</h4>
                  {items.length > 0 ? items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl mb-3 sm:mb-4">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <img
                          src={item.imageUrl || '/placeholder-food.jpg'}
                          alt={item.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm sm:text-base truncate">{item.name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{item.price.toFixed(2)} ₽ x {item.quantity}</p>
                          {item.size && <p className="text-xs text-gray-600">Размер: {item.size.name}</p>}
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-xs text-gray-600">Допы: {item.addons.map(a => a.name).join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-sm sm:text-base">{(item.price * item.quantity).toFixed(2)} ₽</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <i className="fas fa-shopping-cart text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-500">Ваша корзина пуста</p>
                      <Link to="/menu" className="inline-block mt-4 bg-brand-yellow text-brand-black py-2 px-6 rounded-full font-bold hover:bg-yellow-500 transition-colors">
                        Перейти в меню
                      </Link>
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Сумма заказа:</span>
                        <span className="font-bold text-base sm:text-lg">{getTotal().toFixed(2)} ₽</span>
                      </div>
                      {formData.orderType === 'delivery' && deliveryPrice > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Доставка:</span>
                          <span className="font-bold text-base sm:text-lg">{deliveryPrice.toFixed(2)} ₽</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-base sm:text-lg font-bold">Итого к оплате:</span>
                          <span className="text-2xl sm:text-3xl font-bold text-brand-yellow">
                            {(getTotal() + deliveryPrice).toFixed(2)} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопка отправки */}
              <div className="text-center pt-4 sm:pt-6">
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="w-full sm:w-auto bg-brand-yellow text-brand-black py-4 px-8 sm:px-12 rounded-xl font-bold text-lg sm:text-xl hover:bg-yellow-500 transition-colors shadow-custom disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  {loading ? 'Отправка...' : 'Оформить заказ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Order;