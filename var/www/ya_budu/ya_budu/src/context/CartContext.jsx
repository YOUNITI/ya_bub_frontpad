import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// Helper function to safely extract price as number
const getPriceNumber = (price) => {
  if (typeof price === 'number') return price || 0;
  if (typeof price === 'string') return parseFloat(price.replace(/[₽P\s]/g, '').replace(',', '.')) || 0;
  if (typeof price === 'object' && price !== null) {
    // MySQL JSON column could return object like {value: 500} or {amount: 500}
    return parseFloat(price.value || price.amount || price.price || 0) || 0;
  }
  return 0;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  // Загрузка корзины из localStorage при инициализации
  useEffect(() => {
    const savedCart = localStorage.getItem('yabuduCart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  // Сохранение корзины в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('yabuduCart', JSON.stringify(items));
  }, [items]);

  const addItem = (productName, price, imageUrl, productId = null, size = null, addons = [], sizeAddons = []) => {
    setItems(prevItems => {
      // Сортируем допы для корректного сравнения
      const sortedAddons = [...addons].sort((a, b) => a.name.localeCompare(b.name));
      const sortedSizeAddons = [...sizeAddons].sort((a, b) => a.name.localeCompare(b.name));
      
      // Ищем товар с такими же параметрами (имя + размер + допы + sizeAddons)
      const existingItem = prevItems.find(item => {
        const itemAddons = (item.addons || []).sort((a, b) => a.name.localeCompare(b.name));
        const itemSizeAddons = (item.sizeAddons || []).sort((a, b) => a.name.localeCompare(b.name));
        
        // Проверяем совпадение имени
        const nameMatch = item.name === productName;
        // Проверяем совпадение размера (учитываем что size может быть null)
        const sizeMatch = (item.size?.name || null) === (size?.name || null);
        // Проверяем совпадение допов (сравниваем по именам)
        const addonsMatch = itemAddons.length === sortedAddons.length && 
          itemAddons.every((a, i) => a.name === sortedAddons[i].name);
        // Проверяем совпадение size-addons
        const sizeAddonsMatch = itemSizeAddons.length === sortedSizeAddons.length && 
          itemSizeAddons.every((a, i) => a.name === sortedSizeAddons[i].name);
        
        return nameMatch && sizeMatch && addonsMatch && sizeAddonsMatch;
      });
      
      if (existingItem) {
        return prevItems.map(item => {
          const itemAddons = (item.addons || []).sort((a, b) => a.name.localeCompare(b.name));
          const itemSizeAddons = (item.sizeAddons || []).sort((a, b) => a.name.localeCompare(b.name));
          const sizeMatch = (item.size?.name || null) === (size?.name || null);
          const addonsMatch = itemAddons.length === sortedAddons.length && 
            itemAddons.every((a, i) => a.name === sortedAddons[i].name);
          const sizeAddonsMatch = itemSizeAddons.length === sortedSizeAddons.length && 
            itemSizeAddons.every((a, i) => a.name === sortedSizeAddons[i].name);
          
          if (item.name === productName && sizeMatch && addonsMatch && sizeAddonsMatch) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      } else {
        // Поддержка как числа, так и строки с валютой
        const priceStr = typeof price === 'number' ? String(price) : price;
        const basePrice = parseFloat(priceStr.replace(/[₽P\s]/g, '').replace(',', '.')) || 0;
        const sizeModifier = parseFloat(size?.price_modifier) || 0;
        const addonsPrice = sortedAddons.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
        const sizeAddonsPrice = sortedSizeAddons.reduce((sum, addon) => {
          const addonPrice = parseFloat(addon.price) || 0;
          const modifier = parseFloat(addon.price_modifier) || 0;
          return sum + addonPrice + modifier;
        }, 0);
        const finalPrice = basePrice + sizeModifier + addonsPrice + sizeAddonsPrice;
        
        return [...prevItems, {
          id: Date.now() + Math.random(), // уникальный ID
          name: productName,
          price: finalPrice,
          basePrice: basePrice,
          imageUrl: imageUrl || 'https://via.placeholder.com/100',
          quantity: 1,
          productId: productId,
          size: size ? { name: size.name, price_modifier: size.price_modifier } : null,
          addons: sortedAddons.map(a => ({ name: a.name, price: a.price })),
          sizeAddons: sortedSizeAddons.map(a => ({ name: a.name, price: a.price, price_modifier: a.price_modifier }))
        }];
      }
    });
  };

  const removeItem = (itemId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + (getPriceNumber(item.price) * item.quantity), 0);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getTotalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
