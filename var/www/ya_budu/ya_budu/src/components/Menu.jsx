import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, IMAGE_BASE_URL, WS_URL } from '../config';

// WebSocket for category updates
let ws = null;

// Helper function for image URL
const getImageUrl = (imageUrl, productName = '') => {
  if (!imageUrl) {
    const encodedName = encodeURIComponent(productName || 'Нет фото');
    const bgColor = '2d3748';
    const textColor = 'fbd38d';
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23${bgColor}" width="400" height="300"/><text fill="%23${textColor}" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em">${encodedName}</text><text fill="%23${textColor}" font-family="Arial" font-size="14" x="50%25" y="65%25" text-anchor="middle" opacity="0.7">No photo</text></svg>`)}`;
  }
  // Извлекаем относительный путь из полного URL если сохранён с доменом
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Пытаемся извлечь путь из полного URL
    const match = imageUrl.match(/(\/uploads\/.*)$/);
    if (match) {
      imageUrl = match[1];
    } else {
      // Если не можем извлечь - возвращаем placeholder
      const encodedName = encodeURIComponent(productName || 'Нет фото');
      const bgColor = '2d3748';
      const textColor = 'fbd38d';
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23${bgColor}" width="400" height="300"/><text fill="%23${textColor}" font-family="Arial" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">${encodedName}</text><text fill="%23${textColor}" font-family="Arial" font-size="14" x="50%" y="65%" text-anchor="middle" opacity="0.7">No photo</text></svg>`)}`;
    }
  }
  const cleanPath = imageUrl.replace(/^\/uploads\//, '').replace(/^\/+/, '');
  return `${IMAGE_BASE_URL}${cleanPath}`;
};

// Toast component
const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
      {message}
    </div>
  );
};

const Menu = () => {
  const { addItem } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Cache for sizes, addons and size-addons
  const [productOptions, setProductOptions] = useState({});
  // Selected options for each product
  const [selectedOptions, setSelectedOptions] = useState({});
  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});
  // Modal selected product
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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
        
        setMenuItems(productsData);
        
        // Fallback: если категории пустые, создаём их из товаров
        let finalCategories = categoriesData;
        if (!categoriesData || categoriesData.length === 0) {
          // Извлекаем уникальные категории из товаров
          const uniqueCategories = [...new Set(productsData.map(p => p.category_name).filter(Boolean))];
          finalCategories = uniqueCategories.map((name, index) => ({
            id: name, // используем имя как id для фильтрации
            name: name,
            sort_order: index
          }));
          console.log('[Menu] Fallback: категории созданы из товаров:', finalCategories);
        }
        
        setCategories(finalCategories);
        setFeaturedProducts(featuredData || []);
        
        const optionsCache = {};
        const sizeAddonsData = optionsData.size_addons || {};
        
        // Обрабатываем ВСЕ товары из основного меню
        for (const product of productsData) {
          const sizes = optionsData.sizes[product.id] || [];
          const addons = optionsData.addons[product.id] || [];
          
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
            const sizes = optionsData.sizes[product.id] || [];
            const addons = optionsData.addons[product.id] || [];
            
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
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // WebSocket for category updates
  useEffect(() => {
    const connectWebSocket = () => {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected for category updates');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'categories_reordered') {
            console.log('Category order update received:', data.categories);
            setCategories(data.categories);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
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
    
    setToast({ show: true, message: `${product.name} добавлено в корзину!` });
  };

  const getProductFinalPrice = (product) => {
    const options = selectedOptions[product.id] || { size: null, addons: [], sizeAddons: [] };
    
    // Используем parseFloat для преобразования строки в число
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

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category_id == activeCategory || item.category_name === activeCategory);

  return (
    <div className="py-16 bg-white">
      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: '' })} />
      
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-4 font-heading">
          Наше <span className="text-brand-yellow">меню</span>
        </h1>
        <p className="text-xl text-center text-gray-600 mb-16">
          Выберите из нашего разнообразного меню вкусных блюд
        </p>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8 font-heading">
              <span className="text-brand-yellow">★</span> Рекомендуем <span className="text-brand-yellow">★</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((item) => {
                const options = productOptions[item.id] || { sizes: [], addons: [] };
                const selected = selectedOptions[item.id] || { size: null, addons: [], sizeAddons: [] };
                const finalPrice = getProductFinalPrice(item);
                const hasSizeError = validationErrors[item.id]?.size;
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-gradient-to-br from-yellow-900/50 to-gray-800 rounded-3xl overflow-hidden shadow-custom-lg hover-lift cursor-pointer border-2 border-yellow-500/50"
                    onClick={() => setSelectedProduct(item)}
                  >
                    <div className="h-40 overflow-hidden relative">
                      <img src={getImageUrl(item.image_url, item.name)} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                        ★ Рекомендуем
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold font-heading text-white mb-2">{item.name}</h3>
                      <p className="text-gray-300 mb-3 text-sm">{item.description}</p>
                      
                      {/* Sizes for featured products */}
                      {options.sizes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">Размер:</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {options.sizes.map(size => {
                              const isSelected = selected.size?.id === size.id;
                              return (
                                <button
                                  key={size.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSizeSelect(item.id, size);
                                  }}
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
                          
                          {/* Size-addons button for featured */}
                          {selected.size && (() => {
                            const sizeAddons = selected.size?.addons || [];
                            const currentAddon = selected.sizeAddons?.[0];
                            const hasAddons = sizeAddons.length > 0;
                            
                            if (!hasAddons) return null;
                            
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentAddon) {
                                    handleSizeAddonToggle(item.id, currentAddon);
                                  } else {
                                    handleSizeAddonToggle(item.id, sizeAddons[0]);
                                  }
                                }}
                                className={`w-full px-2 py-1 text-xs rounded-lg border transition-colors ${
                                  currentAddon
                                    ? 'bg-green-600 text-white border-green-500'
                                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-green-500'
                                }`}
                              >
                                {currentAddon 
                                  ? `OK ${currentAddon.name} (+${currentAddon.price_modifier || currentAddon.price || 0} P)`
                                  : `+ ${sizeAddons.map(a => a.name).join(', ')}`
                                }
                              </button>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Addons for featured products */}
                      {options.addons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">Допы:</p>
                          <div className="flex flex-wrap gap-1">
                            {options.addons.map(addon => {
                              const isSelected = (selected.addons || []).some(a => a.id === addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddonToggle(item.id, addon);
                                  }}
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
                      
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-brand-yellow text-2xl font-bold">{finalPrice} P</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          className="bg-brand-yellow text-brand-black px-4 py-2 rounded-full font-bold hover:bg-yellow-500 transition-colors"
                        >
                          В корзину
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-6 py-3 rounded-full font-bold transition-colors ${
              activeCategory === 'all' 
                ? 'bg-brand-yellow text-brand-black' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-full font-bold transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-brand-yellow text-brand-black' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-xl">Загрузка меню...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => {
              const options = productOptions[item.id] || { sizes: [], addons: [] };
              const selected = selectedOptions[item.id] || { size: null, addons: [] };
              const finalPrice = getProductFinalPrice(item);
              const hasSizeError = validationErrors[item.id]?.size;
              
              return (
                <div key={item.id} className="bg-gray-800 rounded-3xl overflow-hidden shadow-custom-lg hover-lift cursor-pointer" onClick={() => setSelectedProduct(item)}>
                  <div className="h-48 overflow-hidden">
                    <img src={getImageUrl(item.image_url, item.name)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-2xl font-bold font-heading text-white">{item.name}</h3>
                      <span className="text-brand-yellow text-2xl font-bold">{finalPrice} P</span>
                    </div>
                    <p className="text-gray-300 mb-4 text-sm">{item.description}</p>
                    
                    {/* Sizes */}
                    {options.sizes.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-2">Размеры:</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {options.sizes.map(size => {
                            const isSelected = selected.size?.id === size.id;
                            return (
                              <button
                                key={size.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSizeSelect(item.id, size);
                                }}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
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
                        
                        {/* Size-addons button */}
                        {selected.size && (() => {
                          const sizeAddons = selected.size?.addons || [];
                          const currentAddon = selected.sizeAddons?.[0];
                          const hasAddons = sizeAddons.length > 0;
                          
                          if (!hasAddons) return null;
                          
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentAddon) {
                                  handleSizeAddonToggle(item.id, currentAddon);
                                } else {
                                  handleSizeAddonToggle(item.id, sizeAddons[0]);
                                }
                              }}
                              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                                currentAddon
                                  ? 'bg-green-600 text-white border-green-500'
                                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-green-500'
                              }`}
                            >
                              {currentAddon 
                                ? `OK ${currentAddon.name} (+${currentAddon.price_modifier || currentAddon.price || 0} P)`
                                : `+ ${sizeAddons.map(a => a.name).join(', ')}`
                              }
                            </button>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Addons */}
                    {options.addons.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-2">Добавки:</p>
                        <div className="flex flex-wrap gap-1">
                          {options.addons.map(addon => {
                            const isSelected = (selected.addons || []).some(a => a.id === addon.id);
                            return (
                              <button
                                key={addon.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddonToggle(item.id, addon);
                                }}
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                      className="w-full bg-brand-yellow text-brand-black py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors"
                    >
                      Добавить к заказу
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product modal */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="h-64 overflow-hidden relative">
              <img 
                src={getImageUrl(selectedProduct.image_url, selectedProduct.name)} 
                alt={selectedProduct.name} 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                Закрыть
              </button>
            </div>
            
            {/* Product info */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-bold font-heading text-white">{selectedProduct.name}</h2>
              </div>
              
              {/* Description */}
              {selectedProduct.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">Описание</h3>
                  <p className="text-gray-300">{selectedProduct.description}</p>
                </div>
              )}
              
              {/* Category */}
              {selectedProduct.category_name && (
                <div className="mb-4">
                  <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {selectedProduct.category_name}
                  </span>
                </div>
              )}
              
              {/* Sizes - INTERACTIVE selection */}
              {productOptions[selectedProduct.id]?.sizes?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2">Размеры</h3>
                  <div className="flex flex-wrap gap-2">
                    {productOptions[selectedProduct.id].sizes.map(size => {
                      const selected = selectedOptions[selectedProduct.id];
                      const isSelected = selected?.size?.id === size.id;
                      return (
                        <button
                          key={size.id}
                          onClick={() => handleSizeSelect(selectedProduct.id, size)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-brand-yellow text-brand-black'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          <span className="font-bold">{size.name}</span>
                          {size.price_modifier > 0 && (
                            <span className={`ml-2 ${isSelected ? 'text-brand-black' : 'text-brand-yellow'}`}>+{size.price_modifier} P</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Size-addons in modal */}
                  {selectedOptions[selectedProduct.id]?.size?.addons?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-2">Добавки для выбранного размера:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOptions[selectedProduct.id].size.addons.map(addon => {
                          const selected = selectedOptions[selectedProduct.id];
                          const isSelected = (selected?.sizeAddons || []).some(a => a.id === addon.id);
                          return (
                            <button
                              key={addon.id}
                              onClick={() => handleSizeAddonToggle(selectedProduct.id, addon)}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {addon.name} (+{addon.price_modifier || addon.price || 0} P)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Addons - INTERACTIVE selection */}
              {productOptions[selectedProduct.id]?.addons?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">Добавки</h3>
                  <div className="flex flex-wrap gap-2">
                    {productOptions[selectedProduct.id].addons.map(addon => {
                      const selected = selectedOptions[selectedProduct.id];
                      const isSelected = (selected?.addons || []).some(a => a.id === addon.id);
                      return (
                        <button
                          key={addon.id}
                          onClick={() => handleAddonToggle(selectedProduct.id, addon)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-brand-yellow text-brand-black'
                              : 'bg-gray-700 text-white hover:bg-gray-600'
                          }`}
                        >
                          <span>{addon.name}</span>
                          <span className={`ml-2 ${isSelected ? 'text-brand-black' : 'text-brand-yellow'}`}>+{addon.price} P</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Dynamic price display */}
              <div className="mb-4">
                <span className="text-lg text-gray-400">Цена: </span>
                <span className="text-2xl font-bold text-brand-yellow">{getProductFinalPrice(selectedProduct)} P</span>
              </div>
              
              {/* Add to cart button */}
              <button
                onClick={() => {
                  handleAddToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="w-full bg-brand-yellow text-brand-black py-4 rounded-full font-bold hover:bg-yellow-500 transition-colors text-lg"
              >
                Добавить к заказу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
