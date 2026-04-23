// Файл: src/order.js
// JavaScript для обработки формы заказа и интеграции с корзиной

// Функция для загрузки и отображения товаров из корзины на странице оформления
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('yabuduCart')) || [];
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (!cartItemsContainer || !cartTotalElement) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Ваша корзина пуста</p>';
        cartTotalElement.textContent = '0 ₽';
        return;
    }
    
    // Очищаем контейнер
    cartItemsContainer.innerHTML = '';
    
    // Отображаем товары
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4';
        
        // Формируем описание опций товара
        let optionsHtml = '';
        if (item.size) {
            optionsHtml += `<p class="text-sm text-gray-600">Размер: ${item.size.name}</p>`;
        }
        if (item.addons && item.addons.length > 0) {
            optionsHtml += `<p class="text-sm text-gray-600">Допы: ${item.addons.map(a => a.name).join(', ')}</p>`;
        }
        if (item.sizeAddons && item.sizeAddons.length > 0) {
            optionsHtml += `<p class="text-sm text-green-600">+ ${item.sizeAddons.map(a => a.name).join(', ')}</p>`;
        }
        
        itemElement.innerHTML = `
            <div class="flex items-center space-x-4">
                <img src="${item.imageUrl}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                <div>
                    <h4 class="font-bold">${item.name}</h4>
                    ${optionsHtml}
                    <p class="text-sm text-gray-600">${item.price.toFixed(2)} ₽ x ${item.quantity}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold">${(item.price * item.quantity).toFixed(2)} ₽</p>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    // Обновляем общую сумму
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalElement.textContent = `${total.toFixed(2)} ₽`;
}

// Функция для обработки формы заказа
function setupOrderForm() {
    const orderForm = document.getElementById('orderForm');
    if (!orderForm) return;

    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Получаем данные из формы
        const formData = new FormData(this);
        const orderType = formData.get('orderType');

        const orderData = {
            order_type: orderType,
            customer: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                address: orderType === 'delivery' ? formData.get('address') : null,
                entrance: orderType === 'delivery' ? formData.get('entrance') : null,
                floor: orderType === 'delivery' ? formData.get('floor') : null,
                intercom: orderType === 'delivery' ? formData.get('intercom') : null
            },
            pickup_location: orderType === 'pickup' ? formData.get('pickupLocation') : null,
            delivery: {
                time: formData.get('deliveryTime'),
                customTime: formData.get('customTime')
            },
            payment: formData.get('payment'),
            comment: formData.get('comment'),
            items: JSON.parse(localStorage.getItem('yabuduCart')) || [],
            total: document.getElementById('cartTotal')?.textContent || '0 ₽'
        };

        // Валидация
        if (!orderData.customer.name || !orderData.customer.phone) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        if (orderType === 'delivery' && !orderData.customer.address) {
            alert('Пожалуйста, введите адрес доставки');
            return;
        }

        // Валидация телефона
        const phoneRegex = /^(\d{10,15})$/;
        if (!phoneRegex.test(orderData.customer.phone.replace(/\D/g, ''))) {
            alert('Пожалуйста, введите корректный номер телефона');
            return;
        }

        // Отправляем заказ на сервер
        submitOrder(orderData);
    });
}

// Функция для отправки заказа на сервер
async function submitOrder(orderData) {
    try {
        // Преобразуем данные для API
        const apiData = {
            guest_name: orderData.customer.name,
            guest_phone: orderData.customer.phone,
            order_type: orderData.order_type,
            street: orderData.customer.address,
            building: null,
            apartment: null,
            entrance: orderData.customer.entrance,
            floor: orderData.customer.floor,
            intercom: orderData.customer.intercom,
            is_asap: orderData.delivery.time === 'asap' ? 1 : 0,
            delivery_date: null,
            delivery_time: orderData.delivery.customTime || null,
            payment: orderData.payment,
            comment: orderData.comment,
            items: orderData.items,
            location_id: orderData.pickup_location ? parseInt(orderData.pickup_location) : null
        };

        // Рассчитываем общую сумму
        const totalAmount = orderData.items.reduce((sum, item) => {
            const addonsPrice = (item.addons || []).reduce((addonSum, addon) => addonSum + (addon.price * (addon.quantity || 1)), 0);
            const sizeAddonsPrice = (item.sizeAddons || []).reduce((addonSum, addon) => addonSum + (addon.price * (addon.quantity || 1)), 0);
            return sum + ((item.price + addonsPrice + sizeAddonsPrice) * item.quantity);
        }, 0);

        apiData.total_amount = totalAmount;

        console.log('Отправка заказа на сервер:', apiData);

        // Отправляем запрос на сервер
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Заказ успешно создан:', result);

            // Показываем сообщение об успешной отправке
            showSuccessMessage(orderData.customer.name);

            // Очищаем корзину
            localStorage.removeItem('yabuduCart');
        } else {
            const error = await response.json();
            console.error('Ошибка при создании заказа:', error);
            alert('Ошибка при оформлении заказа: ' + (error.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        alert('Ошибка сети при оформлении заказа. Пожалуйста, попробуйте еще раз.');
    }
}

// Функция для отображения сообщения об успехе
function showSuccessMessage(name) {
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    successMessage.innerHTML = `
        <div class="bg-white p-8 rounded-3xl shadow-2xl max-w-md mx-4 text-center">
            <div class="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <i class="fas fa-check-circle text-green-500 text-4xl"></i>
            </div>
            <h3 class="text-2xl font-bold mb-4 font-heading">Спасибо за заказ, ${name}!</h3>
            <p class="text-gray-600 mb-6">Ваш заказ успешно оформлен. Мы свяжемся с вами в ближайшее время для подтверждения.</p>
            <button id="continueShopping" class="bg-brand-yellow text-brand-black py-3 px-8 rounded-full font-bold hover:bg-yellow-500 transition-colors">
                Продолжить покупки
            </button>
        </div>
    `;
    
    document.body.appendChild(successMessage);
    
    // Обработчик кнопки продолжения покупок
    document.getElementById('continueShopping')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// Функция для переключения между доставкой и самовывозом
function setupOrderTypeSwitching() {
    const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
    const deliveryAddressSection = document.getElementById('deliveryAddressSection');
    const pickupLocationSection = document.getElementById('pickupLocationSection');
    const addressInput = document.querySelector('input[name="address"]');

    // Функция для обновления UI
    function updateUI(orderType) {
        if (orderType === 'delivery') {
            deliveryAddressSection.classList.remove('hidden');
            pickupLocationSection.classList.add('hidden');
            addressInput.required = true;

            // Обновляем стили карточек
            document.querySelectorAll('.order-type-card').forEach(card => {
                card.classList.remove('border-brand-yellow', 'shadow-md');
                card.classList.add('border-gray-300');
            });
            document.querySelector('.order-type-card.delivery').classList.add('border-brand-yellow', 'shadow-md');
            document.querySelector('.order-type-card.delivery').classList.remove('border-gray-300');
        } else {
            deliveryAddressSection.classList.add('hidden');
            pickupLocationSection.classList.remove('hidden');
            addressInput.required = false;

            // Обновляем стили карточек
            document.querySelectorAll('.order-type-card').forEach(card => {
                card.classList.remove('border-brand-yellow', 'shadow-md');
                card.classList.add('border-gray-300');
            });
            document.querySelector('.order-type-card.pickup').classList.add('border-brand-yellow', 'shadow-md');
            document.querySelector('.order-type-card.pickup').classList.remove('border-gray-300');
        }
    }

    // Инициализация: по умолчанию доставка
    if (deliveryAddressSection && pickupLocationSection && addressInput) {
        updateUI('delivery');
    }

    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateUI(this.value);
        });
    });

    // Обработка кликов на карточки типов заказа
    document.querySelectorAll('.order-type-card').forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[name="orderType"]');
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        });
    });

    // Обработка кликов на карточки пунктов самовывоза
    document.querySelectorAll('.pickup-location-card').forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[name="pickupLocation"]');
            if (radio) {
                radio.checked = true;
                // Обновляем стили карточек
                document.querySelectorAll('.pickup-location-card').forEach(c => {
                    c.classList.remove('border-green-400', 'border-blue-400', 'shadow-md');
                    c.classList.add('border-green-200', 'border-blue-200');
                });
                if (radio.value === '1') {
                    this.classList.add('border-green-400', 'shadow-md');
                    this.classList.remove('border-green-200');
                } else {
                    this.classList.add('border-blue-400', 'shadow-md');
                    this.classList.remove('border-blue-200');
                }
            }
        });
    });

    // Инициализация стиля для выбранного пункта самовывоза по умолчанию
    const defaultPickupRadio = document.querySelector('input[name="pickupLocation"]:checked');
    if (defaultPickupRadio) {
        const card = defaultPickupRadio.closest('.pickup-location-card');
        if (card && defaultPickupRadio.value === '1') {
            card.classList.add('border-green-400', 'shadow-md');
            card.classList.remove('border-green-200');
        }
    }
}

// Функция для обработки поля времени доставки
function setupDeliveryTime() {
    const deliveryTimeSelect = document.querySelector('select[name="deliveryTime"]');
    const customTimeDiv = document.getElementById('customTimeDiv');

    if (deliveryTimeSelect && customTimeDiv) {
        deliveryTimeSelect.addEventListener('change', function() {
            if (this.value === 'later') {
                customTimeDiv.classList.remove('hidden');
            } else {
                customTimeDiv.classList.add('hidden');
            }
        });
    }
}

// Инициализация страницы
function initOrderPage() {
    // Загружаем товары из корзины
    loadCartItems();

    // Настраиваем переключение типов заказа
    setupOrderTypeSwitching();

    // Настраиваем форму заказа
    setupOrderForm();

    // Настраиваем поле времени доставки
    setupDeliveryTime();

    // Обновляем год в футере
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// Запускаем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', initOrderPage);