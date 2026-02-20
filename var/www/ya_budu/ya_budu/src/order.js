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
        const orderData = {
            customer: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                entrance: formData.get('entrance'),
                floor: formData.get('floor'),
                intercom: formData.get('intercom')
            },
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
        if (!orderData.customer.name || !orderData.customer.phone || !orderData.customer.address) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }
        
        // Валидация телефона
        const phoneRegex = /^(\d{10,15})$/;
        if (!phoneRegex.test(orderData.customer.phone.replace(/\D/g, ''))) {
            alert('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        // Показываем сообщение об успешной отправке
        showSuccessMessage(orderData.customer.name);
        
        // Очищаем корзину
        localStorage.removeItem('yabuduCart');
        
        // В реальном приложении здесь был бы запрос к серверу
        console.log('Данные заказа:', orderData);
        
        // Перенаправляем на главную страницу через 3 секунды
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    });
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
    
    // Настраиваем форму заказа
    setupOrderForm();
    
    // Настраиваем поле времени доставки
    setupDeliveryTime();
    
    // Обновляем год в футере
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// Запускаем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', initOrderPage);