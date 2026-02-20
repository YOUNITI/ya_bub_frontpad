import React, { useState, useEffect } from 'react';
import { Printer, Bell, Save, RefreshCw } from 'lucide-react';

// Используем localhost для локальной разработки
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || 'http://localhost:3005';

function Settings() {
  const [settings, setSettings] = useState({
    auto_print_enabled: 'false',
    sound_notifications: 'true',
    print_receipt_on_status_change: 'false'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${FRONTPAD_API}/api/settings`);
      const data = await response.json();
      setSettings(prev => ({ ...prev, ...data }));
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
      for (const [key, value] of Object.entries(settings)) {
        await fetch(`${FRONTPAD_API}/api/settings/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      }
      setMessage('Настройки сохранены успешно!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      setMessage('Ошибка сохранения настроек');
    }
    
    setSaving(false);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Настройки</h1>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Printer size={24} />
          <h2>Печать чеков</h2>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Автоматическая печать чеков</label>
            <p>Автоматически печатать чек при создании нового заказа</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.auto_print_enabled === 'true'}
              onChange={(e) => handleChange('auto_print_enabled', e.target.checked ? 'true' : 'false')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Печать при изменении статуса</label>
            <p>Печатать чек при изменении статуса заказа</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.print_receipt_on_status_change === 'true'}
              onChange={(e) => handleChange('print_receipt_on_status_change', e.target.checked ? 'true' : 'false')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <Bell size={24} />
          <h2>Уведомления</h2>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Звуковые уведомления</label>
            <p>Воспроизводить звук при новом заказе</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.sound_notifications === 'true'}
              onChange={(e) => handleChange('sound_notifications', e.target.checked ? 'true' : 'false')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw size={18} className="spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save size={18} />
              Сохранить настройки
            </>
          )}
        </button>
        
        {message && (
          <div className={`message ${message.includes('Ошибка') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
