import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Search, X, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

const UNIT_TYPES = ['шт', 'г', 'кг', 'мл', 'л', 'ч.л.', 'ст.л.', 'стакан', 'пучок', 'зубчик', 'ломтик', 'кусок', 'пласт'];

function Recipes() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [comboItems, setComboItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showNewIngredientModal, setShowNewIngredientModal] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'шт',
    cost: 0,
    quantity: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // Загрузка категорий
  useEffect(() => {
    fetchCategories();
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredIngredients(filtered);
    } else {
      setFilteredIngredients([]);
    }
  }, [searchQuery, ingredients]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, ingredientsRes, recipesRes] = await Promise.all([
        fetch(`${FRONTPAD_API}/api/products`),
        fetch(`${FRONTPAD_API}/api/ingredients`),
        fetch(`${FRONTPAD_API}/api/recipes`)
      ]);

      const productsData = await productsRes.json();
      const ingredientsData = await ingredientsRes.json();
      const recipesData = await recipesRes.json();

      setProducts(productsData);
      setIngredients(ingredientsData);

      // Группируем рецептуры по товарам
      const grouped = {};
      productsData.forEach(p => { grouped[p.id] = []; });
      recipesData.forEach(r => {
        if (grouped[r.product_id]) {
          grouped[r.product_id].push(r);
        }
      });
      setRecipes(grouped);
      
      // Загружаем состав комбо-товаров
      const comboItemsGrouped = {};
      const comboProducts = productsData.filter(p => p.is_combo === 1);
      for (const product of comboProducts) {
        if (product.combo_items && Array.isArray(product.combo_items)) {
          comboItemsGrouped[product.id] = product.combo_items;
        }
      }
      setComboItems(comboItemsGrouped);
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setLoading(false);
    }
  };

  const toggleProduct = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const addIngredientToRecipe = async (productId, ingredientId, quantity, unit) => {
    if (!ingredientId || !quantity) return;

    try {
      await fetch('https://fp.xn--90ag8bb0d.com/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          ingredient_id: parseInt(ingredientId),
          quantity: parseFloat(quantity),
          unit: unit
        })
      });
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Ошибка добавления:', error);
    }
  };

  const addNewIngredientAndRecipe = async () => {
    if (!newIngredient.name || !newIngredient.quantity) return;

    try {
      await fetch('https://fp.xn--90ag8bb0d.com/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: currentProductId,
          ingredient_name: newIngredient.name,
          ingredient_unit: newIngredient.unit,
          ingredient_cost: parseFloat(newIngredient.cost) || 0,
          quantity: parseFloat(newIngredient.quantity),
          unit: newIngredient.unit
        })
      });
      fetchData();
      setShowNewIngredientModal(false);
      resetForm();
    } catch (error) {
      console.error('Ошибка добавления:', error);
    }
  };

  const removeIngredient = async (recipeId) => {
    try {
      await fetch(`${FRONTPAD_API}/api/recipes/${recipeId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  // Функция для обновления состава комбо-товаров на сервере
  const updateComboItemsOnServer = async (productId, updatedItems) => {
    try {
      // Сначала получаем текущий товар
      const productRes = await fetch(`${FRONTPAD_API}/api/products/${productId}`);
      const product = await productRes.json();
      
      // Обновляем товар с новым составом комбо
      await fetch(`${FRONTPAD_API}/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          combo_items: updatedItems
        })
      });
      
      fetchData();
    } catch (error) {
      console.error('Ошибка обновления состава комбо:', error);
    }
  };

  // Функция для добавления товара в комбо
  const addProductToCombo = async (comboId, product, quantity = 1) => {
    try {
      // Получаем текущий товар
      const comboRes = await fetch(`${FRONTPAD_API}/api/products/${comboId}`);
      const combo = await comboRes.json();
      
      // Проверяем, есть ли уже такой продукт в комбо
      const existingItem = combo.combo_items?.find(item => item.product_id === product.id);
      
      let updatedItems;
      if (existingItem) {
        // Обновляем количество
        updatedItems = combo.combo_items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Добавляем новый элемент
        updatedItems = [
          ...(combo.combo_items || []),
          {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            quantity: quantity
          }
        ];
      }
      
      // Обновляем товар с новым составом комбо
      await fetch(`${FRONTPAD_API}/api/products/${comboId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...combo,
          combo_items: updatedItems
        })
      });
      
      fetchData();
    } catch (error) {
      console.error('Ошибка добавления товара в комбо:', error);
    }
  };

  const resetForm = () => {
    setNewIngredient({
      name: '',
      unit: 'шт',
      cost: 0,
      quantity: ''
    });
    setSearchQuery('');
  };

  const openNewIngredientModal = (productId) => {
    setCurrentProductId(productId);
    setShowNewIngredientModal(true);
    resetForm();
  };

  const calculateCost = (quantity, costPerUnit) => {
    return (parseFloat(quantity || 0) * parseFloat(costPerUnit || 0)).toFixed(2);
  };

  // Функция для расчета общей стоимости комбо-товара
  const calculateComboCost = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.product_price || 0) * item.quantity), 0).toFixed(2);
  };

  // Экспорт в Excel
  const handleExport = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/export/recipes`);
      const data = await response.json();
      
      // Создаём книгу Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Рецепты');
      
      // Скачиваем файл
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `recipes_${date}.xlsx`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка экспорта: ' + error.message);
    }
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
        
        const response = await fetch(`${FRONTPAD_API}/api/import/recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes: data })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(result.message);
          fetchData();
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          alert('Ошибка импорта: ' + result.error);
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

  // Товары без рецептуры
  const productsWithoutRecipe = products.filter(p => !recipes[p.id] || recipes[p.id].length === 0);
  
  // Группируем товары по категориям
  const groupedProducts = {};
  const uncategorizedProducts = [];

  products.forEach(p => {
    const catId = p.category_id || 'none';
    const catName = categories.find(c => c.id === catId)?.name || 'Без категории';
    if (!groupedProducts[catId]) {
      groupedProducts[catId] = { name: catName, products: [] };
    }
    groupedProducts[catId].products.push(p);
  });

  // Сортируем категории по имени
  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    return groupedProducts[a].name.localeCompare(groupedProducts[b].name);
  });

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="recipes-page">
      <div className="page-header">
        <h1>Рецептуры</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
      </div>

      {/* Товары без рецептуры */}
      {(() => {
        const productsWithoutRecipe = products.filter(p => !recipes[p.id] || recipes[p.id].length === 0);
        return productsWithoutRecipe.length > 0 && (
          <div className="card" style={{ marginBottom: '16px', background: '#fef3c7' }}>
            <h3 style={{ color: '#92400e', marginBottom: '8px' }}>Товары без рецептуры</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {productsWithoutRecipe.map(p => (
                <span key={p.id} className="badge badge-processing">
                  {p.name} {p.is_combo === 1 ? '(Комбо)' : ''}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Группировка товаров по категориям */}
      {(() => {
        // Группируем товары по категориям
        const groupedProducts = {};

        products.forEach(p => {
          const catId = p.category_id || 'none';
          const catName = categories.find(c => c.id === catId)?.name || 'Без категории';
          if (!groupedProducts[catId]) {
            groupedProducts[catId] = { name: catName, products: [] };
          }
          groupedProducts[catId].products.push(p);
        });

        // Сортируем категории по имени
        const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
          return groupedProducts[a].name.localeCompare(groupedProducts[b].name);
        });

        return (
          <>
            {sortedCategories.map(categoryId => {
              const category = groupedProducts[categoryId];
              const isExpanded = expandedCategories[categoryId] !== false; // По умолчанию раскрыто

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
                    onClick={() => toggleCategory(categoryId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.9 19.8A2 2 0 0 0 19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14.8z"/>
                        <path d="M8 10h8"/>
                        <path d="M8 14h6"/>
                      </svg>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>{category.name}</h3>
                      <span className="badge badge-delivered">{category.products.length}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '8px' }}>
                      {category.products.map(product => (
                        <div key={product.id} className="card" style={{ marginBottom: '12px' }}>
                          <div
                            className="card-header"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleProduct(product.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <BookOpen size={20} color="#4361ee" />
                              <h3 style={{ margin: 0 }}>{product.name}</h3>
                              {product.is_combo === 1 ? (
                                <span className="badge badge-processing">Комбо</span>
                              ) : (
                                <span className="badge badge-delivered">{recipes[product.id]?.length || 0} ингр.</span>
                              )}
                            </div>
                            {expandedProducts[product.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>

                          {expandedProducts[product.id] && (
                            <div>
                              {product.is_combo === 1 ? (
                                // Комбо-товар - отображаем состав из других товаров
                                <div>
                                  <table className="table">
                                    <thead>
                                      <tr>
                                        <th>Товар в комбо</th>
                                        <th>Количество</th>
                                        <th>Цена за ед.</th>
                                        <th>Сумма</th>
                                        <th>Действия</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(comboItems[product.id] || []).map((item, index) => (
                                        <tr key={index}>
                                          <td>
                                            <div>{item.product_name}</div>
                                          </td>
                                          <td>{item.quantity}</td>
                                          <td>{parseFloat(item.product_price).toFixed(2)} руб.</td>
                                          <td>{(parseFloat(item.product_price) * item.quantity).toFixed(2)} руб.</td>
                                          <td>
                                            <button
                                              className="btn btn-sm"
                                              style={{ background: '#ef4444', color: 'white', padding: '4px 8px' }}
                                              onClick={() => {
                                                if (window.confirm('Удалить этот товар из комбо?')) {
                                                  // Для удаления из комбо нужно обновить товар на сервере
                                                  const updatedComboItems = comboItems[product.id].filter((_, i) => i !== index);
                                                  updateComboItemsOnServer(product.id, updatedComboItems);
                                                }
                                              }}
                                              title="Удалить"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      {(comboItems[product.id] || []).length === 0 && (
                                        <tr>
                                          <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                                            Товары не добавлены
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                  
                                  {/* Итоговая стоимость комбо */}
                                  {comboItems[product.id] && comboItems[product.id].length > 0 && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '12px',
                                      background: '#f3f4f6',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ fontWeight: '500' }}>Итого стоимость:</span>
                                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                                        {calculateComboCost(comboItems[product.id])} руб.
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Форма добавления товара в комбо */}
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                      <label className="form-label">Выбрать товар для комбо</label>
                                      <div style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          className="form-input"
                                          placeholder="Поиск товара..."
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          id={`combo-search-${product.id}`}
                                        />
                                        <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                      </div>
                                      {searchQuery.length >= 2 && (
                                        <div style={{
                                          maxHeight: '150px',
                                          overflowY: 'auto',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          background: 'white'
                                        }}>
                                          {products
                                            .filter(p => p.id !== product.id && p.is_combo !== 1 && !comboItems[product.id]?.some(ci => ci.product_id === p.id))
                                            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map(p => (
                                              <div
                                                key={p.id}
                                                style={{
                                                  padding: '8px 12px',
                                                  cursor: 'pointer',
                                                  borderBottom: '1px solid #f3f4f6'
                                                }}
                                                onClick={() => {
                                                  addProductToCombo(product.id, p);
                                                  setSearchQuery('');
                                                }}
                                              >
                                                {p.name} - {p.price} руб.
                                              </div>
                                            ))}
                                          {products
                                            .filter(p => p.id !== product.id && p.is_combo !== 1 && !comboItems[product.id]?.some(ci => ci.product_id === p.id))
                                            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .length === 0 && (
                                            <div style={{ padding: '8px 12px', color: '#6b7280' }}>
                                              Ничего не найдено
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ width: '100px' }}>
                                      <label className="form-label">Кол-во</label>
                                      <input
                                        type="number"
                                        step="1"
                                        className="form-input"
                                        id={`combo-quantity-${product.id}`}
                                        defaultValue="1"
                                        min="1"
                                      />
                                    </div>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => {
                                        const qtyInput = document.getElementById(`combo-quantity-${product.id}`);
                                        // Вместо поиска select элемента, просто добавляем товар с текущим значением поиска
                                        const searchText = document.getElementById(`combo-search-${product.id}`)?.value;
                                        if (searchText) {
                                          // Найдем товар по названию
                                          const productToAdd = products.find(p =>
                                            p.name.toLowerCase().includes(searchText.toLowerCase()) &&
                                            p.id !== product.id &&
                                            p.is_combo !== 1 &&
                                            !comboItems[product.id]?.some(ci => ci.product_id === p.id)
                                          );
                                          if (productToAdd) {
                                            addProductToCombo(product.id, productToAdd, parseInt(qtyInput?.value) || 1);
                                            document.getElementById(`combo-search-${product.id}`).value = '';
                                            setSearchQuery('');
                                          }
                                        }
                                      }}
                                    >
                                      <Plus size={18} /> Добавить
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Обычный товар - отображаем рецептуру из ингредиентов
                                <div>
                                  <table className="table">
                                    <thead>
                                      <tr>
                                        <th>Ингредиент</th>
                                        <th>Количество</th>
                                        <th>Себестоимость</th>
                                        <th>Действия</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(recipes[product.id] || []).map(recipe => (
                                        <tr key={recipe.id}>
                                          <td>
                                            <div>{recipe.ingredient_name}</div>
                                            <div className="text-muted" style={{ fontSize: '11px' }}>{recipe.unit}</div>
                                          </td>
                                          <td>{parseFloat(recipe.quantity).toFixed(3)}</td>
                                          <td>
                                            {calculateCost(recipe.quantity, recipe.cost_per_unit)} руб.
                                          </td>
                                          <td>
                                            <button
                                              className="btn btn-sm"
                                              style={{ background: '#ef4444', color: 'white', padding: '4px 8px' }}
                                              onClick={() => {
                                                if (window.confirm('Удалить этот ингредиент из рецепта?')) {
                                                  removeIngredient(recipe.id);
                                                }
                                              }}
                                              title="Удалить"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      {(recipes[product.id] || []).length === 0 && (
                                        <tr>
                                          <td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>
                                            Ингредиенты не добавлены
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>

                                  {/* Итоговая себестоимость */}
                                  {recipes[product.id] && recipes[product.id].length > 0 && (
                                    <div style={{
                                      marginTop: '12px',
                                      padding: '12px',
                                      background: '#f3f4f6',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ fontWeight: '500' }}>Итого себестоимость:</span>
                                      <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                                        {recipes[product.id].reduce((sum, r) => sum + parseFloat(calculateCost(r.quantity, r.cost_per_unit)), 0).toFixed(2)} руб.
                                      </span>
                                    </div>
                                  )}

                                  {/* Форма добавления ингредиента */}
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                      <label className="form-label">Выбрать ингредиент</label>
                                      <div style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          className="form-input"
                                          placeholder="Поиск ингредиента..."
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                      </div>
                                      {searchQuery.length >= 2 && (
                                        <div style={{
                                          maxHeight: '150px',
                                          overflowY: 'auto',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          background: 'white'
                                        }}>
                                          {filteredIngredients.length > 0 ? (
                                            filteredIngredients.map(ing => (
                                              <div
                                                key={ing.id}
                                                style={{
                                                  padding: '8px 12px',
                                                  cursor: 'pointer',
                                                  borderBottom: '1px solid #f3f4f6'
                                                }}
                                                onClick={() => {
                                                  addIngredientToRecipe(product.id, ing.id, 1, ing.unit);
                                                  setSearchQuery('');
                                                }}
                                              >
                                                {ing.name} ({ing.unit}) - {ing.cost_per_unit} руб.
                                              </div>
                                            ))
                                          ) : (
                                            <div style={{ padding: '8px 12px', color: '#6b7280' }}>
                                              Ничего не найдено
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ width: '100px' }}>
                                      <label className="form-label">Кол-во</label>
                                      <input
                                        type="number"
                                        step="0.001"
                                        className="form-input"
                                        id={`quantity-${product.id}`}
                                        placeholder="0.000"
                                      />
                                    </div>
                                    <div style={{ width: '80px' }}>
                                      <label className="form-label">Ед.</label>
                                      <select className="form-input" id={`unit-${product.id}`}>
                                        {UNIT_TYPES.map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={() => {
                                        const ingSelect = document.getElementById(`ingredient-${product.id}`);
                                        const qtyInput = document.getElementById(`quantity-${product.id}`);
                                        const unitSelect = document.getElementById(`unit-${product.id}`);
                                        addIngredientToRecipe(product.id, ingSelect?.value, qtyInput?.value, unitSelect?.value);
                                        setSearchQuery('');
                                      }}
                                    >
                                      <Plus size={18} /> Добавить
                                    </button>
                                  </div>

                                  {/* Кнопка создания нового ингредиента */}
                                  <button
                                    className="btn btn-secondary"
                                    style={{ marginTop: '12px' }}
                                    onClick={() => openNewIngredientModal(product.id)}
                                  >
                                    <Plus size={16} /> Создать новый ингредиент
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Отображаем товары без категории, если они есть */}
            {groupedProducts['none'] && groupedProducts['none'].products.length > 0 && (
              <div style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                  onClick={() => toggleCategory('none')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.9 19.8A2 2 0 0 0 19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14.8z"/>
                      <path d="M8 10h8"/>
                      <path d="M8 14h6"/>
                    </svg>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Без категории</h3>
                    <span className="badge badge-delivered">{groupedProducts['none'].products.length}</span>
                  </div>
                  {expandedCategories['none'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {expandedCategories['none'] && (
                  <div style={{ padding: '8px' }}>
                    {groupedProducts['none'].products.map(product => (
                      <div key={product.id} className="card" style={{ marginBottom: '12px' }}>
                        <div
                          className="card-header"
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleProduct(product.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={20} color="#4361ee" />
                            <h3 style={{ margin: 0 }}>{product.name}</h3>
                            {product.is_combo === 1 ? (
                              <span className="badge badge-processing">Комбо</span>
                            ) : (
                              <span className="badge badge-delivered">{recipes[product.id]?.length || 0} ингр.</span>
                            )}
                          </div>
                          {expandedProducts[product.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>

                        {expandedProducts[product.id] && (
                          <div>
                            {product.is_combo === 1 ? (
                              // Комбо-товар - отображаем состав из других товаров
                              <div>
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Товар в комбо</th>
                                      <th>Количество</th>
                                      <th>Цена за ед.</th>
                                      <th>Сумма</th>
                                      <th>Действия</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(comboItems[product.id] || []).map((item, index) => (
                                      <tr key={index}>
                                        <td>
                                          <div>{item.product_name}</div>
                                        </td>
                                        <td>{item.quantity}</td>
                                        <td>{parseFloat(item.product_price).toFixed(2)} руб.</td>
                                        <td>{(parseFloat(item.product_price) * item.quantity).toFixed(2)} руб.</td>
                                        <td>
                                          <button
                                            className="btn btn-sm"
                                            style={{ background: '#ef4444', color: 'white', padding: '4px 8px' }}
                                            onClick={() => {
                                              if (window.confirm('Удалить этот товар из комбо?')) {
                                                // Для удаления из комбо нужно обновить товар на сервере
                                                const updatedComboItems = comboItems[product.id].filter((_, i) => i !== index);
                                                updateComboItemsOnServer(product.id, updatedComboItems);
                                              }
                                            }}
                                            title="Удалить"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {(comboItems[product.id] || []).length === 0 && (
                                      <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>
                                          Товары не добавлены
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                                
                                {/* Итоговая стоимость комбо */}
                                {comboItems[product.id] && comboItems[product.id].length > 0 && (
                                  <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontWeight: '500' }}>Итого стоимость:</span>
                                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                                      {calculateComboCost(comboItems[product.id])} руб.
                                    </span>
                                  </div>
                                )}
                                
                                {/* Форма добавления товара в комбо */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                                  <div style={{ flex: 1 }}>
                                    <label className="form-label">Выбрать товар для комбо</label>
                                    <div style={{ position: 'relative' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Поиск товара..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        id={`combo-search-${product.id}`}
                                      />
                                      <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    </div>
                                    {searchQuery.length >= 2 && (
                                      <div style={{
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        background: 'white'
                                      }}>
                                        {products
                                          .filter(p => p.id !== product.id && p.is_combo !== 1 && !comboItems[product.id]?.some(ci => ci.product_id === p.id))
                                          .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                          .map(p => (
                                            <div
                                              key={p.id}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6'
                                              }}
                                              onClick={() => {
                                                addProductToCombo(product.id, p);
                                                setSearchQuery('');
                                              }}
                                            >
                                              {p.name} - {p.price} руб.
                                            </div>
                                          ))}
                                        {products
                                          .filter(p => p.id !== product.id && p.is_combo !== 1 && !comboItems[product.id]?.some(ci => ci.product_id === p.id))
                                          .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                          .length === 0 && (
                                          <div style={{ padding: '8px 12px', color: '#6b7280' }}>
                                            Ничего не найдено
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ width: '100px' }}>
                                    <label className="form-label">Кол-во</label>
                                    <input
                                      type="number"
                                      step="1"
                                      className="form-input"
                                      id={`combo-quantity-${product.id}`}
                                      defaultValue="1"
                                      min="1"
                                    />
                                  </div>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      const qtyInput = document.getElementById(`combo-quantity-${product.id}`);
                                      // Вместо поиска select элемента, просто добавляем товар с текущим значением поиска
                                      const searchText = document.getElementById(`combo-search-${product.id}`)?.value;
                                      if (searchText) {
                                        // Найдем товар по названию
                                        const productToAdd = products.find(p =>
                                          p.name.toLowerCase().includes(searchText.toLowerCase()) &&
                                          p.id !== product.id &&
                                          p.is_combo !== 1 &&
                                          !comboItems[product.id]?.some(ci => ci.product_id === p.id)
                                        );
                                        if (productToAdd) {
                                          addProductToCombo(product.id, productToAdd, parseInt(qtyInput?.value) || 1);
                                          document.getElementById(`combo-search-${product.id}`).value = '';
                                          setSearchQuery('');
                                        }
                                      }
                                    }}
                                  >
                                    <Plus size={18} /> Добавить
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Обычный товар - отображаем рецептуру из ингредиентов
                              <div>
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Ингредиент</th>
                                      <th>Количество</th>
                                      <th>Себестоимость</th>
                                      <th>Действия</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(recipes[product.id] || []).map(recipe => (
                                      <tr key={recipe.id}>
                                        <td>
                                          <div>{recipe.ingredient_name}</div>
                                          <div className="text-muted" style={{ fontSize: '11px' }}>{recipe.unit}</div>
                                        </td>
                                        <td>{parseFloat(recipe.quantity).toFixed(3)}</td>
                                        <td>
                                          {calculateCost(recipe.quantity, recipe.cost_per_unit)} руб.
                                        </td>
                                        <td>
                                          <button
                                            className="btn btn-sm"
                                            style={{ background: '#ef4444', color: 'white', padding: '4px 8px' }}
                                            onClick={() => {
                                              if (window.confirm('Удалить этот ингредиент из рецепта?')) {
                                                removeIngredient(recipe.id);
                                              }
                                            }}
                                            title="Удалить"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {(recipes[product.id] || []).length === 0 && (
                                      <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>
                                          Ингредиенты не добавлены
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>

                                {/* Итоговая себестоимость */}
                                {recipes[product.id] && recipes[product.id].length > 0 && (
                                  <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    background: '#f3f4f6',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontWeight: '500' }}>Итого себестоимость:</span>
                                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                                      {recipes[product.id].reduce((sum, r) => sum + parseFloat(calculateCost(r.quantity, r.cost_per_unit)), 0).toFixed(2)} руб.
                                    </span>
                                  </div>
                                )}

                                {/* Форма добавления ингредиента */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                                  <div style={{ flex: 1 }}>
                                    <label className="form-label">Выбрать ингредиент</label>
                                    <div style={{ position: 'relative' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Поиск ингредиента..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                      />
                                      <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    </div>
                                    {searchQuery.length >= 2 && (
                                      <div style={{
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        background: 'white'
                                      }}>
                                        {filteredIngredients.length > 0 ? (
                                          filteredIngredients.map(ing => (
                                            <div
                                              key={ing.id}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6'
                                              }}
                                              onClick={() => {
                                                addIngredientToRecipe(product.id, ing.id, 1, ing.unit);
                                                setSearchQuery('');
                                              }}
                                            >
                                              {ing.name} ({ing.unit}) - {ing.cost_per_unit} руб.
                                            </div>
                                          ))
                                        ) : (
                                          <div style={{ padding: '8px 12px', color: '#6b7280' }}>
                                            Ничего не найдено
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ width: '100px' }}>
                                    <label className="form-label">Кол-во</label>
                                    <input
                                      type="number"
                                      step="0.001"
                                      className="form-input"
                                      id={`quantity-${product.id}`}
                                      placeholder="0.000"
                                    />
                                  </div>
                                  <div style={{ width: '80px' }}>
                                    <label className="form-label">Ед.</label>
                                    <select className="form-input" id={`unit-${product.id}`}>
                                      {UNIT_TYPES.map(u => (
                                        <option key={u} value={u}>{u}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      const ingSelect = document.getElementById(`ingredient-${product.id}`);
                                      const qtyInput = document.getElementById(`quantity-${product.id}`);
                                      const unitSelect = document.getElementById(`unit-${product.id}`);
                                      addIngredientToRecipe(product.id, ingSelect?.value, qtyInput?.value, unitSelect?.value);
                                      setSearchQuery('');
                                    }}
                                  >
                                    <Plus size={18} /> Добавить
                                  </button>
                                </div>

                                {/* Кнопка создания нового ингредиента */}
                                <button
                                  className="btn btn-secondary"
                                  style={{ marginTop: '12px' }}
                                  onClick={() => openNewIngredientModal(product.id)}
                                >
                                  <Plus size={16} /> Создать новый ингредиент
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {products.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
          Товары не добавлены
        </div>
      )}

      {/* Модальное окно создания нового ингредиента */}
      {showNewIngredientModal && (
        <div className="modal-overlay" onClick={() => setShowNewIngredientModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Создать новый ингредиент</h3>
              <button className="btn-close" onClick={() => setShowNewIngredientModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Название *</label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                  placeholder="Например: Булочка для бургера"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Единица измерения</label>
                <select
                  value={newIngredient.unit}
                  onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}
                  className="form-input"
                >
                  {UNIT_TYPES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Себестоимость за единицу (руб.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newIngredient.cost}
                  onChange={e => setNewIngredient({...newIngredient, cost: e.target.value})}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group full-width">
                <label>Количество в рецепте *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={newIngredient.quantity}
                  onChange={e => setNewIngredient({...newIngredient, quantity: e.target.value})}
                  className="form-input"
                  placeholder="Например: 1 или 0.150"
                />
              </div>
            </div>
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#f3f4f6', 
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Итого себестоимость:</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                {((parseFloat(newIngredient.quantity) || 0) * (parseFloat(newIngredient.cost) || 0)).toFixed(2)} руб.
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowNewIngredientModal(false)}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary"
                onClick={addNewIngredientAndRecipe}
                disabled={!newIngredient.name || !newIngredient.quantity}
              >
                Создать и добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка импорта рецептов */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileSpreadsheet size={20} style={{ marginRight: '8px' }} />
                Импорт рецептов из Excel
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
                  <li>Товар (обязательно) - название товара из меню</li>
                  <li>Ингредиент (обязательно) - название ингредиента</li>
                  <li>Количество (обязательно)</li>
                  <li>Единица измерения (опционально, по умолчанию "шт")</li>
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
    </div>
  );
}

export default Recipes;
