import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';

const ClientChat = () => {
  const { isChatOpen, toggleChat } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { items: cartItems, getTotal } = useCart();
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (isChatOpen && user?.customer_id) {
      fetchMessages();
      fetchProfile();
      markMessagesAsRead();
    }
  }, [isChatOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Закрытие чата при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        toggleChat();
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen, toggleChat]);

  const fetchProfile = async () => {
    if (!user?.customer_id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${user.customer_id}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
    }
  };

  const fetchMessages = async () => {
    if (!user?.customer_id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/${user.customer_id}`);
      const data = await response.json();
      setMessages(data);
      // Подсчитываем непрочитанные сообщения от админа
      const unread = data.filter(m => m.is_admin && !m.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user?.customer_id) {
      alert('Пожалуйста, войдите в аккаунт, чтобы отправить сообщение');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('is_admin', 'false');
      formData.append('sender_id', user.customer_id);

      const response = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    if (!user?.customer_id) return;
    try {
      await fetch(`${API_BASE_URL}/api/messages/${user.customer_id}/read`, {
        method: 'PUT'
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка при отметке сообщений как прочитанных:', error);
    }
  };

  const sendCart = async () => {
    if (!user?.customer_id) {
      alert('Пожалуйста, войдите в аккаунт, чтобы отправить корзину');
      return;
    }
    
    if (cartItems.length === 0) {
      alert('Ваша корзина пуста!');
      return;
    }

    const total = getTotal();
    const cartText = cartItems.map(item => {
      let itemText = `${item.name} x${item.quantity} - ${(Number(item.price || 0) * item.quantity).toFixed(2)} ₽`;
      if (item.size) {
        itemText += `\n   Размер: ${item.size.name}`;
      }
      if (item.addons && item.addons.length > 0) {
        itemText += `\n   Допы: ${item.addons.map(a => a.name).join(', ')}`;
      }
      if (item.sizeAddons && item.sizeAddons.length > 0) {
        itemText += `\n   + ${item.sizeAddons.map(a => a.name).join(', ')}`;
      }
      return itemText;
    }).join('\n');
    const content = `🛒 **КОРЗИНА**\n\n${cartText}\n\n**Итого: ${Number(total || 0).toFixed(2)} ₽**`;

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('is_admin', 'false');
      formData.append('sender_id', user.customer_id);
      formData.append('cart_data', JSON.stringify(cartItems));
      formData.append('cart_total', total.toString());

      const response = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Ошибка при отправке корзины:', error);
    }
  };

  return (
    <>
      {/* Кнопка чата */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-brand-black rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors z-50 active:scale-95"
        style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
        aria-label={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
      >
        <i className={`fas ${isChatOpen ? 'fa-times' : 'fa-pizza-slice'} text-brand-yellow text-lg sm:text-xl`}></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            !
          </span>
        )}
      </button>

      {/* Окно чата */}
      {isChatOpen && (
        <div
          ref={chatRef}
          className="fixed bottom-16 sm:bottom-20 left-2 right-2 sm:left-auto sm:right-6 sm:w-96 h-[70vh] sm:h-[75vh] max-h-[600px] sm:max-h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
        >
          {/* Заголовок */}
          <div className="bg-brand-yellow p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-black rounded-full flex items-center justify-center">
                <i className="fas fa-pizza-slice text-brand-yellow text-xs sm:text-sm"></i>
              </div>
              <span className="font-bold text-brand-black text-sm sm:text-base">Чат с нами</span>
            </div>
            <span className="text-xs text-brand-black bg-white px-2 py-1 rounded-full">
              Онлайн
            </span>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <i className="fas fa-pizza-slice text-4xl mb-3 opacity-30"></i>
                <p className="text-gray-500 text-sm mb-4">Чтобы написать нам, войдите в аккаунт</p>
                <button
                  onClick={() => {
                    closeChat();
                    window.location.href = '/#/login';
                  }}
                  className="bg-black text-white px-6 py-2 rounded-full text-sm hover:bg-gray-900 transition-colors"
                >
                  Войти
                </button>
              </div>
            ) : loading ? (
              <div className="text-center text-gray-500">Загрузка...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                <i className="fas fa-shopping-cart text-3xl mb-2 opacity-30"></i>
                <p>Вы можете добавить товары в корзину и отправить нам корзину,</p>
                <p>мы начнем готовить ваш заказ!</p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'} items-center`}
                >
                  {/* Аватар админа */}
                  {message.is_admin === 1 || message.is_admin === true ? (
                    <div className="w-8 h-8 bg-brand-black rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <i className="fas fa-pizza-slice text-brand-yellow text-xs"></i>
                    </div>
                  ) : null}
                  
                  <div className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 shadow-sm ${
                    message.is_admin === 1 || message.is_admin === true
                      ? 'bg-white border border-gray-200 rounded-tl-none'
                      : 'bg-brand-yellow text-brand-black rounded-tr-none'
                  }`}>
                    {message.image_url && (
                      <img
                        src={message.image_url}
                        alt="Изображение"
                        className="max-w-full h-auto rounded mb-2"
                      />
                    )}
                    {message.content && (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${message.is_admin ? 'text-gray-400' : 'text-brand-black/60'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Иконка пиццы для клиента */}
                  {message.is_admin !== 1 && message.is_admin !== true ? (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                      <span className="text-xs">🍕</span>
                    </div>
                  ) : null}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Блок корзины - отдельно от поля ввода */}
          {user && (
            <div className="p-2 bg-yellow-50 border-t border-yellow-200">
              <button
                onClick={sendCart}
                disabled={cartItems.length === 0}
                className={`w-full py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-colors ${
                  cartItems.length > 0 
                    ? 'bg-brand-yellow text-brand-black hover:bg-yellow-500' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <i className="fas fa-shopping-cart mr-2"></i>
                {cartItems.length > 0 ? `Отправить корзину (${cartItems.length} шт. - ${Number(getTotal() || 0).toFixed(2)} ₽)` : 'Корзина пуста'}
              </button>
            </div>
          )}

          {/* Поле ввода сообщения */}
          {user ? (
            <div className="p-2 sm:p-3 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Введите сообщение..."
                  className="flex-1 border border-gray-300 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                  aria-label="Отправить сообщение"
                >
                  <i className="fas fa-paper-plane text-brand-yellow text-sm"></i>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white border-t border-gray-200 text-center">
              <p className="text-gray-400 text-sm">Войдите, чтобы отправлять сообщения</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ClientChat;
