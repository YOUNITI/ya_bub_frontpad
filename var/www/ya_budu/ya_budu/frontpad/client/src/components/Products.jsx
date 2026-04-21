import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, X, Search, Download, Upload, FileSpreadsheet, FolderPlus, ChevronDown, ChevronUp, Folder, AlertCircle, CheckCircle, Camera, GripVertical, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useData } from '../context/DataContext';

// Стили для анимации загрузки
const styles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
`;

// Добавляем стили в документ
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Используем относительный путь для работы через nginx
const API_URL = process.env.REACT_APP_FONTPAD_API || '';
// Локальный сервер для операций с размерами и допами - используем полный URL
const LOCAL_API_BASE = 'http://localhost:3001';
console.log('[INIT] LOCAL_API_BASE:', LOCAL_API_BASE);
const IMAGE_BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || '';

// Создаём axios инстанс с таймаутом
const apiClient = axios.create({
  timeout: 30000 // 30 секунд timeout
});

const Products = () => {
  // Используем DataContext для товаров, категорий и допов (централизованное кэширование)
  const {
    products,
    categories,
    addonTemplates,
    loading,
    refreshProducts,
    clearCache,
    fetchData
  } = useData();
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [localProducts, setLocalProducts] = useState([]);
  
  // Используем useRef для хранения стабильной ссылки на localProducts
  // Это нужно для handleProductsDragEnd чтобы избежать проблем с замыканиями
  const localProductsRef = useRef([]);
  localProductsRef.current = localProducts;
  
  // Обновляем localProducts при изменении products, сохраняя порядок
  useEffect(() => {
    if (!loading && products.length > 0 && !isSubmitting) {
      console.log('[useEffect] products changed:', products.length, 'items, localProducts:', localProducts.length);
      setLocalProducts(prev => {
        // Если prev пустой или products изменился существенно - обновляем
        if (prev.length === 0 || Math.abs(prev.length - products.length) > 2) {
          console.log('[useEffect] Resetting localProducts to products');
          return [...products];
        }
        // Иначе сохраняем текущий порядок (для drag-and-drop)
        console.log('[useEffect] Keeping localProducts order');
        return prev;
      });
    }
  }, [products, loading, isSubmitting]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_active: 1,
    is_featured: 0
  });
  
  // Состояния для комбо
  const [isCombo, setIsCombo] = useState(false);
  const [comboItems, setComboItems] = useState([]);
  const [comboSearch, setComboSearch] = useState('');
  
  // Состояние для выбора размера при добавлении товара в комбо
  const [comboProductSizes, setComboProductSizes] = useState({}); // { productId: [sizes...] }
  const [showSizeSelectModal, setShowSizeSelectModal] = useState(false);
  const [selectedProductForCombo, setSelectedProductForCombo] = useState(null);
  
  // Состояния для размеров
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [newSize, setNewSize] = useState({ name: '', price: '' });
  
  // Состояния для скидок
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discount, setDiscount] = useState({
    type: 'percent',
    value: '',
    valid_from: '',
    valid_to: ''
  });
  
  // Состояния для допов
  const [hasAddons, setHasAddons] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [newAddon, setNewAddon] = useState({ addon_template_id: '', custom_price: '' });
  
  // Состояния для допов размеров
  const [sizeAddons, setSizeAddons] = useState({}); // { sizeId: [addonIds...] }
  const [selectedSizeForAddons, setSelectedSizeForAddons] = useState(null);
  const [availableSizeAddons, setAvailableSizeAddons] = useState([]);

  // Состояния для модалки выбора допа размера
  const [showAddonSelectModal, setShowAddonSelectModal] = useState(false);
  const [selectedAddonTemplate, setSelectedAddonTemplate] = useState(null);
  const [addonPriceModifier, setAddonPriceModifier] = useState(0);
  const [addonIsRequired, setAddonIsRequired] = useState(false);

  // Состояния для загрузки изображения
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  // При монтировании компонента данные уже доступны из контекста
  useEffect(() => {
    // Ничего не делаем - DataContext уже загрузил данные
  }, []);

  // Функция загрузки изображения
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data && response.data.url) {
        setFormData({ ...formData, image_url: response.data.filename || response.data.url });
        setImagePreview(response.data.url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploadingImage(false);
    }
  };

  // Обработчик выбора файла
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Показываем превью
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      // Загружаем на сервер
      handleImageUpload(file);
    }
  };

  // Удаление изображения
  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
    // Сбрасываем input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalProductData, setOriginalProductData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    alert('🧪 ТЕСТ: Новая версия кода загружена! LOCAL_API_BASE = ' + LOCAL_API_BASE + '\nВремя: ' + new Date().toISOString());

    if (isSubmitting) return; // ✅ Защита от двойной отправки
    setIsSubmitting(true);
    
    // ✅ ФИКС: Сохраняем оригинальные данные товара перед сохранением
    setOriginalProductData({...editingProduct});
    
    // Если это комбо - нужны items
    if (isCombo && comboItems.length === 0) {
        alert('Добавьте товары в комбо');
        setIsSubmitting(false);
        return;
    }
    
    // Если есть размеры - нужен хотя бы один размер
    if (hasSizes && sizes.length === 0) {
        alert('Добавьте хотя бы один размер');
        setIsSubmitting(false);
        return;
    }
    
    try {
        let productId = editingProduct?.id;
        
        // ✅ ФИКС ОШИБКИ: Сначала удаляем ВСЕ допы для размеров перед сохранением товара
        if (editingProduct) {
            try {
                const sizesRes = await axios.get(`/api/products/${productId}/sizes`);
                const sizesToClean = sizesRes.data || [];
                for (const size of sizesToClean) {
                    try {
                        await axios.delete(`/api/products/${productId}/sizes/${size.id}/addons`);
                    } catch (e) {}
                }
                // Ждём 1 секунду чтобы всё очистилось
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {}
        }
        
        // Подготовка данных товара
        const productData = {
            ...formData,
            is_combo: isCombo,
            combo_items: comboItems,
            price: (formData.price !== undefined && formData.price !== '' && !isNaN(parseFloat(formData.price)))
                ? parseFloat(formData.price)
                : (editingProduct?.price || 0)
        };
        
        // Если есть размеры и это НОВЫЙ товар, не отправляем цену (возьмётся из первого размера)
        if (hasSizes && !editingProduct) {
            delete productData.price;
        }
        
        // ✅ ФИНАЛЬНЫЙ ФИКС: сначала сохраняем все размеры и допы, ТОЛЬКО ПОТОМ обновляем товар!
        if (!editingProduct) {
            const response = await axios.post(`${API_URL}/api/products`, productData);
            productId = response.data.id;
        } else {
            productId = editingProduct.id;
        }
        
        // ✅ НОРМАЛЬНЫЙ ПОРЯДОК СОХРАНЕНИЯ (теперь работает правильно!)
        let newSizesLocal = [...sizes];
        let newSizeAddonsLocal = {...sizeAddons};
        
        // 1. Сохраняем размеры
        if (hasSizes && productId) {
            // Получаем текущие размеры с сервера
            const existingSizesRes = await axios.get(`/api/products/${productId}/sizes`);
            const existingSizes = existingSizesRes.data || [];
            
            // Создаём карту существующих размеров по названию
            const existingSizeMap = {};
            existingSizes.forEach(s => existingSizeMap[s.name.trim().toLowerCase()] = s);
            
            const sizeIdMap = {};
            
            for (let i = 0; i < sizes.length; i++) {
                const size = sizes[i];
                const sizeKey = size.name.trim().toLowerCase();
                
                if (existingSizeMap[sizeKey]) {
                    // Размер уже существует - обновляем цену
                    await axios.put(`/api/sizes/${existingSizeMap[sizeKey].id}`, {
                        name: size.name,
                        price_modifier: size.price
                    });
                    newSizesLocal[i] = {
                        ...size,
                        id: existingSizeMap[sizeKey].id
                    };
                    sizeIdMap[size.id] = existingSizeMap[sizeKey].id;
                } else {
                    // Новый размер - создаём
                    const response = await axios.post(`/api/products/${productId}/sizes`, {
                        name: size.name,
                        size_value: size.name,
                        price_modifier: size.price
                    });
                    newSizesLocal[i] = {
                        ...size,
                        id: response.data.id
                    };
                    sizeIdMap[size.id] = response.data.id;
                }
            }
            
            // Обновляем ID размеров в sizeAddons
            Object.entries(sizeAddons).forEach(([oldSizeId, addons]) => {
                const newSizeId = sizeIdMap[oldSizeId];
                if (newSizeId) {
                    newSizeAddonsLocal[newSizeId] = addons;
                }
            });
            
            setSizes(newSizesLocal);
            setSizeAddons(newSizeAddonsLocal);
        }
        
        // 2. Обновляем товар
        if (editingProduct) {
            // Очищаем combo_items от лишних полей
            let comboItemsToSend = [];
            if (isCombo && comboItems.length > 0) {
                comboItemsToSend = comboItems.map(item => ({
                    product_id: item.product_id,
                    product_price: item.product_price || 0,
                    quantity: item.quantity || 1,
                    size_id: item.size_id || null,
                    size_name: item.size_name || null
                }));
            } else if (editingProduct?.combo_items) {
                try {
                    comboItemsToSend = typeof editingProduct.combo_items === 'string'
                        ? JSON.parse(editingProduct.combo_items)
                        : (Array.isArray(editingProduct.combo_items) ? editingProduct.combo_items : []);
                } catch (e) {
                    comboItemsToSend = [];
                }
            }
            
            const cleanProductData = {
                ...productData,
                is_combo: isCombo,
                combo_items: isCombo ? comboItemsToSend : []
            };
            
            await axios.put(`${API_URL}/api/products/${editingProduct.id}`, cleanProductData);
        }
        
        // 3. Сохраняем допы для размеров
        if (editingProduct && hasSizes && productId) {
            for (const size of newSizesLocal) {
                const sizeAddonList = newSizeAddonsLocal[size.id] || [];
                if (sizeAddonList.length > 0) {
                    try {
                        // Используем новый endpoint через локальный сервер с проверкой размера
                        const addonUrl = `${LOCAL_API_BASE}/api/products/${productId}/sizes/${size.id}/addons?t=${Date.now()}&v=${Math.random()}`;
                        console.log('[CLIENT] Отправка допов на локальный сервер:', addonUrl, sizeAddonList);
                        console.log('[CLIENT] LOCAL_API_BASE:', LOCAL_API_BASE);
                        console.log('[CLIENT] productId:', productId, 'sizeId:', size.id);

                        try {
                            const response = await axios.post(addonUrl, sizeAddonList, {
                                headers: {
                                    'Cache-Control': 'no-cache',
                                    'Pragma': 'no-cache'
                                }
                            });
                            console.log('[CLIENT] Ответ от сервера:', response.status, response.data);
                        } catch (error) {
                            console.error('[CLIENT] Ошибка запроса:', error.message);
                            console.error('[CLIENT] URL:', addonUrl);
                            console.error('[CLIENT] Данные:', sizeAddonList);
                        }
                        console.log('[CLIENT] Допы отправлены успешно');
                    } catch (e) {
                        console.error('Ошибка сохранения допа размера:', e.message);
                    }
                }
            }
        }
        
        // Сохраняем скидку на товар
        if (hasDiscount && productId) {
            await axios.delete(`${API_URL}/api/products/${productId}/discounts`);
            if (discount.value) {
                await axios.post(`${API_URL}/api/products/${productId}/discounts`, {
                    name: `Скидка на ${formData.name}`,
                    type: discount.type,
                    value: parseFloat(discount.value),
                    valid_from: discount.valid_from || null,
                    valid_to: discount.valid_to || null,
                    is_active: 1
                });
            }
        } else if (productId) {
            await axios.delete(`${API_URL}/api/products/${productId}/discounts`);
        }
        
        // Сохраняем допы
        if (hasAddons && productId) {
            await axios.delete(`${API_URL}/api/products/${productId}/addons`);
            for (const addon of selectedAddons) {
                await axios.post(`${API_URL}/api/products/${productId}/addons`, {
                    addon_template_id: addon.addon_template_id,
                    custom_price: addon.custom_price || null
                });
            }
        } else if (productId) {
            await axios.delete(`${API_URL}/api/products/${productId}/addons`);
        }
        

        
        // ✅ ЗАКРЫВАЕМ МОДАЛКУ И СБРАСЫВАЕМ ФОРМУ
        setShowModal(false);
        setEditingProduct(null);
        resetForm();
        setOriginalProductData(null);
        
        // ✅ ПЕРЕЗАГРУЖАЕМ ДАННЫЕ ТОВАРА ДЛЯ АКТУАЛЬНОГО STATE
        if (editingProduct?.id) {
            setTimeout(async () => {
                try {
                    const res = await axios.get(`${API_URL}/api/products/${editingProduct.id}`);
                    // Обновляем в локальном state если нужно
                    setLocalProducts(prev => prev.map(p => 
                        p.id === editingProduct.id ? { ...p, ...res.data } : p
                    ));
                } catch (e) {
                    console.error('Error reloading product:', e);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        if (error.response?.data?.error) {
            alert(error.response.data.error);
        } else {
            alert('Ошибка при сохранении товара');
        }
    } finally {
        setIsSubmitting(false); // ✅ Сбрасываем флаг в любом случае
    }
};

  const handleEdit = async (product) => {
    console.log('[handleEdit] API_URL:', API_URL);
    console.log('[handleEdit] Начало загрузки товара:', product.id, product.name);
    console.log('[handleEdit] is_combo из продукта:', product.is_combo, typeof product.is_combo);
    console.log('[handleEdit] combo_items из продукта:', product.combo_items);
    
    // Инициализируем comboItems как массив
    let parsedComboItems = [];
    if (product.combo_items) {
      try {
        const rawItems = typeof product.combo_items === 'string' 
          ? JSON.parse(product.combo_items) 
          : (Array.isArray(product.combo_items) ? product.combo_items : []);
        // Фильтруем только записи с реальным product_id
        parsedComboItems = rawItems.filter(item => item && item.product_id);
      } catch (e) {
        parsedComboItems = [];
      }
    }
    setComboItems(parsedComboItems);
    
    // Устанавливаем isCombo - преобразуем к числу для надёжности
    const isComboValue = product.is_combo === 1 || product.is_combo === '1' || product.is_combo === true;
    console.log('[handleEdit] Установка isCombo:', isComboValue);
    setIsCombo(isComboValue);
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price !== undefined ? Number(product.price) : '',
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_active: product.is_active !== undefined ? product.is_active : 1,
      is_featured: product.is_featured !== undefined ? product.is_featured : 0
    });
    
    // Загружаем изображение для превью если есть (сохраняем в localStorage для кэша)
    if (product.image_url) {
      const previewUrl = getImageUrl(product.image_url);
      setImagePreview(previewUrl);
      // Кэшируем URL изображения
      try {
        localStorage.setItem(`product_image_${product.id}`, previewUrl);
      } catch (e) {
        // localStorage может быть недоступен
      }
    } else {
      setImagePreview(null);
    }
    
    // Сбрасываем input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    
    // combo_items уже загружены выше (строки 402-412)
    
    // Загружаем размеры
    try {
      const sizesRes = await axios.get(`${API_URL}/api/products/${product.id}/sizes`);
      // Проверяем, что ответ содержит данные
      const sizesData = sizesRes.data || [];
      setSizes(Array.isArray(sizesData) ? sizesData : []);
      setHasSizes(Array.isArray(sizesData) && sizesData.length > 0);
    } catch (error) {
      // Если сервер вернул 404 - значит размеров нет, это нормально
      if (error.response?.status === 404) {
        setSizes([]);
        setHasSizes(false);
      } else {
        setSizes([]);
        setHasSizes(false);
        console.error('Ошибка загрузки размеров:', error.message);
      }
    }
    
    // Загружаем скидки
    try {
      const discountsRes = await axios.get(`${API_URL}/api/products/${product.id}/discounts`);
      console.log('[handleEdit] Скидки загружены:', discountsRes.data);
      const activeDiscount = discountsRes.data?.find(d => d.is_active === 1);
      if (activeDiscount) {
        setHasDiscount(true);
        setDiscount({
          type: activeDiscount.type || 'percent',
          value: activeDiscount.value || '',
          valid_from: activeDiscount.valid_from || '',
          valid_to: activeDiscount.valid_to || ''
        });
      } else {
        setHasDiscount(false);
        setDiscount({ type: 'percent', value: '', valid_from: '', valid_to: '' });
      }
    } catch (error) {
      console.log('[handleEdit] Ошибка загрузки скидок:', error.message);
      setHasDiscount(false);
      setDiscount({ type: 'percent', value: '', valid_from: '', valid_to: '' });
    }
    
    // Загружаем допы
    let hasRegularAddons = false;
    try {
      const addonsRes = await axios.get(`${API_URL}/api/products/${product.id}/addons`);
      console.log('[handleEdit] Допы загружены:', addonsRes.data);
      setSelectedAddons(addonsRes.data || []);
      
      // hasAddons = true только если есть обычные допы
      hasRegularAddons = addonsRes.data && addonsRes.data.length > 0;
    } catch (error) {
      setSelectedAddons([]);
    }
    
    // Загружаем допы для размеров
    let hasAnySizeAddons = false;
    try {
      const sizesWithAddonsRes = await axios.get(`${API_URL}/api/products/${product.id}/size-addons`);
      console.log('[handleEdit] Size-addons загружены:', sizesWithAddonsRes.data);
      const sizesWithAddonsObj = sizesWithAddonsRes.data || {};
      
      // Формируем map { sizeId: [addonData...] } - API возвращает объект с ключами как СТРОКИ
      // Преобразуем ключи в числа для совместимости с sizes[i].id
      const sizeAddonsMap = {};
      Object.entries(sizesWithAddonsObj).forEach(([sizeId, sizeData]) => {
        // Преобразуем ключ в число
        const sizeIdNum = parseInt(sizeId);
        if (!isNaN(sizeIdNum)) {
          sizeAddonsMap[sizeIdNum] = sizeData.addons || [];
          if (sizeData.addons && sizeData.addons.length > 0) {
            hasAnySizeAddons = true;
          }
        }
      });
      setSizeAddons(sizeAddonsMap);
    } catch (error) {
      console.log('[handleEdit] Ошибка загрузки size-addons:', error.message, error.response?.data);
      setSizeAddons({});
    }
    
    // Устанавливаем hasAddons: true если есть обычные допы ИЛИ size-addons
    console.log('[handleEdit] Установка hasAddons: hasRegularAddons =', hasRegularAddons, ', hasAnySizeAddons =', hasAnySizeAddons);
    setHasAddons(hasRegularAddons || hasAnySizeAddons);
    
    // Логируем итоговое состояние (используем временные переменные)
    console.log('[handleEdit] Итоговое состояние (из переменных):');
    console.log('  - isComboValue:', isComboValue);
    // Для hasDiscount и hasAddons - они были установлены в async функциях
    // поэтому логируем ниже после установки
    
    setShowModal(true);
    console.log('[handleEdit] Модалка открыта');
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', category_id: '', image_url: '', is_active: 1, is_featured: 0 });
    setIsCombo(false);
    setComboItems([]);
    setComboSearch('');
    setComboProductSizes({});
    setSelectedProductForCombo(null);
    setShowSizeSelectModal(false);
    setHasSizes(false);
    setSizes([]);
    setNewSize({ name: '', price: '' });
    setHasDiscount(false);
    setDiscount({ type: 'percent', value: '', valid_from: '', valid_to: '' });
    setHasAddons(false);
    setSelectedAddons([]);
    setNewAddon({ addon_template_id: '', custom_price: '' });
    setSizeAddons({});
    setSelectedSizeForAddons(null);
    setAvailableSizeAddons([]);
    setImagePreview(null);
    // Сбрасываем input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Функции для размеров
  const addSize = () => {
    if (!newSize.name.trim() || newSize.price === '') return;
    setSizes([...sizes, { ...newSize, id: Date.now(), price: parseFloat(newSize.price) }]);
    setNewSize({ name: '', price: '' });
  };

  const removeSize = (id) => {
    setSizes(sizes.filter(s => s.id !== id));
  };

  // Функции для допов
  const addAddon = () => {
    if (!newAddon.addon_template_id) return;
    const template = addonTemplates.find(t => t.id === parseInt(newAddon.addon_template_id));
    if (!template) return;
    
    // Проверяем не добавлен ли уже этот доп
    if (selectedAddons.find(a => a.addon_template_id === parseInt(newAddon.addon_template_id))) {
      alert('Этот доп уже добавлен');
      return;
    }
    
    setSelectedAddons([...selectedAddons, {
      id: Date.now(),
      addon_template_id: parseInt(newAddon.addon_template_id),
      addon_name: template.name,
      custom_price: newAddon.custom_price || template.default_price
    }]);
    setNewAddon({ addon_template_id: '', custom_price: '' });
  };

  const removeAddon = (id) => {
    setSelectedAddons(selectedAddons.filter(a => a.id !== id));
  };

  const updateAddonPrice = (id, price) => {
    setSelectedAddons(selectedAddons.map(a => 
      a.id === id ? { ...a, custom_price: price } : a
    ));
  };

  // Добавить доп к размеру
  const handleAddAddonToSize = () => {
    if (!selectedAddonTemplate || !selectedSizeForAddons) return;
    
    const addonTemplate = addonTemplates.find(t => t.id === parseInt(selectedAddonTemplate));
    if (!addonTemplate) return;
    
    // Проверяем не добавлен ли уже
    const alreadyAdded = (sizeAddons[selectedSizeForAddons] || []).find(a => a.addon_id === addonTemplate.id);
    if (alreadyAdded) {
      alert('Этот доп уже добавлен к этому размеру');
      setShowAddonSelectModal(false);
      return;
    }
    
    const newSizeAddons = { ...sizeAddons };
    // Обновляем размеры с новым допом
    const updatedSizeAddons = {...sizeAddons};
    if (!updatedSizeAddons[selectedSizeForAddons]) {
      updatedSizeAddons[selectedSizeForAddons] = [];
    }

    updatedSizeAddons[selectedSizeForAddons].push({
      addon_id: addonTemplate.id,
      name: addonTemplate.name,
      price: addonTemplate.default_price || 0,
      price_modifier: parseFloat(addonPriceModifier) || 0,
      is_required: addonIsRequired ? 1 : 0
    });
    
    setSizeAddons(newSizeAddons);
    setShowAddonSelectModal(false);
    setSelectedAddonTemplate(null);
    setAddonPriceModifier(0);
    setAddonIsRequired(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/${id}`);
      
      // Удаляем товар из локального состояния без refreshProducts()
      // чтобы не сбрасывать порядок сортировки
      setLocalProducts(prev => prev.filter(p => p.id !== id));
      
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // URL изображения - используем абсолютный путь для работы через nginx
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // Если это относительный путь - добавляем /uploads если его нет
    if (!imageUrl.startsWith('/')) {
      return '/uploads/' + imageUrl;
    }
    return imageUrl;
  };

  const filteredProducts = localProducts.filter(p => 
    (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Группируем товары по категориям с учётом порядка из localProducts
  // Используем useMemo чтобы избежать пересоздания на каждый рендер
  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach(p => {
      const catId = p.category_id?.toString() || 'none';
      const catName = p.category_name || 'Без категории';
      if (!groups[catId]) {
        groups[catId] = { name: catName, products: [] };
      }
      groups[catId].products.push(p);
    });
    
    // Сортируем товары внутри категорий по позиции в localProducts или по sort_order
    Object.keys(groups).forEach(catId => {
      // Создаём map позиций товаров в localProducts
      const positions = {};
      localProducts.forEach((p, idx) => {
        positions[p.id] = idx;
      });
      
      // Сортируем по позиции в localProducts если товар там есть
      const sortedProducts = [...groups[catId].products].sort((a, b) => {
        const posA = positions[a.id];
        const posB = positions[b.id];
        
        // Если оба товара есть в localProducts - сортируем по позиции
        if (posA !== undefined && posB !== undefined) {
          return posA - posB;
        }
        // Если только один товар в localProducts - он первый
        if (posA !== undefined) return -1;
        if (posB !== undefined) return 1;
        
        // Иначе сортируем по sort_order
        return (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity);
      });
      
      groups[catId].products = sortedProducts;
    });
    
    return groups;
  }, [filteredProducts, localProducts]);

  // Сортируем категории по sort_order из базы
  const sortedCategoryIds = useMemo(() => {
    return Object.keys(groupedProducts).sort((a, b) => {
      const catA = categories.find(c => c.id === parseInt(a) || c.id === a);
      const catB = categories.find(c => c.id === parseInt(b) || c.id === b);
      const orderA = catA?.sort_order ?? 9999;
      const orderB = catB?.sort_order ?? 9999;
      return orderA - orderB;
    });
  }, [groupedProducts, categories]);

  // Обработка drag-and-drop для товаров - используем useCallback и useRef для стабильности
  const handleProductsDragEnd = useCallback(async (result) => {
    if (!result.destination) {
      console.log('[DragEnd] No destination, returning');
      return;
    }
    
    const categoryId = result.source.droppableId;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    console.log('[DragEnd] Starting:', { categoryId, sourceIndex, destIndex });

    // Используем localProductsRef для получения актуальных данных
    const currentProducts = localProductsRef.current;
    console.log('[DragEnd] currentProducts count:', currentProducts.length);
    
    // Фильтруем товары этой категории из текущего списка
    const categoryProducts = currentProducts.filter(p => p.category_id?.toString() === categoryId);
    console.log('[DragEnd] categoryProducts count:', categoryProducts.length);
    
    if (sourceIndex >= categoryProducts.length || destIndex >= categoryProducts.length) {
      console.error('[DragEnd] Invalid index:', { sourceIndex, destIndex, categoryLength: categoryProducts.length });
      return;
    }
    
    // Получаем товар который перемещаем
    const productToMove = categoryProducts[sourceIndex];
    if (!productToMove) {
      console.error('[DragEnd] Product not found at index:', sourceIndex);
      return;
    }
    
    console.log('[DragEnd] Moving product:', productToMove.id, productToMove.name);
    
    // Создаём новый порядок товаров этой категории
    const newCategoryOrder = [...categoryProducts];
    const [movedProduct] = newCategoryOrder.splice(sourceIndex, 1);
    newCategoryOrder.splice(destIndex, 0, movedProduct);
    
    console.log('[DragEnd] New category order:', newCategoryOrder.map((p, i) => `${i}:${p.id}`).join(', '));
    
    // Создаём новый localProducts массив
    // Удаляем все товары этой категории из текущего списка
    const otherProducts = currentProducts.filter(p => p.category_id?.toString() !== categoryId);
    
    // Находим позицию для вставки - сразу после последнего товара этой категории
    // Находим первый товар этой категории в оригинальном массиве
    const firstCatProduct = currentProducts.find(p => p.category_id?.toString() === categoryId);
    const firstCatIndex = otherProducts.findIndex(p => p.id === firstCatProduct?.id);
    
    console.log('[DragEnd] firstCatIndex:', firstCatIndex);
    
    // Вставляем товары категории в правильную позицию
    let newProducts;
    if (firstCatIndex === -1) {
      // Категория не найдена - добавляем в конец
      newProducts = [...otherProducts, ...newCategoryOrder];
      console.log('[DragEnd] Added to end');
    } else {
      // Вставляем в позицию первого товара категории
      newProducts = [
        ...otherProducts.slice(0, firstCatIndex),
        ...newCategoryOrder,
        ...otherProducts.slice(firstCatIndex)
      ];
      console.log('[DragEnd] Inserted at position:', firstCatIndex);
    }
    
    console.log('[DragEnd] Calling setLocalProducts with new order');
    console.log('[DragEnd] newProducts order:', newProducts.map((p, i) => `${i}:${p.id}`).join(', '));
    
    setLocalProducts(newProducts);
    
    // Обновляем ref сразу
    localProductsRef.current = newProducts;
    
    // Отправляем новый порядок на сервер (только товары этой категории)
    try {
      const reorderedProducts = newCategoryOrder.map((product, index) => ({
        id: product.id,
        sort_order: index
      }));
      await axios.put(`${API_URL}/api/products/reorder`, { products: reorderedProducts });
      console.log('[DragEnd] ✓ Order saved to server');
    } catch (error) {
      console.error('[DragEnd] Error saving order:', error);
    }
  }, [groupedProducts]);

  // Функции для управления combo items
  const addProductToCombo = async (product) => {
    // Проверяем есть ли у товара размеры
    try {
      const sizesRes = await axios.get(`${API_URL}/api/products/${product.id}/sizes`);
      const productSizes = sizesRes.data || [];
      
      if (Array.isArray(productSizes) && productSizes.length > 0) {
        // Если есть размеры - показываем модалку выбора
        setComboProductSizes(prev => ({ ...prev, [product.id]: productSizes }));
        setSelectedProductForCombo(product);
        setShowSizeSelectModal(true);
      } else {
        // Нет размеров - добавляем сразу
        addToComboWithSize(product, null, product.price || 0);
      }
    } catch (error) {
      // Если сервер вернул 404 - значит размеров нет, это нормально
      if (error.response?.status === 404) {
        addToComboWithSize(product, null, product.price || 0);
      } else {
        console.error('Ошибка загрузки размеров товара:', error);
        // Добавляем без размеров
        addToComboWithSize(product, null, product.price || 0);
      }
    }
  };
  
  // Добавить товар в комбо с указанным размером
  const addToComboWithSize = (product, size, price) => {
    const items = Array.isArray(comboItems) ? comboItems : [];
    const existing = items.find(i => i.product_id === product.id && i.size_id === (size?.id || null));
    if (existing) {
      setComboItems(comboItems.map(i =>
        i.product_id === product.id && i.size_id === (size?.id || null) 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
      ));
    } else {
      setComboItems([...comboItems, {
        product_id: product.id,
        product_name: product.name,
        product_price: price || 0,
        quantity: 1,
        size_id: size?.id || null,
        size_name: size?.name || null
      }]);
    }
  };
  
  // Обработка выбора размера в модалке
  const handleSizeSelectForCombo = (product, size) => {
    const price = size?.price || product.price || 0;
    addToComboWithSize(product, size, price);
    setShowSizeSelectModal(false);
    setSelectedProductForCombo(null);
  };

  const updateComboItemQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setComboItems(comboItems.map(i =>
      i.product_id === productId ? { ...i, quantity: parseInt(quantity) } : i
    ));
  };

  const removeComboItem = (productId) => {
    setComboItems(comboItems.filter(i => i.product_id !== productId));
  };

  const calculateComboTotal = () => {
    if (!Array.isArray(comboItems)) return 0;
    return comboItems
      .filter(item => item && item.product_id)
      .reduce((sum, item) => sum + (parseFloat(item.product_price || 0) * item.quantity), 0);
  };

  // Получаем товары доступные для добавления в комбо (не сам товар)
  const availableProductsForCombo = localProducts.filter(p => {
    if (editingProduct && p.id === editingProduct.id) return false;
    if (Array.isArray(comboItems) && comboItems.find(i => i.product_id === p.id)) return false;
    if (comboSearch && !((p.name?.toLowerCase() || '').includes(comboSearch.toLowerCase()))) return false;
    return true;
  });

  // Экспорт в Excel
  const handleExport = () => {
    const data = localProducts.map(p => ({
      Название: p.name,
      Описание: p.description || '',
      Категория: p.category_name || '',
      Цена: p.price,
      Изображение: p.image_url || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `products_${date}.xlsx`);
  };

  // Обработка выбора файла для импорта
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          alert('Файл пустой или содержит некорректные данные');
          return;
        }
        
        setImportFile(file);
        setImportPreview(data.slice(0, 5));
        setShowImportModal(true);
      } catch (error) {
        console.error('Ошибка чтения файла:', error);
        alert('Ошибка чтения файла: ' + error.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Импорт из Excel
  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const response = await axios.post(`${API_URL}/api/import/products`, { products: data });
        
         if (response.data.success) {
          alert(response.data.message);
          // НЕ вызываем refreshProducts() - это сбросит сортировку
          // Данные импорта придут через WebSocket/DataContext автоматически
          // Для импорта новых товаров сбрасываем localProducts для перезагрузки
          setLocalProducts([]);
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          alert('Ошибка импорта: ' + response.data.error);
        }
        setImporting(false);
      };
      reader.readAsBinaryString(importFile);
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('Ошибка импорта: ' + error.message);
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Создать новую категорию
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Введите название категории');
      return;
    }
    
    setCreatingCategory(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/categories`, {
        name: newCategoryName.trim(),
        sort_order: categories.length
      });
      
      // НЕ вызываем refreshProducts() - это сбросит сортировку
      // Для новой категории сбрасываем localProducts для перезагрузки данных
      setLocalProducts([]);
      
      // Устанавливаем новую категорию в форму
      setFormData({ ...formData, category_id: response.data.id.toString() });
      
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Ошибка создания категории:', error);
      alert('Ошибка при создании категории: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreatingCategory(false);
    }
  };

  if (loading) return <div className="card">Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>Товары</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              clearCache();
              fetchData(true);
              setLocalProducts([]);
            }}
            title="Очистить кэш и обновить данные"
          >
            <RefreshCw size={18} /> Обновить
          </button>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button 
            className="btn btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            title="Импорт из Excel"
          >
            <Upload size={18} /> Импорт
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleExport}
            title="Экспорт в Excel"
          >
            <Download size={18} /> Экспорт
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowModal(true); }}>
            <Plus size={18} />
            Добавить товар
          </button>
        </div>
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Поиск товаров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="card">
        <DragDropContext onDragEnd={(result) => handleProductsDragEnd(result)}>
          {sortedCategoryIds.map(categoryId => {
            const category = groupedProducts[categoryId];
            const isExpanded = expandedCategories[categoryId] !== false;
            
            return (
              <div key={categoryId} style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={20} color="#4361ee" />
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{category.name}</h3>
                    <span className="badge badge-delivered">{category.products.length}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCategory(categoryId); }}
                    style={{
                      padding: '8px',
                      margin: '-8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                    title={isExpanded ? 'Свернуть' : 'Развернуть'}
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                
                {/* Droppable всегда в DOM - это важно для drag-and-drop! */}
                <Droppable droppableId={categoryId}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {/* Содержимое показываем только если категория развёрнута */}
                      {isExpanded ? (
                        <>
                          <table className="table">
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Название</th>
                                <th>Цена</th>
                                <th>Действия</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.products.map((product, index) => {
                                // Пропускаем товары без id
                                if (!product.id) {
                                  console.warn('[Products] Skipping product without id:', product);
                                  return null;
                                }
                                return (
                                  <Draggable key={String(product.id)} draggableId={String(product.id)} index={index}>
                                    {(provided, snapshot) => (
                                      <tr
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={{
                                          ...provided.draggableProps.style,
                                          opacity: product.is_active === 0 ? 0.5 : 1,
                                          background: snapshot.isDragging ? '#f0f9ff' : undefined,
                                          ...provided.draggableProps.style
                                        }}
                                      >
                                        <td {...provided.dragHandleProps}>
                                          <GripVertical size={18} color="#9ca3af" style={{ cursor: 'grab' }} />
                                        </td>
                                        <td>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {product.is_active === 0 && (
                                              <span style={{ 
                                                background: '#ef4444', 
                                                color: 'white', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: '600'
                                              }}>СКРЫТ</span>
                                            )}
                                            {product.is_featured === 1 && (
                                              <span style={{ 
                                                background: '#eab308', 
                                                color: 'white', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: '600'
                                              }}>⭐ ИЗБРАННЫЙ</span>
                                            )}
                                            {product.image_url && (
                                              <img 
                                                src={getImageUrl(product.image_url)} 
                                                alt="" 
                                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} 
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                              />
                                            )}
                                            <div>
                                              <div style={{ fontWeight: '500' }}>{product.name}</div>
                                              {product.description && (
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{product.description}</div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td><strong>{product.price} ₽</strong></td>
                                        <td>
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => {
                                              console.log('[Products] Клик по редактированию товара:', product.id, product.name);
                                              console.log('[Products] product.is_combo:', product.is_combo);
                                              console.log('[Products] product.combo_items:', product.combo_items);
                                              handleEdit(product);
                                            }}>
                                              <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product.id)}>
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Draggable>
                                );
                              })}
                            </tbody>
                          </table>
                        </>
                      ) : (
                        /* Placeholder когда свёрнуто - таблица без строк */
                        <div style={{ height: '20px' }}></div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </DragDropContext>
        
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Товары не найдены
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                  />
                </div>
                
                {/* Цена и категория - в отдельных строках */}
                <div className="form-group">
                  <label className="form-label">
                    {hasSizes ? 'Цена по умолчанию (первый размер)' : 'Цена (₽)'}
                    {hasSizes && <span style={{color: '#6b7280', fontSize: '12px', marginLeft: '8px'}}>(заполнится из первого размера)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required={!hasSizes}
                    disabled={hasSizes && sizes.length > 0}
                    placeholder={hasSizes ? 'Цена возьмётся из первого размера' : ''}
                  />
                </div>
                
                {/* Категория - всегда видна */}
                <div className="form-group">
                  <label className="form-label">Категория</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-select"
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                      style={{ flex: 1 }}
                    >
                      <option value="">Без категории</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCategoryModal(true)}
                      title="Создать новую категорию"
                      style={{ padding: '8px 12px' }}
                    >
                      <FolderPlus size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Изображение товара</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Область загрузки изображения */}
                    <div 
                      onClick={() => imageInputRef.current?.click()}
                      style={{
                        width: '120px',
                        height: '120px',
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#f9fafb',
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      {uploadingImage ? (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <div style={{ textAlign: 'center', padding: '8px' }}></div>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>Загрузка...</span>
                        </div>
                      ) : imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <>
                          <Camera size={28} color="#9ca3af" />
                          <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Нажмите
                          для загрузки</span>
                        </>
                      )}
                    </div>
                    
                    {/* Информация и кнопка удаления */}
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      
                      {formData.image_url ? (
                        <div>
                          <div style={{ 
                            padding: '8px 12px', 
                            background: '#ecfdf5', 
                            borderRadius: '6px',
                            marginBottom: '8px'
                          }}>
                            <span style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>
                              ✓ Изображение загружено
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            style={{
                              padding: '6px 12px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Удалить изображение
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '8px 0' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            Нажмите на область слева для загрузки изображения товара
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Чекбокс скрытия товара */}
                <div style={{ marginTop: '16px', padding: '12px', background: formData.is_active === 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', border: formData.is_active === 0 ? '2px solid #ef4444' : '2px solid #22c55e' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active === 1}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{formData.is_active === 1 ? 'Товар виден на витрине' : 'Товар скрыт с витрины'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                         {formData.is_active === 1 ? 'Покупатели смогут увидеть этот товар' : 'Товар не будет отображаться в меню'}
                      </div>
                    </div>
                  </label>
                </div>
                
                {/* Чекбокс избранного товара */}
                <div style={{ marginTop: '16px', padding: '12px', background: formData.is_featured === 1 ? '#fef9c3' : '#f9fafb', borderRadius: '8px', border: formData.is_featured === 1 ? '2px solid #eab308' : '2px solid #d1d5db' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_featured === 1}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Проверяем лимит через сервер - отправим запрос и обработаем ошибку
                          setFormData({...formData, is_featured: 1});
                        } else {
                          setFormData({...formData, is_featured: 0});
                        }
                      }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{formData.is_featured === 1 ? 'Избранный товар' : 'Обычный товар'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                         {formData.is_featured === 1 ? 'Товар будет показан в блоке "Рекомендуем" (максимум 3 товара)' : 'Добавить в блок рекомендуемых товаров на сайте'}
                      </div>
                    </div>
                  </label>
                </div>
                
                {/* Секция комбо */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: isCombo ? '#f0fdf4' : '#f9fafb', 
                  borderRadius: '8px',
                  border: isCombo ? '2px solid #22c55e' : '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <input
                      type="checkbox"
                      id="isCombo"
                      checked={isCombo}
                      onChange={(e) => {
                        setIsCombo(e.target.checked);
                        if (!e.target.checked) {
                          setComboItems([]);
                        }
                      }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="isCombo" style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>
                      Это комбо-набор
                    </label>
                  </div>
                  
                  {isCombo && (
                    <div>
                      {comboItems.length > 0 ? (
                        <>
                          <table className="table" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr>
                                <th>Товар</th>
                                <th style={{ width: '70px' }}>Кол-во</th>
                                <th>Цена</th>
                                <th>Сумма</th>
                                <th style={{ width: '40px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(Array.isArray(comboItems) ? comboItems : []).filter(item => item && item.product_id).map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <div>{item.product_name}</div>
                                    {item.size_name && (
                                      <div style={{ fontSize: '11px', color: '#0ea5e9' }}>
                                        Размер: {item.size_name}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="1"
                                      className="form-input"
                                      style={{ padding: '4px 8px' }}
                                      value={item.quantity}
                                      onChange={(e) => updateComboItemQuantity(item.product_id, e.target.value)}
                                    />
                                  </td>
                                  <td>{parseFloat(item.product_price || 0).toFixed(2)} руб.</td>
                                  <td style={{ fontWeight: '500' }}>
                                    {((parseFloat(item.product_price) || 0) * item.quantity).toFixed(2)} руб.
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-sm"
                                      style={{ background: '#ef4444', color: 'white', padding: '4px' }}
                                      onClick={() => removeComboItem(item.product_id)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '12px', 
                            background: '#fff',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: '500' }}>Сумма товаров:</span>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
                              {calculateComboTotal().toFixed(2)} руб.
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          padding: '20px', 
                          background: '#fff', 
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}>
                          Товары не добавлены
                        </div>
                      )}
                      
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                          Добавить товар
                        </label>
                        
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Поиск товаров..."
                            value={comboSearch}
                            onChange={(e) => setComboSearch(e.target.value)}
                            style={{ paddingLeft: '36px', fontSize: '13px' }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                          {availableProductsForCombo.length > 0 ? (
                            availableProductsForCombo.map(product => (
                              <button
                                key={product.id}
                                type="button"
                                className="btn btn-sm"
                                style={{ background: '#e0e7ff', color: '#4338ca' }}
                                onClick={() => addProductToCombo(product)}
                              >
                                <Plus size={12} /> {product.name} ({product.price || 0} руб.)
                              </button>
                            ))
                          ) : (
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                              {comboSearch ? 'Товары не найдены' : 'Нет доступных товаров'}
                            </p>
                          )}
                        </div>
                        {availableProductsForCombo.length > 20 && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                            Показаны первые 20 товаров из {availableProductsForCombo.length}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Секция размеров */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: hasSizes ? '#f0f9ff' : '#f9fafb', 
                  borderRadius: '8px',
                  border: hasSizes ? '2px solid #0ea5e9' : '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <input
                      type="checkbox"
                      id="hasSizes"
                      checked={hasSizes}
                      onChange={(e) => {
                        setHasSizes(e.target.checked);
                        if (!e.target.checked) {
                          setSizes([]);
                        }
                      }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="hasSizes" style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>
                      Товар имеет размеры
                    </label>
                  </div>
                  
                  {hasSizes && (
                    <div>
                      {/* Список добавленных размеров */}
                      {sizes.length > 0 ? (
                        <div style={{ marginBottom: '12px' }}>
                          {sizes.map((size, index) => (
                            <div key={size.id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              background: 'white',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: index === 0 ? '2px solid #0ea5e9' : '1px solid #e5e7eb'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: '500' }}>{size.name}</span>
                                {index === 0 && (
                                  <span style={{ fontSize: '11px', background: '#0ea5e9', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Основной</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: '15px' }}>{parseFloat(size.price).toFixed(2)} ₽</span>
                                <button
                                  type="button"
                                  onClick={() => removeSize(size.id)}
                                  style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280', background: 'white', borderRadius: '6px', marginBottom: '12px' }}>
                          Размеры не добавлены
                        </div>
                      )}
                      
                      {/* Форма добавления размера */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Название (25см, 35см)"
                          value={newSize.name}
                          onChange={(e) => setNewSize({...newSize, name: e.target.value})}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          placeholder="Цена"
                          value={newSize.price}
                          onChange={(e) => setNewSize({...newSize, price: e.target.value})}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={addSize}
                          disabled={!newSize.name.trim() || newSize.price === ''}
                        >
                          <Plus size={16} /> Добавить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Секция скидок */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: hasDiscount ? '#fef3c7' : '#f9fafb', 
                  borderRadius: '8px',
                  border: hasDiscount ? '2px solid #f59e0b' : '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <input
                      type="checkbox"
                      id="hasDiscount"
                      checked={hasDiscount}
                      onChange={(e) => setHasDiscount(e.target.checked)}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="hasDiscount" style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>
                      Акция / Скидка
                    </label>
                  </div>
                  
                  {hasDiscount && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '13px' }}>Тип скидки</label>
                          <select
                            className="form-select"
                            value={discount.type}
                            onChange={(e) => setDiscount({...discount, type: e.target.value})}
                          >
                            <option value="percent">Процент (%)</option>
                            <option value="fixed">Фиксированная (₽)</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '13px' }}>Размер скидки</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={discount.value}
                            onChange={(e) => setDiscount({...discount, value: e.target.value})}
                            placeholder={discount.type === 'percent' ? 'Например: 10' : 'Например: 50'}
                          />
                        </div>
                      </div>
                      
                      {discount.value && parseFloat(discount.value) > 0 && (
                        <div style={{ 
                          padding: '12px', 
                          background: 'white', 
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <CheckCircle size={20} color="#059669" />
                          <div>
                            <div style={{ fontWeight: '500' }}>Цена со скидкой:</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                              <span>
                                {discount.type === 'percent' 
                                  ? (parseFloat(formData.price || 0) * (1 - parseFloat(discount.value) / 100)).toFixed(2)
                                  : (parseFloat(formData.price || 0) - parseFloat(discount.value)).toFixed(2)
                                } ₽
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '13px' }}>Дата начала</label>
                          <input
                            type="date"
                            className="form-input"
                            value={discount.valid_from}
                            onChange={(e) => setDiscount({...discount, valid_from: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '13px' }}>Дата окончания</label>
                          <input
                            type="date"
                            className="form-input"
                            value={discount.valid_to}
                            onChange={(e) => setDiscount({...discount, valid_to: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Секция допов */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: hasAddons ? '#f0fdf4' : '#f9fafb', 
                  borderRadius: '8px',
                  border: hasAddons ? '2px solid #22c55e' : '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <input
                      type="checkbox"
                      id="hasAddons"
                      checked={hasAddons}
                      onChange={(e) => {
                        setHasAddons(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedAddons([]);
                        }
                      }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="hasAddons" style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>
                      Дополнительные ингредиенты
                    </label>
                  </div>
                  
                  {hasAddons && (
                    <div>
                      {selectedAddons.length > 0 ? (
                        <div style={{ marginBottom: '12px' }}>
                          {selectedAddons.map(addon => (
                            <div key={addon.id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              background: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              marginBottom: '6px'
                            }}>
                              <span style={{ fontWeight: '500' }}>{addon.addon_name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="form-input"
                                  style={{ width: '80px', padding: '4px 8px' }}
                                  value={addon.custom_price || ''}
                                  onChange={(e) => updateAddonPrice(addon.id, e.target.value)}
                                  placeholder="Цена"
                                />
                                <span>₽</span>
                                <button
                                  type="button"
                                  onClick={() => removeAddon(addon.id)}
                                  style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280', background: 'white', borderRadius: '6px', marginBottom: '12px' }}>
                          Допы не добавлены
                        </div>
                      )}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px' }}>
                        <select
                          className="form-select"
                          value={newAddon.addon_template_id}
                          onChange={(e) => setNewAddon({...newAddon, addon_template_id: e.target.value})}
                        >
                          <option value="">Выберите доп...</option>
                          {addonTemplates.filter(t => t.is_active === 1).map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.default_price > 0 ? `(базовая: ${template.default_price} ₽)` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          style={{ width: '100px' }}
                          placeholder="Цена"
                          value={newAddon.custom_price}
                          onChange={(e) => setNewAddon({...newAddon, custom_price: e.target.value})}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={addAddon}
                          disabled={!newAddon.addon_template_id}
                        >
                          <Plus size={16} /> Добавить
                        </button>
                      </div>
                      
                      {addonTemplates.filter(t => t.is_active === 1).length === 0 && (
                        <div style={{ 
                          marginTop: '12px', 
                          padding: '12px', 
                          background: '#fef3c7', 
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#92400e'
                        }}>
                          <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
                          Нет доступных шаблонов допов. Создайте их в разделе "Настройки" → "Шаблоны допов"
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Секция допов для размеров */}
                {hasSizes && hasAddons && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '16px', 
                    background: '#f0fdf4', 
                    borderRadius: '8px',
                    border: '2px solid #22c55e'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <label style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>
                        Допы для размеров
                      </label>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        (настройте какие допы показывать для каждого размера)
                      </span>
                    </div>
                    
                    {sizes.length > 0 ? (
                      <div>
                        {sizes.map(size => (
                          <div key={size.id} style={{ 
                            marginBottom: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontWeight: '600' }}>
                                {size.name} (+{parseFloat(size.price).toFixed(2)} ₽)
                              </span>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {(sizeAddons[size.id] || []).length} доп(ов)
                              </span>
                            </div>
                            
                            {/* Список выбранных допов для этого размера */}
                            {(sizeAddons[size.id] || []).length > 0 ? (
                              <div style={{ marginBottom: '8px' }}>
                                {(sizeAddons[size.id] || []).map(addon => (
                                  <div key={addon.addon_id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: '6px 8px',
                                    background: '#f9fafb',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    fontSize: '13px'
                                  }}>
                                    <span>{addon.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {addon.price_modifier > 0 && (
                                        <span style={{ color: '#0ea5e9', fontSize: '12px' }}>
                                          +{parseFloat(addon.price_modifier).toFixed(2)} ₽
                                        </span>
                                      )}
                                      {addon.is_required === 1 && (
                                        <span style={{ 
                                          fontSize: '10px', 
                                          background: '#ef4444', 
                                          color: 'white', 
                                          padding: '2px 4px', 
                                          borderRadius: '3px'
                                        }}>
                                          Обязательный
                                        </span>
                                      )}
                                       <button
                                         type="button"
                                         onClick={() => {
                                           const newSizeAddons = { ...sizeAddons };
                                           newSizeAddons[size.id] = (newSizeAddons[size.id] || []).filter(a => a.addon_id !== addon.addon_id);
                                           setSizeAddons(newSizeAddons);
                                         }}
                                        style={{ 
                                          background: '#ef4444', 
                                          color: 'white', 
                                          border: 'none', 
                                          borderRadius: '3px', 
                                          padding: '2px 6px', 
                                          cursor: 'pointer',
                                          fontSize: '11px'
                                        }}
                                      >
                                        Убрать
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ 
                                padding: '8px', 
                                textAlign: 'center', 
                                color: '#9ca3af', 
                                fontSize: '12px',
                                background: '#f9fafb',
                                borderRadius: '4px',
                                marginBottom: '8px'
                              }}>
                                Нет допов
                              </div>
                            )}
                            
                            {/* Кнопка добавления допа */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ 
                                background: '#22c55e', 
                                color: 'white',
                                marginTop: '8px'
                              }}
                              onClick={() => {
                                // Показываем модалку выбора допа
                                setSelectedSizeForAddons(size.id);
                                setShowAddonSelectModal(true);
                              }}
                            >
                              <Plus size={14} /> Добавить доп
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: '#6b7280', 
                        background: 'white',
                        borderRadius: '8px'
                      }}>
                        Добавьте размеры товара выше, чтобы настроить для них допы
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                  setFormData({ name: '', description: '', price: '', category_id: '', image_url: '', is_active: 1 });
                  setIsCombo(false);
                  setComboItems([]);
                  setComboSearch('');
                }}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалки импорта, категории и допов остаются без изменений */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileSpreadsheet size={20} style={{ marginRight: '8px' }} />
                Импорт товаров из Excel
              </h3>
              <button onClick={closeImportModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <strong>Файл:</strong> {importFile?.name}
              </div>
              
              {importPreview.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>Предпросмотр (первые 5 строк):</strong>
                  <table className="table" style={{ marginTop: '8px', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {Object.keys(importPreview[0]).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => (
                            <td key={i}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div style={{ 
                padding: '12px', 
                background: '#e0f2fe', 
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <strong>Формат колонок:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Название (обязательно)</li>
                  <li>Описание (опционально)</li>
                  <li>Категория (опционально, название категории)</li>
                  <li>Цена (обязательно)</li>
                  <li>Изображение (опционально, имя файла)</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeImportModal}>Отмена</button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Импорт...' : 'Импортировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FolderPlus size={20} style={{ marginRight: '8px' }} />
                Новая категория
              </h3>
              <button onClick={() => setShowCategoryModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Название категории</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Например: Десерты"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Отмена</button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
              >
                {creatingCategory ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddonSelectModal && (
        <div className="modal-overlay" onClick={() => setShowAddonSelectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Plus size={20} style={{ marginRight: '8px' }} />
                Добавить доп
              </h3>
              <button onClick={() => setShowAddonSelectModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Выберите доп</label>
                <select
                  className="form-select"
                  value={selectedAddonTemplate || ''}
                  onChange={(e) => {
                    setSelectedAddonTemplate(e.target.value);
                    const template = addonTemplates.find(t => t.id === parseInt(e.target.value));
                    if (template) {
                      setAddonPriceModifier(template.default_price > 0 ? template.default_price : 0);
                    }
                  }}
                >
                  <option value="">Выберите доп...</option>
                  {addonTemplates
                    .filter(t => t.is_active === 1)
                    .filter(t => !selectedAddons.find(a => a.addon_template_id === t.id))
                    .map(template => {
                      const isAdded = (sizeAddons[selectedSizeForAddons] || []).some(a => a.addon_id === template.id);
                      return (
                        <option key={template.id} value={template.id} disabled={isAdded}>
                          {template.name} ({template.default_price || 0} ₽){isAdded ? ' (уже добавлен)' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Доплата (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={addonPriceModifier}
                  onChange={(e) => setAddonPriceModifier(e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={addonIsRequired}
                    onChange={(e) => setAddonIsRequired(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Обязательный доп</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddonSelectModal(false)}>Отмена</button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddAddonToSize}
                disabled={!selectedAddonTemplate}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Модалка выбора размера для комбо */}
      {showSizeSelectModal && selectedProductForCombo && (
        <div className="modal-overlay" onClick={() => { setShowSizeSelectModal(false); setSelectedProductForCombo(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Выберите размер
              </h3>
              <button onClick={() => { setShowSizeSelectModal(false); setSelectedProductForCombo(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                <strong>{selectedProductForCombo.name}</strong> - выберите размер:
              </p>
              
              {/* Кнопка добавления без размера */}
              <button
                className="btn"
                style={{ 
                  width: '100%', 
                  marginBottom: '12px',
                  background: comboItems.find(i => i.product_id === selectedProductForCombo.id && !i.size_id) ? '#22c55e' : '#f3f4f6',
                  color: comboItems.find(i => i.product_id === selectedProductForCombo.id && !i.size_id) ? 'white' : '#374151',
                  border: '1px solid #d1d5db'
                }}
                onClick={() => handleSizeSelectForCombo(selectedProductForCombo, null)}
              >
                Без размера - {selectedProductForCombo.price} ₽
              </button>
              
              {/* Список размеров */}
              {(comboProductSizes[selectedProductForCombo.id] || []).map(size => (
                <button
                  key={size.id}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    marginBottom: '8px',
                    background: comboItems.find(i => i.product_id === selectedProductForCombo.id && i.size_id === size.id) ? '#22c55e' : '#f0f9ff',
                    color: comboItems.find(i => i.product_id === selectedProductForCombo.id && i.size_id === size.id) ? 'white' : '#0ea5e9',
                    border: '1px solid #0ea5e9'
                  }}
                  onClick={() => handleSizeSelectForCombo(selectedProductForCombo, size)}
                >
                  {size.name} - {parseFloat(size.price || 0).toFixed(2)} ₽
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => { setShowSizeSelectModal(false); setSelectedProductForCombo(null); }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
