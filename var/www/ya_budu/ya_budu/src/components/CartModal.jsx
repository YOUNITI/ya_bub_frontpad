import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// Helper to safely extract price as number
const getPriceNumber = (price) => {
  if (typeof price === 'number') return price || 0;
  if (typeof price === 'string') return parseFloat(price.replace(/[₽P\s]/g, '').replace(',', '.')) || 0;
  if (typeof price === 'object' && price !== null) {
    return parseFloat(price.value || price.amount || price.price || 0) || 0;
  }
  return 0;
};

const CartModal = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/order');
  };

  return (
    <>
      {/* Невидимый overlay - не перехватывает клики, только для визуала */}
      <div className="fixed inset-0 pointer-events-none z-40" />
      
      {/* Выдвижная панель корзины */}
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-2xl overflow-y-auto z-50">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold font-heading">Ваша корзина</h3>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl p-2 -mr-2"
              aria-label="Закрыть корзину"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <i className="fas fa-shopping-basket text-6xl text-gray-200 mb-4"></i>
              <p className="text-center text-gray-500 text-lg">Ваша корзина пуста</p>
              <button 
                onClick={onClose}
                className="mt-4 text-brand-yellow font-medium hover:underline"
              >
                Перейти к меню
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm sm:text-base truncate">{item.name}</h4>
                        {/* Размер */}
                        {item.size && (
                          <p className="text-xs sm:text-sm text-gray-600">Размер: {item.size.name}</p>
                        )}
                        {/* Допы */}
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            Допы: {item.addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {/* Size-addons */}
                        {item.sizeAddons && item.sizeAddons.length > 0 && (
                          <p className="text-xs sm:text-sm text-green-600 truncate">
                            + {item.sizeAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-gray-600">{getPriceNumber(item.price).toFixed(2)} ₽ x {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="text-gray-500 hover:text-gray-700 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-200 rounded-full active:scale-95 transition-transform"
                        aria-label="Уменьшить количество"
                      >
                        <i className="fas fa-minus text-xs sm:text-sm"></i>
                      </button>
                      <span className="font-bold w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="text-gray-500 hover:text-gray-700 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-200 rounded-full active:scale-95 transition-transform"
                        aria-label="Увеличить количество"
                      >
                        <i className="fas fa-plus text-xs sm:text-sm"></i>
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 ml-1 sm:ml-2 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-200 rounded-full active:scale-95 transition-transform"
                        aria-label="Удалить товар"
                      >
                        <i className="fas fa-trash text-xs sm:text-sm"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 sticky bottom-0 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-base sm:text-lg font-bold">Итого:</span>
                  <span className="text-xl sm:text-2xl font-bold text-brand-yellow">{Number(getTotal() || 0).toFixed(2)} ₽</span>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 sm:py-4 rounded-full font-bold hover:bg-gray-300 transition-colors text-sm sm:text-base active:scale-95"
                  >
                    Очистить
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="flex-1 bg-brand-yellow text-brand-black py-3 sm:py-4 rounded-full font-bold hover:bg-yellow-500 transition-colors text-sm sm:text-base active:scale-95"
                  >
                    Оформить заказ
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartModal;
