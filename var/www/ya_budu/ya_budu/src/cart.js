// Файл: src/cart.js
// JavaScript для функциональности корзины

// Класс для управления корзиной
class Cart {
    constructor() {
        this.items = [];
        this.cartElement = null;
        this.cartCountElement = null;
        this.totalElement = null;
        this.init();
    }

    // Инициализация корзины
    init() {
        // Создаем элементы корзины, если их нет
        this.createCartElements();
        
        // Загружаем сохраненные данные корзины
        this.loadCart();
        
        // Обновляем отображение корзины
        this.updateCartDisplay();
        
        // Добавляем обработчики событий
        this.setupEventListeners();
    }

    // Создание элементов корзины
    createCartElements() {
        // Создаем иконку корзины в навигации
        const navCartIcon = document.createElement('div');
        navCartIcon.className = 'relative ml-4';
        navCartIcon.innerHTML = `
            <button id="cartIcon" class="bg-brand-yellow text-brand-black w-12 h-12 rounded-full flex items-center justify-center hover:bg-yellow-500 transition-colors">
                <i class="fas fa-shopping-cart text-xl"></i>
                <span id="cartCount" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">0</span>
            </button>
        `;
        
        // Добавляем иконку корзины в навигацию
        const nav = document.querySelector('header nav');
        if (nav) {
            nav.after(navCartIcon);
        }
        
        // Создаем модальное окно корзины
        const cartModal = document.createElement('div');
        cartModal.id = 'cartModal';
        cartModal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden';
        cartModal.innerHTML = `
            <div class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl p-6 overflow-y-auto transform translate-x-full transition-transform duration-300">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold font-heading">Ваша корзина</h3>
                    <button id="closeCart" class="text-gray-500 hover:text-gray-700 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="cartItems" class="space-y-4 mb-6"></div>
                <div class="border-t border-gray-200 pt-4">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-lg font-bold">Итого:</span>
                        <span id="cartTotal" class="text-2xl font-bold text-brand-yellow">0 ₽</span>
                    </div>
                    <button id="checkoutBtn" class="w-full bg-brand-yellow text-brand-black py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors">
                        Оформить заказ
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(cartModal);
        
        // Сохраняем ссылки на элементы
        this.cartElement = document.getElementById('cartItems');
        this.cartCountElement = document.getElementById('cartCount');
        this.totalElement = document.getElementById('cartTotal');
    }

    // Загрузка данных корзины из localStorage
    loadCart() {
        const savedCart = localStorage.getItem('yabuduCart');
        if (savedCart) {
            this.items = JSON.parse(savedCart);
        }
    }

    // Сохранение данных корзины в localStorage
    saveCart() {
        localStorage.setItem('yabuduCart', JSON.stringify(this.items));
    }

    // Добавление товара в корзину
    addItem(productName, price, imageUrl) {
        // Проверяем, есть ли уже такой товар в корзине
        const existingItem = this.items.find(item => item.name === productName);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                name: productName,
                price: parseFloat(price.replace(' ₽', '').replace(',', '.')) || 0,
                imageUrl: imageUrl || 'https://via.placeholder.com/100',
                quantity: 1
            });
        }
        
        // Сохраняем и обновляем отображение
        this.saveCart();
        this.updateCartDisplay();
        
        // Показываем уведомление
        this.showNotification(`${productName} добавлен в корзину!`);
    }

    // Удаление товара из корзины
    removeItem(productName) {
        this.items = this.items.filter(item => item.name !== productName);
        this.saveCart();
        this.updateCartDisplay();
    }

    // Обновление количества товара
    updateQuantity(productName, quantity) {
        const item = this.items.find(item => item.name === productName);
        if (item) {
            item.quantity = Math.max(1, quantity);
            this.saveCart();
            this.updateCartDisplay();
        }
    }

    // Очистка корзины
    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateCartDisplay();
    }

    // Обновление отображения корзины
    updateCartDisplay() {
        // Обновляем счетчик товаров
        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        this.cartCountElement.textContent = totalItems;
        
        // Обновляем общую сумму
        const totalPrice = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        this.totalElement.textContent = `${totalPrice.toFixed(2)} ₽`;
        
        // Обновляем список товаров в корзине
        if (this.cartElement) {
            this.cartElement.innerHTML = '';
            
            if (this.items.length === 0) {
                this.cartElement.innerHTML = '<p class="text-center text-gray-500 py-8">Ваша корзина пуста</p>';
            } else {
                this.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-xl';
                    itemElement.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <img src="${item.imageUrl}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                            <div>
                                <h4 class="font-bold">${item.name}</h4>
                                <p class="text-sm text-gray-600">${item.price.toFixed(2)} ₽ x ${item.quantity}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button class="cart-decrement text-gray-500 hover:text-gray-700" data-name="${item.name}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="font-bold">${item.quantity}</span>
                            <button class="cart-increment text-gray-500 hover:text-gray-700" data-name="${item.name}">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="cart-remove text-red-500 hover:text-red-700 ml-2" data-name="${item.name}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    this.cartElement.appendChild(itemElement);
                });
            }
        }
    }

    // Показ уведомления
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-brand-yellow text-brand-black px-6 py-4 rounded-xl shadow-lg z-50 animate-slideIn';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle text-xl mr-3"></i>
                <div>
                    <strong>Успех!</strong>
                    <div class="text-sm">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Открытие корзины
        document.getElementById('cartIcon')?.addEventListener('click', () => {
            const modal = document.getElementById('cartModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.querySelector('div').classList.remove('translate-x-full');
            }
        });
        
        // Закрытие корзины
        document.getElementById('closeCart')?.addEventListener('click', () => {
            const modal = document.getElementById('cartModal');
            if (modal) {
                modal.querySelector('div').classList.add('translate-x-full');
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 300);
            }
        });
        
        // Закрытие корзины при клике вне модального окна
        document.getElementById('cartModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                const modal = document.getElementById('cartModal');
                if (modal) {
                    modal.querySelector('div').classList.add('translate-x-full');
                    setTimeout(() => {
                        modal.classList.add('hidden');
                    }, 300);
                }
            }
        });
        
        // Обработка кнопок "Добавить в заказ" на странице
        document.querySelectorAll('button').forEach(button => {
            if (button.textContent.includes('Добавить в заказ')) {
                button.addEventListener('click', function() {
                    const productCard = this.closest('.bg-gray-800.rounded-3xl');
                    if (productCard) {
                        const productName = productCard.querySelector('h3').textContent;
                        const price = productCard.querySelector('span').textContent;
                        const imageUrl = productCard.querySelector('img').src;
                        
                        cart.addItem(productName, price, imageUrl);
                    }
                });
            }
        });
        
        // Обработка кнопок в корзине (делегирование событий)
        this.cartElement.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const productName = target.getAttribute('data-name');
            if (!productName) return;
            
            if (target.classList.contains('cart-remove')) {
                this.removeItem(productName);
            } else if (target.classList.contains('cart-increment')) {
                const item = this.items.find(item => item.name === productName);
                if (item) {
                    this.updateQuantity(productName, item.quantity + 1);
                }
            } else if (target.classList.contains('cart-decrement')) {
                const item = this.items.find(item => item.name === productName);
                if (item) {
                    this.updateQuantity(productName, item.quantity - 1);
                }
            }
        });
        
        // Обработка кнопки оформления заказа
        document.getElementById('checkoutBtn')?.addEventListener('click', () => {
            if (this.items.length === 0) {
                this.showNotification('Ваша корзина пуста!');
                return;
            }
            
            // Перенаправляем на страницу оформления заказа
            window.location.href = 'order.html';
        });
    }

    // Получение текущего состояния корзины
    getCart() {
        return this.items;
    }

    // Получение общей суммы
    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
}