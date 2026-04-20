import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config';

const Home = () => {
  const { addItem } = useCart();
  const [toast, setToast] = useState({ show: false, message: '' });
  const [menuItems, setMenuItems] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Добавляем состояние для категорий
  const [loading, setLoading] = useState(true);
  
  // Cache for sizes, addons and size-addons
  const [productOptions, setProductOptions] = useState({});
  // Selected options for each product
  const [selectedOptions, setSelectedOptions] = useState({});
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Загружаем товары для главной страницы
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const cacheBuster = Date.now();
        const [productsRes, categoriesRes, optionsRes, featuredRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products?t=${cacheBuster}`),
          fetch(`${API_BASE_URL}/api/categories?t=${cacheBuster}`),
          fetch(`${API_BASE_URL}/api/products/options?t=${cacheBuster}`),
          fetch(`${API_BASE_URL}/api/products/featured?t=${cacheBuster}`)
        ]);
        
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        const optionsData = await optionsRes.json();
        const featuredData = await featuredRes.json();
        
        // Все товары для главной страницы
        setMenuItems(productsData || []);
        // Избранные товары
        setFeaturedProducts(featuredData || []);
        
        // Fallback: если категории пустые, создаём их из товаров
        let finalCategories = categoriesData;
        if (!categoriesData || categoriesData.length === 0) {
          const uniqueCategories = [...new Set(productsData?.map(p => p.category_name).filter(Boolean) || [])];
          finalCategories = uniqueCategories.map((name, index) => ({
            id: name,
            name: name,
            sort_order: index
          }));
        }
        
        setCategories(finalCategories); // Устанавливаем категории
        
        const optionsCache = {};
        const sizeAddonsData = optionsRes.data.size_addons || {};
        
        // Обрабатываем ВСЕ товары из основного меню
        for (const product of productsData || []) {
          const sizes = optionsRes.data.sizes?.[product.id] || [];
          const addons = optionsRes.data.addons?.[product.id] || [];
          
          const sizesWithAddons = sizes.map(size => ({
            ...size,
            addons: sizeAddonsData[size.id] || []
          }));
          
          optionsCache[product.id] = { 
            sizes: sizesWithAddons, 
            addons,
            allAddons: addons 
          };
          
          if (sizesWithAddons.length > 0) {
            setSelectedOptions(prev => ({
              ...prev,
              [product.id]: {
                size: sizesWithAddons[0],
                addons: [],
                sizeAddons: []
              }
            }));
          }
        }
        
        // Также обрабатываем избранные товары, которые могут отличаться
        for (const product of featuredData || []) {
          if (!optionsCache[product.id]) {
            const sizes = optionsRes.data.sizes?.[product.id] || [];
            const addons = optionsRes.data.addons?.[product.id] || [];
            
            const sizesWithAddons = sizes.map(size => ({
              ...size,
              addons: sizeAddonsData[size.id] || []
            }));
            
            optionsCache[product.id] = { 
              sizes: sizesWithAddons, 
              addons,
              allAddons: addons 
            };
            
            if (sizesWithAddons.length > 0) {
              setSelectedOptions(prev => ({
                ...prev,
                [product.id]: {
                  size: sizesWithAddons[0],
                  addons: [],
                  sizeAddons: []
                }
              }));
            }
          }
        }
        
        setProductOptions(optionsCache);
      } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  const handleSizeSelect = (productId, size) => {
    const optionsData = productOptions[productId] || { sizes: [], addons: [] };
    const fullSize = optionsData.sizes.find(s => s.id === size.id) || size;
    
    setSelectedOptions(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        size: fullSize,
        sizeAddons: []
      }
    }));
    setValidationErrors(prev => ({
      ...prev,
      [productId]: { ...prev[productId], size: false }
    }));
  };

  const handleAddonToggle = (productId, addon) => {
    setSelectedOptions(prev => {
      const current = prev[productId] || { size: null, addons: [], sizeAddons: [] };
      const addons = current.addons || [];
      const exists = addons.find(a => a.id === addon.id);
      
      return {
        ...prev,
        [productId]: {
          ...current,
          addons: exists 
            ? addons.filter(a => a.id !== addon.id)
            : [...addons, addon]
        }
      };
    });
  };

  const handleSizeAddonToggle = (productId, addon) => {
    setSelectedOptions(prev => {
      const current = prev[productId] || { size: null, addons: [], sizeAddons: [] };
      const sizeAddons = current.sizeAddons || [];
      const exists = sizeAddons.find(a => a.id === addon.id);
      
      return {
        ...prev,
        [productId]: {
          ...current,
          sizeAddons: exists 
            ? sizeAddons.filter(a => a.id !== addon.id)
            : [...sizeAddons, addon]
        }
      };
    });
  };

  const getProductFinalPrice = (product) => {
    const options = selectedOptions[product.id] || { size: null, addons: [], sizeAddons: [] };
    
    const sizePrice = parseFloat(options.size?.price) || 0;
    const basePrice = sizePrice > 0 ? sizePrice : (parseFloat(product.price) || 0);
    const sizeModifier = parseFloat(options.size?.price_modifier) || 0;
    const addonsPrice = (options.addons || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
    // Для size_addons используем ТОЛЬКО price_modifier (это цена допа для конкретного размера)
    const sizeAddonsPrice = (options.sizeAddons || []).reduce((sum, a) => {
      return sum + (parseFloat(a.price_modifier) || 0);
    }, 0);
    const finalPrice = basePrice + sizeModifier + addonsPrice + sizeAddonsPrice;
    
    return finalPrice;
  };

  const handleAddToCart = (product) => {
    const options = selectedOptions[product.id] || { size: null, addons: [], sizeAddons: [] };
    const optionsData = productOptions[product.id] || { sizes: [], addons: [] };
    
    if (optionsData.sizes.length > 0 && !options.size) {
      setValidationErrors(prev => ({
        ...prev,
        [product.id]: { ...prev[product.id], size: true }
      }));
      setToast({ show: true, message: 'Пожалуйста, выберите размер!' });
      return;
    }
    
    if (options.size && options.size.addons) {
      const requiredAddons = options.size.addons.filter(a => a.is_required);
      const selectedRequiredIds = (options.sizeAddons || []).map(a => a.id);
      const missingRequired = requiredAddons.filter(a => !selectedRequiredIds.includes(a.id));
      
      if (missingRequired.length > 0) {
        setToast({ show: true, message: `Выберите обязательные добавки: ${missingRequired.map(a => a.name).join(', ')}` });
        return;
      }
    }
    
    const basePrice = parseFloat(options.size?.price) || parseFloat(product.price) || 0;
    const sizeModifier = parseFloat(options.size?.price_modifier) || 0;
    const addonsPrice = (options.addons || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
    // Для size_addons используем ТОЛЬКО price_modifier (это цена допа для конкретного размера)
    const sizeAddonsPrice = (options.sizeAddons || []).reduce((sum, a) => {
      return sum + (parseFloat(a.price_modifier) || 0);
    }, 0);
    const finalPrice = basePrice + sizeModifier + addonsPrice + sizeAddonsPrice;
    
    addItem(
      product.name,
      finalPrice,
      getImageUrl(product.image_url),
      product.id,
      options.size,
      options.addons || [],
      options.sizeAddons || []
    );
    
    setToast({ show: true, message: `${product.name} добавлен в корзину!` });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Вспомогательная функция для URL картинки
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Извлекаем относительный путь из полного URL если сохранён с доменом
    // old format: https://fp.xn--90ag8bb0d.com/uploads/products/filename.jpg
    // new format: /uploads/products/filename.jpg или filename.jpg
    if (imageUrl.startsWith('http')) {
      const match = imageUrl.match(/(\/uploads\/.*)$/);
      if (match) {
        imageUrl = match[1];
      } else {
        return null;
      }
    }
    const cleanPath = imageUrl.replace(/^\/uploads\//, '').replace(/^\/+/, '');
    return `${IMAGE_BASE_URL}${cleanPath}`;
  };

  // Открытие чата
  const handleOpenChat = () => {
    // Ищем кнопку чата по CSS селектору
    const chatButton = document.querySelector('button[aria-label="Открыть чат"], button[aria-label="Закрыть чат"]');
    if (chatButton) {
      chatButton.click();
    } else {
      // Если кнопка не найдена, пробуем другой способ
      const chatWidget = document.querySelector('.fixed.bottom-4');
      if (chatWidget && chatWidget.click) {
        chatWidget.click();
      }
    }
  };

  return (
    <div>
      {/* Toast уведомление */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-brand-yellow text-brand-black px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <i className="fas fa-check-circle mr-2"></i>
          {toast.message}
        </div>
      )}

      {/* Герой-секция */}
      <section className="gradient-bg text-white py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 text-center md:text-left">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 font-heading">
                Быстро. Вкусно.
                <span className="text-brand-yellow">ЯБУДУ!</span>
              </h2>
              <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-300">
                Доставка свежеприготовленного фаст-фуда прямо к вашему порогу.
                Мы готовим быстро, вкусно и с душой!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleOpenChat}
                  className="bg-brand-yellow text-brand-black px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover-lift cursor-pointer"
                >
                  <i className="fas fa-comments mr-2"></i> Заказать через чат
                </button>
                <a href="#menu" className="border-2 border-brand-yellow text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-brand-yellow hover:text-brand-black transition-colors">
                  <i className="fas fa-utensils mr-2"></i> Посмотреть меню
                </a>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <img 
                src={IMAGE_BASE_URL + "cheeseburger-sesame-seed-bun-features-layers-fresh-lettuce-juicy-tomato-slices-cheddar-cheese-beef-patty-crispy-bacon-401621106.webp"}
                alt="Фаст-фуд"
                className="rounded-3xl shadow-custom-lg w-full max-w-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8 sm:mb-16 font-heading">
            Почему выбирают <span className="text-brand-yellow">ЯБУДУ</span>?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-custom hover-lift">
              <div className="bg-brand-yellow text-brand-black w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <i className="fas fa-bolt text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 font-heading">Быстрая доставка</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Доставляем заказы в течение 30 минут или вы получаете скидку 20% на следующий заказ.
              </p>
            </div>

            <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-custom hover-lift">
              <div className="bg-brand-yellow text-brand-black w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <i className="fas fa-seedling text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 font-heading">Свежие ингредиенты</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Используем только свежие, отборные продукты. Каждое блюдо готовится после заказа.
              </p>
            </div>

            <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-custom hover-lift">
              <div className="bg-brand-yellow text-brand-black w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <i className="fas fa-award text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 font-heading">Гарантия качества</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Все наши блюда проходят строгий контроль качества. Ваше удовлетворение - наш приоритет.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Меню - показываем товары с главной страницы */}
      <section id="menu" className="py-12 sm:py-16 gradient-bg text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-4 font-heading">
            Наше <span className="text-brand-yellow">меню</span>
          </h2>
          <p className="text-lg sm:text-xl text-center text-gray-300 mb-8 sm:mb-16">
            {featuredProducts.length > 0 ? 'Избранные блюда, которые заказывают снова и снова' : 'Товары скоро появятся!'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {loading ? (
              // Загрузочные карточки
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-custom-lg animate-pulse">
                  <div className="h-40 sm:h-48 bg-gray-700"></div>
                  <div className="p-4 sm:p-6">
                    <div className="h-6 bg-gray-700 rounded mb-3 w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded mb-4 w-1/2"></div>
                    <div className="h-10 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              // Только избранные товары с флагом is_featured=1
              featuredProducts.map((product) => {
                const options = productOptions[product.id] || { sizes: [], addons: [] };
                const selected = selectedOptions[product.id] || { size: null, addons: [], sizeAddons: [] };
                const finalPrice = getProductFinalPrice(product);
                const hasSizeError = validationErrors[product.id]?.size;
                
                return (
                  <div key={product.id} className="bg-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-custom-lg hover-lift">
                    <div className="h-40 sm:h-48 overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={getImageUrl(product.image_url)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full bg-gray-700 flex items-center justify-center"
                        style={{ display: product.image_url ? 'none' : 'flex' }}
                      >
                        <span className="text-gray-400 text-4xl">🍔</span>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="text-xl sm:text-2xl font-bold font-heading">{product.name}</h3>
                        <span className="text-brand-yellow text-xl sm:text-2xl font-bold">{finalPrice} ₽</span>
                      </div>
                      <p className="text-gray-300 text-sm sm:text-base mb-3 sm:mb-4">
                        {product.description || 'Вкусное блюдо из нашего меню'}
                      </p>
                      
                      {/* Sizes selection */}
                      {options.sizes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">Размер:</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {options.sizes.map(size => {
                              const isSelected = selected.size?.id === size.id;
                              return (
                                <button
                                  key={size.id}
                                  onClick={() => handleSizeSelect(product.id, size)}
                                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                    isSelected
                                      ? 'bg-brand-yellow text-brand-black border-brand-yellow'
                                      : hasSizeError
                                        ? 'bg-red-900 text-red-200 border-red-500'
                                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-brand-yellow'
                                  }`}
                                >
                                  {size.name} {size.price_modifier > 0 ? `+${size.price_modifier}` : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Addons selection */}
                      {options.addons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">Допы:</p>
                          <div className="flex flex-wrap gap-1">
                            {options.addons.map(addon => {
                              const isSelected = (selected.addons || []).some(a => a.id === addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  onClick={() => handleAddonToggle(product.id, addon)}
                                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                    isSelected
                                      ? 'bg-brand-yellow text-brand-black border-brand-yellow'
                                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-brand-yellow'
                                  }`}
                                >
                                  {addon.name} +{addon.price}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-brand-yellow text-brand-black py-3 sm:py-3 rounded-full font-bold text-sm sm:text-base hover:bg-yellow-500 transition-colors active:scale-95"
                      >
                        Добавить в заказ
                      </button>
                    </div>
                  </div>
                );
              })
            ) : featuredProducts.length === 0 && !loading ? (
              // Если избранных товаров нет
              <div className="col-span-3 text-center py-8">
                <p className="text-gray-400 text-lg">Товары скоро появятся!</p>
              </div>
            ) : null}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <Link to="/menu" className="border-2 border-brand-yellow text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg hover:bg-brand-yellow hover:text-brand-black transition-colors inline-block">
              <i className="fas fa-book-open mr-2"></i> Полное меню
            </Link>
          </div>
        </div>
      </section>

      {/* О нас */}
      <section id="about" className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0 text-center md:text-left">
              <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 font-heading">
                О компании <span className="text-brand-yellow">ЯБУДУ</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
                Мы - современная компания по доставке и готовке фаст-фуда, которая стремится изменить представление о быстром питании.
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
                Наша миссия - предоставлять не просто быструю еду, а вкусные, качественные блюда, приготовленные с заботой о каждом клиенте.
              </p>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                С 2020 года мы обслужили более 50 000 довольных клиентов и продолжаем расти, улучшая наш сервис и расширяя меню.
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-brand-yellow mb-1 sm:mb-2">50K+</div>
                  <div className="text-gray-600 text-xs sm:text-base">Довольных клиентов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-brand-yellow mb-1 sm:mb-2">30 мин</div>
                  <div className="text-gray-600 text-xs sm:text-base">Среднее время доставки</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-bold text-brand-yellow mb-1 sm:mb-2">4.8</div>
                  <div className="text-gray-600 text-xs sm:text-base">Средняя оценка</div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 flex justify-center mt-8 md:mt-0">
              <div className="relative">
                <div className="bg-brand-yellow rounded-full w-48 h-48 sm:w-72 sm:h-72 opacity-20 absolute -bottom-4 -left-4"></div>
                <img src="https://images.unsplash.com/photo-1554679665-f5537f187268?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                     alt="Команда ЯБУДУ"
                     className="rounded-2xl sm:rounded-3xl shadow-custom-lg w-full max-w-sm sm:max-w-lg relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Доставка */}
      <section id="delivery" className="py-12 sm:py-16 gradient-bg text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8 sm:mb-16 font-heading">
            Как работает <span className="text-brand-yellow">доставка</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center">
              <div className="bg-brand-yellow text-brand-black w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">
                1
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 font-heading">Выберите блюда</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Откройте наше меню и выберите любимые блюда
              </p>
            </div>

            <div className="text-center">
              <div className="bg-brand-yellow text-brand-black w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">
                2
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 font-heading">Оформите заказ</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Укажите адрес доставки и удобное время
              </p>
            </div>

            <div className="text-center">
              <div className="bg-brand-yellow text-brand-black w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">
                3
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 font-heading">Мы готовим</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Наши повара сразу приступают к приготовлению
              </p>
            </div>

            <div className="text-center">
              <div className="bg-brand-yellow text-brand-black w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">
                4
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 font-heading">Быстрая доставка</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Курьер доставляет заказ горячим и свежим
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Контакты */}
      <section id="contact" className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8 sm:mb-16 font-heading">
            <span className="text-brand-yellow">Свяжитесь</span> с нами
          </h2>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
              <h3 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 font-heading">Контакты</h3>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start">
                  <div className="bg-brand-yellow text-brand-black p-2 sm:p-3 rounded-full mr-3 sm:mr-4 flex-shrink-0">
                    <i className="fas fa-phone text-lg sm:text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-1">Телефон</h4>
                    <p className="text-gray-600 text-base sm:text-lg">8 (938) 475-09-99</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-brand-yellow text-brand-black p-2 sm:p-3 rounded-full mr-3 sm:mr-4 flex-shrink-0">
                    <i className="fas fa-envelope text-lg sm:text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-1">Email</h4>
                    <p className="text-gray-600 text-base sm:text-lg">zakazyabudu@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-brand-yellow text-brand-black p-2 sm:p-3 rounded-full mr-3 sm:mr-4 flex-shrink-0">
                    <i className="fas fa-map-marker-alt text-lg sm:text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-xl font-bold mb-1">Адрес</h4>
                    <p className="text-gray-600 text-base sm:text-lg">Профессора Малигонова 35</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-12">
                <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-heading">Время работы</h3>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                  <div className="flex justify-between py-2 sm:py-3 border-b border-gray-200">
                    <span className="font-medium text-sm sm:text-base">Пн-Чт:</span>
                    <span className="text-gray-600 text-sm sm:text-base">11:00 - 22:00</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-gray-200">
                    <span className="font-medium text-sm sm:text-base">Пт-Сб:</span>
                    <span className="text-gray-600 text-sm sm:text-base">11:00 - 23:00</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3 border-b border-gray-200">
                    <span className="font-medium text-sm sm:text-base">Вс:</span>
                    <span className="text-gray-600 text-sm sm:text-base">11:00 - 22:00</span>
                  </div>
                  <div className="flex justify-between py-2 sm:py-3">
                    <span className="font-medium text-sm sm:text-base">Доставка:</span>
                    <span className="text-gray-600 text-xs sm:text-base">Пн-Чт 11:00-22:00, Пт-Сб 11:00-23:00, Вс 11:00-22:00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2">
              <h3 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 font-heading">Заказать доставку</h3>
              <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-custom">
                <div className="text-center mb-6">
                  <div className="bg-brand-yellow text-brand-black w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-comments text-3xl sm:text-4xl"></i>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold mb-2">Заказ через чат</h4>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Добавьте товары в корзину, отправьте её через чат администратору, и мы оформим ваш заказ!
                  </p>
                </div>
                
                <button
                  onClick={handleOpenChat}
                  className="w-full bg-brand-yellow text-brand-black py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-yellow-500 transition-colors hover-lift cursor-pointer active:scale-95"
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  Перейти в чат
                </button>
                
                <p className="text-xs sm:text-sm text-gray-500 text-center mt-4">
                  Чат расположен в правом нижнем углу экрана
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

