import React, { useState, useEffect } from 'react';
import { Send, Settings, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

function TelegramSettings() {
  const [settings, setSettings] = useState({
    bot_token: '',
    chat_id: '',
    notify_on_new_order: false,
    notify_on_status_change: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/telegram/settings`);
      const data = await response.json();
      setSettings(data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch(`${FRONTPAD_API}/api/telegram/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setMessage('Настройки сохранены успешно!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Ошибка сохранения настроек');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setMessage('Ошибка сохранения настроек');
    }
    
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage('');
    
    try {
      const response = await fetch(`${FRONTPAD_API}/api/telegram/test`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('Тестовое сообщение отправлено! Проверьте Telegram.');
      } else {
        setMessage('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка теста:', error);
      setMessage('Ошибка отправки тестового сообщения');
    }
    
    setTesting(false);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="telegram-settings-page">
      <div className="page-header">
        <h1>Telegram</h1>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Settings size={24} />
          <h2>Настройки подключения</h2>
        </div>

        <div className="form-group">
          <label className="form-label">Telegram Bot Token</label>
          <input
            type="password"
            className="form-input"
            value={settings.bot_token}
            onChange={(e) => handleChange('bot_token', e.target.value)}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          />
          <p className="form-hint">
            Получите токен у @BotFather в Telegram: /newbot
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Chat ID (или ID группы)</label>
          <input
            type="text"
            className="form-input"
            value={settings.chat_id}
            onChange={(e) => handleChange('chat_id', e.target.value)}
            placeholder="-1001234567890"
          />
          <p className="form-hint">
            Узнать ID: добавьте бота @userinfobot в чат или используйте @myidbot
          </p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={handleTest}
          disabled={testing || !settings.bot_token || !settings.chat_id}
        >
          {testing ? (
            <>
              <RefreshCw size={18} className="spin" /> Отправка...
            </>
          ) : (
            <>
              <Send size={18} /> Отправить тестовое сообщение
            </>
          )}
        </button>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <AlertCircle size={24} />
          <h2>Уведомления</h2>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Уведомления о новых заказах</label>
            <p>Получать сообщение в Telegram при каждом новом заказе</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notify_on_new_order}
              onChange={(e) => handleChange('notify_on_new_order', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Уведомления об изменении статуса</label>
            <p>Сообщать об изменении статуса заказа (готов, доставлен и т.д.)</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notify_on_status_change}
              onChange={(e) => handleChange('notify_on_status_change', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw size={18} className="spin" /> Сохранение...
            </>
          ) : (
            <>
              <Save size={18} /> Сохранить настройки
            </>
          )}
        </button>

        {message && (
          <div className={`message ${message.includes('Ошибка') || message.includes('ошибка') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '12px' }}>📋 Инструкция по настройке</h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Создайте бота в Telegram через @BotFather (команда /newbot)</li>
          <li>Скопируйте токен бота и вставьте выше</li>
          <li>Добавьте бота в вашу группу (если хотите отправлять в группу)</li>
          <li>Узнайте ID группы через @myidbot (отправьте /getgroupid)</li>
          <li>Вставьте ID группы (обычно начинается с -100)</li>
          <li>Нажмите "Сохранить настройки"</li>
          <li>Отправьте тестовое сообщение</li>
        </ol>
      </div>
    </div>
  );
}

export default TelegramSettings;
