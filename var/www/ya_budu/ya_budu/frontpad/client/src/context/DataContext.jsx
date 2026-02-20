import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// API URL - относительный путь для работы через nginx
const FRONTPAD_API = '';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  // Централизованное состояние
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [addonTemplates, setAddonTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  
  // Время жизни кэша в миллисекундах (5 минут)
  const CACHE_TTL = 5 * 60 * 1000;
  
  // Ключи для localStorage
  const CACHE_KEYS = {
    products: 'younitipad_products_cache',
    categories: 'younitipad_categories_cache',
    addonTemplates: 'younitipad_addon_templates_cache',
    lastFetch: 'younitipad_last_fetch'
  };

  // Валидация данных - фильтруем записи без id или с мусорными данными
  const validateProducts = (data) => {
    if (!Array.isArray(data)) {
      console.warn('[DataContext] Products data is not an array:', typeof data);
      return [];
    }
    const valid = data.filter(p => {
      // Проверяем что это объект с валидным id
      if (!p || typeof p !== 'object') {
        console.warn('[DataContext] Skipping non-object product:', p);
        return false;
      }
      if (!p.id || (typeof p.id !== 'number' && typeof p.id !== 'string')) {
        console.warn('[DataContext] Skipping product without valid id:', p.id);
        return false;
      }
      // Проверяем что id не похож на HTML тег
      const idStr = String(p.id);
      if (idStr.startsWith('<') || idStr.startsWith('JavaScript:')) {
        console.warn('[DataContext] Skipping product with suspicious id:', p.id);
        return false;
      }
      return true;
    });
    console.log('[DataContext] Valid products:', valid.length, 'from', data.length);
    return valid;
  };

  // Очистка кэша
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEYS.products);
    localStorage.removeItem(CACHE_KEYS.categories);
    localStorage.removeItem(CACHE_KEYS.addonTemplates);
    localStorage.removeItem(CACHE_KEYS.lastFetch);
    setLastFetch(0);
    console.log('[DataContext] Cache cleared');
  }, []);

  // Загрузка из localStorage
  const loadFromCache = useCallback(() => {
    try {
      const cachedProducts = localStorage.getItem(CACHE_KEYS.products);
      const cachedCategories = localStorage.getItem(CACHE_KEYS.categories);
      const cachedAddonTemplates = localStorage.getItem(CACHE_KEYS.addonTemplates);
      const cachedLastFetch = localStorage.getItem(CACHE_KEYS.lastFetch);
      
      if (cachedProducts && cachedCategories) {
        const products = JSON.parse(cachedProducts);
        const categories = JSON.parse(cachedCategories);
        
        // Валидируем товары из кэша
        const validProducts = validateProducts(products);
        
        // Если кэш повреждён - очищаем его
        if (validProducts.length !== products.length) {
          console.warn('[DataContext] Cache corrupted, clearing...');
          clearCache();
          return false;
        }
        
        setProducts(validProducts);
        setCategories(categories);
        if (cachedAddonTemplates) {
          setAddonTemplates(JSON.parse(cachedAddonTemplates));
        }
        if (cachedLastFetch) {
          setLastFetch(parseInt(cachedLastFetch, 10));
        }
        return true;
      }
    } catch (e) {
      console.error('Error loading cache:', e);
      // Очищаем повреждённый кэш
      clearCache();
    }
    return false;
  }, [clearCache]);

  // Сохранение в localStorage
  const saveToCache = useCallback((productsData, categoriesData, addonTemplatesData) => {
    try {
      const now = Date.now();
      localStorage.setItem(CACHE_KEYS.products, JSON.stringify(productsData));
      localStorage.setItem(CACHE_KEYS.categories, JSON.stringify(categoriesData));
      if (addonTemplatesData) {
        localStorage.setItem(CACHE_KEYS.addonTemplates, JSON.stringify(addonTemplatesData));
      }
      localStorage.setItem(CACHE_KEYS.lastFetch, now.toString());
      setLastFetch(now);
    } catch (e) {
      console.error('Error saving cache:', e);
    }
  }, []);

  // Загрузка данных с сервера
  const fetchData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Проверяем, нужно ли обновлять данные
    if (!forceRefresh && lastFetch && (now - lastFetch) < CACHE_TTL) {
      console.log('[DataContext] Using cached data, cache is fresh');
      return;
    }
    
    // Если уже загружено и не нужен принудительный рефреш - выходим
    if (!forceRefresh && products.length > 0 && categories.length > 0) {
      console.log('[DataContext] Data already loaded');
      return;
    }
    
    setLoading(true);
    console.log('[DataContext] Fetching data from server...');
    
    try {
      // Параллельная загрузка всех данных
      const [productsRes, categoriesRes, addonTemplatesRes] = await Promise.all([
        axios.get(`${FRONTPAD_API}/api/products`),
        axios.get(`${FRONTPAD_API}/api/categories`),
        axios.get(`${FRONTPAD_API}/api/addon-templates`).catch(() => ({ data: [] }))
      ]);
      
      const productsData = validateProducts(productsRes.data || []);
      const categoriesData = categoriesRes.data || [];
      const addonTemplatesData = addonTemplatesRes.data || [];
      
      setProducts(productsData);
      setCategories(categoriesData);
      setAddonTemplates(addonTemplatesData);
      
      // Сохраняем в кэш
      saveToCache(productsData, categoriesData, addonTemplatesData);
      
      console.log('[DataContext] Data loaded:', {
        products: productsData.length,
        categories: categoriesData.length,
        addonTemplates: addonTemplatesData.length
      });
    } catch (error) {
      console.error('[DataContext] Error fetching data:', error);
      // ВСЕГДА сбрасываем loading в false при ошибке!
      // Иначе интерфейс зависает в состоянии загрузки
      setLoading(false);
      
      // Если есть кэш - пробуем использовать его как запасной вариант
      const hasCache = loadFromCache();
      if (!hasCache) {
        // Если нет кэша - пробуем загрузить пустые данные
        setProducts([]);
        setCategories([]);
        setAddonTemplates([]);
      }
    } finally {
      // Всегда сбрасываем loading в false после завершения
      setLoading(false);
    }
  }, [lastFetch, products.length, categories.length, saveToCache, loadFromCache]);

  // Принудительное обновление товаров
  const refreshProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/products`);
      const productsData = validateProducts(response.data || []);
      setProducts(productsData);
      localStorage.setItem(CACHE_KEYS.products, JSON.stringify(productsData));
      console.log('[DataContext] Products refreshed:', productsData.length);
    } catch (error) {
      console.error('[DataContext] Error refreshing products:', error);
    }
  }, []);

  // Принудительное обновление категорий
  const refreshCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/categories`);
      const categoriesData = response.data || [];
      setCategories(categoriesData);
      localStorage.setItem(CACHE_KEYS.categories, JSON.stringify(categoriesData));
      console.log('[DataContext] Categories refreshed:', categoriesData.length);
    } catch (error) {
      console.error('[DataContext] Error refreshing categories:', error);
    }
  }, []);

  // Обновление одного товара в кэше
  const updateProductInCache = useCallback((productId, updates) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, ...updates } : p);
      localStorage.setItem(CACHE_KEYS.products, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Добавление товара в кэш
  const addProductToCache = useCallback((product) => {
    setProducts(prev => {
      const updated = [...prev, product];
      localStorage.setItem(CACHE_KEYS.products, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Удаление товара из кэша
  const removeProductFromCache = useCallback((productId) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== productId);
      localStorage.setItem(CACHE_KEYS.products, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    // Сначала пробуем загрузить из кэша
    const hasCache = loadFromCache();
    
    if (hasCache) {
      setLoading(false);
      // Проверяем актуальность кэша в фоне
      const now = Date.now();
      if (lastFetch && (now - lastFetch) < CACHE_TTL) {
        console.log('[DataContext] Cache is fresh, skipping server fetch');
        return;
      }
    }
    
    // Загружаем данные с сервера
    fetchData(true);
  }, []);

  // Предоставляем данные и методы через контекст
  const value = {
    // Данные
    products,
    categories,
    addonTemplates,
    loading,
    
    // Методы обновления
    fetchData,
    refreshProducts,
    refreshCategories,
    clearCache,
    
    // Методы для работы с товарами
    updateProductInCache,
    addProductToCache,
    removeProductFromCache,
    
    // Утилиты
    getProductById: (id) => products.find(p => p.id === id),
    getCategoryById: (id) => categories.find(c => c.id === id),
    getProductsByCategory: (categoryId) => products.filter(p => p.category_id === categoryId),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Хук для использования контекста
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
