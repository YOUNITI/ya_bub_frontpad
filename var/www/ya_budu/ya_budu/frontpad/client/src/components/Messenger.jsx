import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Phone, MessageCircle, X, Search } from 'lucide-react';
import { playNotificationSound } from './SoundNotification';

// API URLs - относительные пути для работы через nginx
const FRONTPAD_API = '';
const SITE_API = '';
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';

const Messenger = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchChats();
    setupWebSocket();
    
    // Сбрасываем счётчик непрочитанных сообщений при открытии страницы
    localStorage.setItem('messenger_opened', Date.now().toString());
    window.dispatchEvent(new Event('messenger-opened'));
    
    // Polling fallback каждые 10 секунд
    pollingRef.current = setInterval(fetchChats, 10000);
    
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const setupWebSocket = () => {
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket Messenger подключен');
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket Messenger:', data);
        
        if (data.type === 'new_chat_message' || (data.type === 'new_message' && data.chat_id)) {
          // Воспроизводим звук
          playNotificationSound('message');
          // Обновляем список чатов
          fetchChats();
          
          // Если открыт чат с этим клиентом - добавляем сообщение напрямую
          if (selectedChat && selectedChat.id === data.chat_id) {
            // Добавляем сообщение в состояние
            const newMsg = {
              id: Date.now(),
              chat_id: data.chat_id,
              message: data.message,
              content: data.message,
              sender: 'customer',
              sender_name: data.customer_name || 'Клиент',
              created_at: new Date().toISOString(),
              is_admin: 0
            };
            setMessages(prev => [...prev, newMsg]);
            setTimeout(scrollToBottom, 100);
          }
          // Если чат не выбран - показываем уведомление
          if (!selectedChat) {
            setNewMessageAlert(data.customer_name + ': ' + (data.message || 'Новое сообщение'));
            setTimeout(() => setNewMessageAlert(null), 5000);
          }
        }
        
        // Также обновляем если пришло любое сообщение
        if (data.type === 'new_message' || data.type === 'message_sent') {
          if (selectedChat) {
            // Добавляем сообщение если это от клиента
            if (data.message && data.chat_id === selectedChat.id) {
              const newMsg = {
                id: Date.now(),
                chat_id: data.chat_id,
                message: data.message,
                content: data.message,
                sender: 'customer',
                sender_name: data.customer_name || 'Клиент',
                created_at: new Date().toISOString(),
                is_admin: 0
              };
              setMessages(prev => [...prev, newMsg]);
              setTimeout(scrollToBottom, 100);
            } else {
              // Или просто перезагружаем
              fetchMessages(selectedChat.id);
            }
          }
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket Messenger отключен');
      };
    } catch (err) {
      console.error('WebSocket ошибка:', err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      // Сбрасываем unread_count на сервере
      markChatAsRead(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/chats`);
      setChats(response.data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axios.get(`${FRONTPAD_API}/api/chats/${chatId}`);
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markChatAsRead = async (chatId) => {
    try {
      await axios.post(`${FRONTPAD_API}/api/chats/${chatId}/read`);
      // Обновляем локально
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, unread_count: 0 } : chat
      ));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      formData.append('sender', 'admin');
      formData.append('sender_name', 'Admin');

      await axios.post(`${FRONTPAD_API}/api/chats/${selectedChat.id}/messages`, formData);
      setNewMessage('');
      fetchMessages(selectedChat.id);
      fetchChats(); // Обновить список чатов
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const filteredChats = chats.filter(chat => 
    (chat.customer_name || chat.name) && (chat.customer_name || chat.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Показать уведомление о новом сообщении
  const [newMessageAlert, setNewMessageAlert] = useState(null);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        Загрузка чатов...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '16px' }}>
      {/* Уведомление о новом сообщении */}
      {newMessageAlert && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: '#3b82f6', 
          color: 'white', 
          padding: '16px 24px', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Новое сообщение!</div>
          <div style={{ fontSize: '14px' }}>{newMessageAlert}</div>
        </div>
      )}
      {/* Список чатов */}
      <div style={{ 
        width: '320px', 
        background: 'white', 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
            <MessageCircle size={20} style={{ marginRight: '8px', display: 'inline' }} />
            Сообщения
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Поиск клиентов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              Чатов пока нет
            </div>
          ) : (
            filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  background: selectedChat?.id === chat.id ? '#f0f9ff' : 'white',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = selectedChat?.id === chat.id ? '#f0f9ff' : '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = selectedChat?.id === chat.id ? '#f0f9ff' : 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={20} color="#4338ca" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {chat.customer_name || chat.name || 'Клиент'}
                      {chat.unread_count > 0 && (
                        <span style={{ 
                          background: '#3b82f6', 
                          color: 'white', 
                          borderRadius: '50%', 
                          width: '8px', 
                          height: '8px',
                          display: 'inline-block'
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.last_message || 'Нет сообщений'}
                    </div>
                  </div>
                  {chat.last_message_time && (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {formatTime(chat.last_message_time)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Окно чата */}
      {selectedChat ? (
        <div style={{ 
          flex: 1, 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Заголовок */}
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={18} color="#4338ca" />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {selectedChat.customer_name || selectedChat.name || 'Клиент'}
                </div>
                {selectedChat.email && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {selectedChat.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Сообщения */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f9fafb' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px' }}>
                Нет сообщений
              </div>
            ) : (
              messages.map((msg, idx) => {
                const showDate = idx === 0 || formatDate(messages[idx - 1].created_at) !== formatDate(msg.created_at);
                const isAdmin = msg.sender === 'admin' || msg.is_admin === 1 || msg.is_admin === true;

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '12px', color: '#9ca3af' }}>
                        {formatDate(msg.created_at)}
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                      marginBottom: '8px'
                    }}>
                      {!isAdmin && (
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '8px',
                          marginTop: '4px'
                        }}>
                          <User size={14} color="#6b7280" />
                        </div>
                      )}
                      <div style={{ 
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isAdmin ? '#3b82f6' : 'white',
                        color: isAdmin ? 'white' : '#374151',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        {msg.image_url && (
                          <img 
                            src={`${SITE_API}/uploads/${msg.image_url}`}
                            alt="Вложение"
                            style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }}
                          />
                        )}
                        {msg.cart_data && (
                          <div style={{ 
                            background: isAdmin ? '#2563eb' : '#fef3c7',
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            fontSize: '13px'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                              🛒 Корзина
                            </div>
                            {JSON.parse(msg.cart_data).map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>{item.name} ×{item.quantity}</span>
                                <span>{item.price * item.quantity} ₽</span>
                              </div>
                            ))}
                            <div style={{ fontWeight: '600', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                              Итого: {msg.cart_total} ₽
                            </div>
                          </div>
                        )}
                        {msg.message || msg.content && (
                          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                            {msg.message || msg.content}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '10px', 
                          marginTop: '4px',
                          opacity: 0.7,
                          textAlign: 'right'
                        }}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          background: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '8px',
                          marginTop: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '12px' }}>A</span>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px'
          }}>
            <input
              type="text"
              className="form-input"
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              style={{ padding: '10px 20px' }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          flex: 1, 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }}>
          <div style={{ textAlign: 'center' }}>
            <MessageCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div>Выберите чат для просмотра переписки</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messenger;
