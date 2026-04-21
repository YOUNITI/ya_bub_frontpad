import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  });
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [selectedSizes, setSelectedSizes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Функция для получения размеров продукта
  const fetchProductSizes = async (productId) => {
    try {
      const response = await axios.get(`/api/products/${productId}/sizes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Ошибка загрузки размеров для продукта ${productId}:`, error);
      return [];
    }
  };

  // Сохранение размеров и дополнений
  const saveProductSizes = async (productId) => {
    const sizes = selectedSizes[productId] || [];

    // Сначала сохраняем размеры
    for (const size of sizes) {
      try {
        if (size.id) {
          // Обновляем существующий размер
          await axios.put(`/api/products/sizes/${size.id}`, {
            name: size.name,
            price: size.price
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // Создаем новый размер
          const response = await axios.post('/api/products/sizes', {
            product_id: productId,
            name: size.name,
            price: size.price
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Обновляем ID размера в состоянии
          size.id = response.data.id;
        }
      } catch (error) {
        console.error(`Ошибка сохранения размера ${size.name}:`, error);
        throw error;
      }
    }

    // Затем сохраняем дополнения для каждого размера
    for (const size of sizes) {
      // Проверяем, что размер действительно существует в базе перед сохранением допов
      let sizeExists = false;
      try {
        const sizeCheck = await axios.get(`/api/products/${productId}/sizes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sizeExists = sizeCheck.data.some(s => s.id === size.id);
      } catch (e) {
        console.error(`Ошибка проверки существования размера ${size.id}:`, e.message);
      }

      if (!sizeExists) {
        console.error(`Размер ${size.id} не найден в базе, пропускаем допы`);
        continue;
      }

      if (size.addons && size.addons.length > 0) {
        try {
          await axios.post(`/api/products/${productId}/sizes/${size.id}/addons`, size.addons, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error(`Ошибка сохранения дополнений для размера ${size.name}:`, error);
          throw error;
        }
      }
    }
  };

  // Функция повторного сохранения с обработкой ошибок
  const retrySaveWithSizeValidation = async (productId) => {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const sizes = selectedSizes[productId] || [];
        let allSuccess = true;

        for (const size of sizes) {
          // Проверяем существование размера перед каждой попыткой
          let sizeExists = false;
          try {
            const sizeCheck = await axios.get(`/api/products/${productId}/sizes`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            sizeExists = sizeCheck.data.some(s => s.id === size.id);
          } catch (e) {
            console.error(`Ошибка проверки существования размера ${size.id}:`, e.message);
          }

          if (!sizeExists) {
            console.error(`Размер ${size.id} не найден в базе, пропускаем на этой попытке`);
            allSuccess = false;
            break;
          }

          if (size.addons && size.addons.length > 0) {
            try {
              await axios.post(`/api/products/${productId}/sizes/${size.id}/addons`, size.addons, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (error) {
              console.error(`Ошибка сохранения дополнений для размера ${size.name}, попытка ${retries + 1}:`, error);
              allSuccess = false;
              break;
            }
          }
        }

        if (allSuccess) {
          console.log('Все дополнения успешно сохранены');
          return true;
        }
      } catch (error) {
        console.error(`Ошибка при повторной попытке сохранения, попытка ${retries + 1}:`, error);
      }

      retries++;
      if (retries < maxRetries) {
        console.log(`Ожидание перед повторной попыткой... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Увеличиваем задержку с каждой попыткой
      }
    }

    return false;
  };

  // Обработчики событий
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/products', newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Если есть размеры для нового продукта, сохраняем их
      if (selectedSizes[newProduct.name]) {
        // Нужно получить ID нового продукта для сохранения размеров
        const productsRes = await axios.get('/api/products', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const createdProduct = productsRes.data.find(p => p.name === newProduct.name);
        if (createdProduct) {
          await saveProductSizes(createdProduct.id);
        }
      }
      
      setNewProduct({ name: '', description: '', price: '', category_id: '', image_url: '' });
      setProducts(await axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } }).data);
      setSuccess('Продукт добавлен успешно');
    } catch (error) {
      setError(error.response?.data?.message || 'Ошибка при добавлении продукта');
    }
  };

  const handleUpdateProduct = async (id) => {
    try {
      await axios.put(`/api/products/${id}`, editingProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Сохраняем размеры и дополнения
      await saveProductSizes(id);

      setEditingProduct(null);
      setProducts(await axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } }).data);
      setSuccess('Продукт обновлен успешно');
    } catch (error) {
      setError(error.response?.data?.message || 'Ошибка при обновлении продукта');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот продукт?')) {
      try {
        await axios.delete(`/api/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(products.filter(product => product.id !== id));
        setSuccess('Продукт удален успешно');
      } catch (error) {
        setError(error.response?.data?.message || 'Ошибка при удалении продукта');
      }
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/categories', newCategory, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewCategory({ name: '' });
      setCategories(await axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } }).data);
      setSuccess('Категория добавлена успешно');
    } catch (error) {
      setError(error.response?.data?.message || 'Ошибка при добавлении категории');
    }
  };

  const handleUpdateCategory = async (id) => {
    try {
      await axios.put(`/api/categories/${id}`, editingCategory, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingCategory(null);
      setCategories(await axios.get('/api/categories', { headers: { Authorization: `Bearer ${token}` } }).data);
      setSuccess('Категория обновлена успешно');
    } catch (error) {
      setError(error.response?.data?.message || 'Ошибка при обновлении категории');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      try {
        await axios.delete(`/api/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(categories.filter(category => category.id !== id));
        setSuccess('Категория удалена успешно');
      } catch (error) {
        setError(error.response?.data?.message || 'Ошибка при удалении категории');
      }
    }
  };

  const addSize = (productId) => {
    const newSize = { name: '', price: '', addons: [] };
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: [...(prev[productId] || []), newSize]
    }));
  };

  const updateSize = (productId, index, field, value) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: prev[productId].map((size, i) => 
        i === index ? { ...size, [field]: value } : size
      )
    }));
  };

  const addAddon = (productId, sizeIndex) => {
    const newAddon = { name: '', price: '' };
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: prev[productId].map((size, i) => 
        i === sizeIndex 
          ? { ...size, addons: [...(size.addons || []), newAddon] } 
          : size
      )
    }));
  };

  const updateAddon = (productId, sizeIndex, addonIndex, field, value) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: prev[productId].map((size, i) => 
        i === sizeIndex 
          ? { 
              ...size, 
              addons: size.addons.map((addon, j) => 
                j === addonIndex ? { ...addon, [field]: value } : addon
              ) 
            } 
          : size
      )
    }));
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Управление продуктами</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      {/* Форма добавления продукта */}
      <form onSubmit={handleAddProduct} className="mb-8 p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-semibold mb-4">Добавить новый продукт</h2>
        <input
          type="text"
          placeholder="Название"
          value={newProduct.name}
          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
          className="w-full p-2 mb-2 border rounded"
          required
        />
        <textarea
          placeholder="Описание"
          value={newProduct.description}
          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
          className="w-full p-2 mb-2 border rounded"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Цена"
          value={newProduct.price}
          onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || ''})}
          className="w-full p-2 mb-2 border rounded"
          required
        />
        <select
          value={newProduct.category_id}
          onChange={(e) => setNewProduct({...newProduct, category_id: parseInt(e.target.value)})}
          className="w-full p-2 mb-2 border rounded"
          required
        >
          <option value="">Выберите категорию</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="URL изображения"
          value={newProduct.image_url}
          onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
          className="w-full p-2 mb-2 border rounded"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Добавить продукт</button>
      </form>

      {/* Форма добавления категории */}
      <form onSubmit={handleAddCategory} className="mb-8 p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-semibold mb-4">Добавить новую категорию</h2>
        <input
          type="text"
          placeholder="Название категории"
          value={newCategory.name}
          onChange={(e) => setNewCategory({name: e.target.value})}
          className="w-full p-2 mb-2 border rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Добавить категорию</button>
      </form>

      {/* Список продуктов */}
      <div className="space-y-6">
        {products.map(product => (
          <div key={product.id} className="border p-4 rounded">
            {editingProduct?.id === product.id ? (
              <div>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full p-2 mb-2 border rounded"
                />
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 mb-2 border rounded"
                />
                <select
                  value={editingProduct.category_id}
                  onChange={(e) => setEditingProduct({...editingProduct, category_id: parseInt(e.target.value)})}
                  className="w-full p-2 mb-2 border rounded"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingProduct.image_url}
                  onChange={(e) => setEditingProduct({...editingProduct, image_url: e.target.value})}
                  className="w-full p-2 mb-2 border rounded"
                />
                <button 
                  onClick={() => handleUpdateProduct(product.id)} 
                  className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-600"
                >
                  Сохранить
                </button>
                <button 
                  onClick={() => setEditingProduct(null)} 
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p>{product.description}</p>
                <p>Цена: {product.price}</p>
                <p>Категория: {categories.find(c => c.id === product.category_id)?.name}</p>
                <p>Изображение: {product.image_url}</p>
                <div className="flex space-x-2 mt-2">
                  <button 
                    onClick={() => setEditingProduct(product)} 
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Редактировать
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)} 
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Удалить
                  </button>
                </div>
                
                {/* Управление размерами */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Размеры:</h4>
                  {(selectedSizes[product.id] || []).map((size, index) => (
                    <div key={index} className="mb-4 p-3 bg-gray-100 rounded">
                      <input
                        type="text"
                        placeholder="Название размера"
                        value={size.name}
                        onChange={(e) => updateSize(product.id, index, 'name', e.target.value)}
                        className="w-full p-2 mb-2 border rounded"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Цена размера"
                        value={size.price}
                        onChange={(e) => updateSize(product.id, index, 'price', parseFloat(e.target.value) || '')}
                        className="w-full p-2 mb-2 border rounded"
                      />
                      
                      {/* Дополнения */}
                      <div className="mt-2">
                        <h5 className="font-medium mb-1">Дополнения:</h5>
                        {(size.addons || []).map((addon, addonIndex) => (
                          <div key={addonIndex} className="flex space-x-2 mb-1">
                            <input
                              type="text"
                              placeholder="Название допа"
                              value={addon.name}
                              onChange={(e) => updateAddon(product.id, index, addonIndex, 'name', e.target.value)}
                              className="flex-1 p-1 border rounded"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Цена допа"
                              value={addon.price}
                              onChange={(e) => updateAddon(product.id, index, addonIndex, 'price', parseFloat(e.target.value) || '')}
                              className="w-24 p-1 border rounded"
                            />
                          </div>
                        ))}
                        <button 
                          onClick={() => addAddon(product.id, index)} 
                          className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          Добавить доп
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => addSize(product.id)} 
                    className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Добавить размер
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;