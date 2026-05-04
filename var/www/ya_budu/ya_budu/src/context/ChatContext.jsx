import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, WS_URL } from '../config';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

const ChatContext = createContext();

// Глобальная функция для открытия чата - доступна сразу
let globalOpenChat = null;
let globalCloseChat = null;

export const openChatGlobal = () => {
  if (globalOpenChat) {
    globalOpenChat();
  }
};

export const closeChatGlobal = () => {
  if (globalCloseChat) {
    globalCloseChat();
  }
};

export const ChatProvider = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { items: cartItems, getTotal } = useCart();
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const pollingRef = useRef(null);
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

  // WebSocket подключение
  useEffect(() => {
    isMountedRef.current = true;
    
    const connectWebSocket = () => {
      if (!isMountedRef.current) return;
      
      // Проверяем, не закрыто ли уже соединение
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      
      try {
        wsRef.current = new WebSocket(WS_URL);
        
        wsRef.current.onopen = () => {
          if (!isMountedRef.current) {
            wsRef.current.close();
            return;
          }
          console.log('WebSocket подключен');
        };
        
        wsRef.current.onmessage = (event) => {
          if (!isMountedRef.current) return;
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_message') {
            // Проверяем, что сообщение предназначено этому клиенту
            // Может прийти either sender_id или customer_id
            const isOurMessage = user?.customer_id && (
              data.message.sender_id === user.customer_id ||
              data.customer_id === user.customer_id
            );
            
            if (isOurMessage) {
              fetchMessages();
              if (!isChatOpen) {
                setUnreadCount(prev => prev + 1);
              }
              if (!isChatOpen) {
                setIsChatOpen(true);
              }
            }
          }
        };
        
        wsRef.current.onclose = () => {
          if (!isMountedRef.current) return;
          console.log('WebSocket отключен, переподключение через 3 сек...');
          setTimeout(connectWebSocket, 3000);
        };
        
        wsRef.current.onerror = (err) => {
          if (!isMountedRef.current) return;
          console.error('WebSocket ошибка:', err);
        };
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Ошибка создания WebSocket:', err);
        }
      }
    };
    
    connectWebSocket();
    
    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Пустой массив зависимостей - подключаемся один раз

  // Добавляем polling для обновления сообщений каждые 5 секунд

  // Функции управления чатом
  const openChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  // Регистрируем глобальные функции сразу при создании
  useEffect(() => {
    globalOpenChat = openChat;
    globalCloseChat = closeChat;
    window.openChatGlobal = openChat;
    window.closeChatGlobal = closeChat;
    
    return () => {
      globalOpenChat = null;
      globalCloseChat = null;
      delete window.openChatGlobal;
      delete window.closeChatGlobal;
    };
  }, [openChat, closeChat]);

  useEffect(() => {
    if (isChatOpen && user?.customer_id) {
      fetchMessages();
      fetchProfile();
      markMessagesAsRead();
      
      // Запускаем polling для обновления сообщений
      pollingRef.current = setInterval(() => {
        if (user?.customer_id) {
          fetchMessages();
        }
      }, 5000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isChatOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Закрытие чата при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        closeChat();
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen, closeChat]);

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

  // sendCart отключена — отправка корзины в чат запрещена
  const sendCart = async () => {
    // Отправка корзины в чат отключена
    return;
  };

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat, messages, newMessage, setNewMessage, sendMessage, cartItems, getTotal, user, loading, unreadCount, messagesEndRef, chatRef }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    return {
      openChat: () => window.openChatGlobal?.(),
      closeChat: () => window.closeChatGlobal?.(),
      toggleChat: () => window.openChatGlobal?.()
    };
  }
  return context;
};
