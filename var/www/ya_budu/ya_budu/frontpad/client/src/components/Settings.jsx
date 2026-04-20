import React, { useState, useEffect, useRef } from 'react';
import { Printer, Bell, Save, RefreshCw, Type, Zap, FileText, Layout, Eye, X, Maximize2 } from 'lucide-react';

// Используем относительный путь для работы через nginx
const FRONTPAD_API = process.env.REACT_APP_FONTPAD_API || '';

function Settings() {
  const [settings, setSettings] = useState({
    // Существующие настройки
    auto_print_enabled: 'false',
    sound_notifications: 'true',
    print_receipt_on_status_change: 'false',
    
    // Настройки чека (заголовок)
    receipt_logo: '',
    receipt_title: '',
    receipt_header_line1: '',
    receipt_header_line2: '',
    receipt_header_line3: '',
    receipt_header_line4: '',
    
    // Настройки печати
    receipt_width: '80mm',
    receipt_type: 'receipt',
    quick_print_type: 'receipt',
    font_size: '14',
    print_contrast: '5'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('print');
  const [previewHTML, setPreviewHTML] = useState('');
  const [showPreview, setShowPreview] = useState(true); // По умолчанию показываем preview
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Генерируем preview при первом рендере или при изменении настроек
  useEffect(() => {
    if (!loading && activeTab === 'print') {
      generateLocalPreview();
    }
  }, [settings, loading, activeTab]);

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
    // Preview обновляется автоматически через useEffect
  };

  // Генерация preview чека на основе текущих настроек
  const generatePreview = async () => {
    setGeneratingPreview(true);
    try {
      // Создаём тестовый заказ для preview
      const testOrder = {
        id: 999,
        guest_name: 'Тестовый Клиент',
        guest_phone: '+7 (999) 123-45-67',
        address: 'ул. Тестовая, д. 1, кв. 10',
        payment: 'cash',
        total_amount: 1500,
        discount_amount: 100,
        discount_reason: 'Тестовая скидка',
        comment: 'Тестовый комментарий',
        created_at: new Date().toISOString(),
        items: [
          { name: 'Ролл Филадельфия', price: 450, quantity: 2 },
          { name: 'Гунканы с лососем', price: 280, quantity: 1 },
          { name: 'Чизмас', price: 190, quantity: 1 }
        ]
      };
      
      // Отправляем настройки на сервер для генерации preview
      const response = await fetch(`${FRONTPAD_API}/api/settings/receipt-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: testOrder,
          settings: settings
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewHTML(data.html);
        setShowPreview(true);
      } else {
        // Если endpoint не существует, генерируем preview локально
        generateLocalPreview();
      }
    } catch (error) {
      console.error('Ошибка генерации preview:', error);
      generateLocalPreview();
    }
    setGeneratingPreview(false);
  };

  // Локальная генерация preview (fallback)
  const generateLocalPreview = () => {
    const width = { '50mm': 189, '58mm': 220, '80mm': 303 }[settings.receipt_width] || 303;
    const fontSize = parseInt(settings.font_size) || 14;
    const contrast = parseInt(settings.print_contrast) || 5;
    const opacity = 0.3 + (contrast / 10) * 0.7;
    
    const receiptTitle = {
      'receipt': 'Чек заказа',
      'goods': 'Товарный чек',
      'goods_double': 'Товарный чек (1/2)',
      'assembly': 'Накладная на сборку'
    }[settings.receipt_type] || 'Чек заказа';
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${receiptTitle}</title>
  <style>
    @page { size: ${settings.receipt_width} auto; margin: 0; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: ${fontSize}px; 
      width: ${width}px; 
      margin: 0; 
      padding: 10px;
      color: rgba(0, 0, 0, ${opacity});
      box-sizing: border-box;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 2px dashed rgba(0, 0, 0, ${opacity}); margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    .receipt-table td { padding: 4px 0; font-weight: bold; }
    .receipt-table th { padding: 4px 0; font-weight: bold; border-bottom: 2px solid rgba(0, 0, 0, ${opacity}); }
    .total-row { font-weight: bold; font-size: ${fontSize + 2}px; }
    .header-text { font-weight: bold; }
  </style>
</head>
<body>
  <div class="center">
    ${settings.receipt_logo ? `<img src="${settings.receipt_logo}" alt="Logo" style="max-width: ${width * 0.6}px; max-height: 60px; margin-bottom: 8px;">` : ''}
    ${settings.receipt_title ? `<div class="header-text" style="font-size: 16px; margin-bottom: 4px;">${settings.receipt_title}</div>` : ''}
    ${settings.receipt_header_line1 ? `<div class="header-text" style="font-size: 12px;">${settings.receipt_header_line1}</div>` : ''}
    ${settings.receipt_header_line2 ? `<div class="header-text" style="font-size: 12px;">${settings.receipt_header_line2}</div>` : ''}
    ${settings.receipt_header_line3 ? `<div class="header-text" style="font-size: 12px;">${settings.receipt_header_line3}</div>` : ''}
    ${settings.receipt_header_line4 ? `<div class="header-text" style="font-size: 12px;">${settings.receipt_header_line4}</div>` : ''}
  </div>
  <div class="line"></div>
  
  <div class="center" style="font-weight: bold;">${new Date().toLocaleString('ru-RU')}</div>
  <div class="center bold" style="font-size: 18px; margin-top: 8px;">Заказ #999 (PREVIEW)</div>
  
  <div class="line"></div>
  
  <table class="receipt-table">
    <thead>
      <tr style="border-bottom: 2px solid #000;">
        <th style="padding: 4px 0; text-align: left; font-weight: bold;">Наименование</th>
        <th style="padding: 4px 0; text-align: center; font-weight: bold;">Кол-во</th>
        <th style="padding: 4px 0; text-align: right; font-weight: bold;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 3px 0; text-align: left;">Ролл Филадельфия</td><td style="padding: 3px 0; text-align: center;">2</td><td style="padding: 3px 0; text-align: right;">900.00</td></tr>
      <tr><td style="padding: 3px 0; text-align: left;">Гунканы с лососем</td><td style="padding: 3px 0; text-align: center;">1</td><td style="padding: 3px 0; text-align: right;">280.00</td></tr>
      <tr><td style="padding: 3px 0; text-align: left;">Чизмас</td><td style="padding: 3px 0; text-align: center;">1</td><td style="padding: 3px 0; text-align: right;">190.00</td></tr>
    </tbody>
  </table>
  
  <div class="line"></div>
  
  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
    <span>ИТОГО:</span>
    <span>1500.00</span>
  </div>
  
  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
    <span>Скидка:</span>
    <span>-100.00</span>
  </div>
  
  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 8px; font-size: 16px;">
    <span>К ОПЛАТЕ:</span>
    <span>1400.00</span>
  </div>
  
  <div style="margin-top: 8px; font-weight: bold; font-size: 14px;">Оплата: Наличные</div>
  
  <div class="line" style="margin-top: 12px;"></div>
  
  <div style="font-weight: bold; font-size: 14px;"><strong>Клиент:</strong> Тестовый Клиент</div>
  <div style="font-weight: bold;">ул. Тестовая, д. 1, кв. 10</div>
  <div style="font-weight: bold;">Телефон: +7 (999) 123-45-67</div>
  <div style="margin-top: 8px; font-weight: bold;"><strong>Примечание:</strong> Тестовый комментарий</div>
  
  <div class="line" style="margin-top: 12px;"></div>
  
  <div class="center" style="font-size: 12px; margin-top: 8px; font-weight: bold;">Спасибо за заказ!</div>
  <div class="center" style="font-size: 11px; font-weight: bold;">YaBudu - Доставка еды</div>
</body>
</html>`;
    
    setPreviewHTML(html);
    setShowPreview(true);
  };

  // Закрыть preview - больше не используется, preview теперь inline
  // eslint-disable-next-line no-unused-vars
  const closePreview = () => {
    setShowPreview(false);
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

      {/* Табы */}
      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'print' ? 'active' : ''}`}
          onClick={() => setActiveTab('print')}
        >
          <Printer size={18} />
          Печать чеков
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          Уведомления
        </button>
      </div>

      {activeTab === 'print' && (
        <div className="settings-with-preview">
          <div className="settings-panel">
          {/* Настройки чека (заголовок) */}
          <div className="settings-section">
            <div className="section-header">
              <FileText size={24} />
              <h2>Настройки чека</h2>
            </div>

            <div className="setting-group">
              <label>Логотип (URL изображения)</label>
              <input
                type="text"
                value={settings.receipt_logo || ''}
                onChange={(e) => handleChange('receipt_logo', e.target.value)}
                placeholder="/uploads/logo.jpg"
              />
              <span className="setting-hint">Путь к файлу логотипа, например: /uploads/logo.jpg</span>
            </div>

            <div className="setting-group">
              <label>Название в чеке</label>
              <input
                type="text"
                value={settings.receipt_title || ''}
                onChange={(e) => handleChange('receipt_title', e.target.value)}
                placeholder="Я Буду - Доставка еды"
              />
              <span className="setting-hint">Название ресторана, которое будет в чеке</span>
            </div>

            <div className="setting-group">
              <label>Дополнительные поля в заголовке (4 штуки)</label>
              <div className="header-fields">
                <input
                  type="text"
                  value={settings.receipt_header_line1 || ''}
                  onChange={(e) => handleChange('receipt_header_line1', e.target.value)}
                  placeholder="Поле 1 (например, адрес)"
                />
                <input
                  type="text"
                  value={settings.receipt_header_line2 || ''}
                  onChange={(e) => handleChange('receipt_header_line2', e.target.value)}
                  placeholder="Поле 2 (например, телефон)"
                />
                <input
                  type="text"
                  value={settings.receipt_header_line3 || ''}
                  onChange={(e) => handleChange('receipt_header_line3', e.target.value)}
                  placeholder="Поле 3"
                />
                <input
                  type="text"
                  value={settings.receipt_header_line4 || ''}
                  onChange={(e) => handleChange('receipt_header_line4', e.target.value)}
                  placeholder="Поле 4"
                />
              </div>
              <span className="setting-hint">Эти поля добавятся в верх чека. Если пустые - не добавляются.</span>
            </div>
          </div>

          {/* Настройки печати */}
          <div className="settings-section">
            <div className="section-header">
              <Layout size={24} />
              <h2>Настройки печати</h2>
            </div>

            {/* Вид чека - выбор галочкой */}
            <div className="setting-group">
              <label>Вид чека</label>
              <div className="receipt-type-options">
                <label className="checkbox-option">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="receipt"
                    checked={settings.receipt_type === 'receipt'}
                    onChange={(e) => handleChange('receipt_type', e.target.value)}
                  />
                  <span>Чек</span>
                </label>
                <label className="checkbox-option">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="goods"
                    checked={settings.receipt_type === 'goods'}
                    onChange={(e) => handleChange('receipt_type', e.target.value)}
                  />
                  <span>Товарный чек</span>
                </label>
                <label className="checkbox-option">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="goods_double"
                    checked={settings.receipt_type === 'goods_double'}
                    onChange={(e) => handleChange('receipt_type', e.target.value)}
                  />
                  <span>Два товарных</span>
                </label>
                <label className="checkbox-option">
                  <input
                    type="radio"
                    name="receipt_type"
                    value="assembly"
                    checked={settings.receipt_type === 'assembly'}
                    onChange={(e) => handleChange('receipt_type', e.target.value)}
                  />
                  <span>Сборка</span>
                </label>
              </div>
            </div>

            {/* Ширина чековой ленты */}
            <div className="setting-group">
              <label>Ширина чековой ленты</label>
              <select
                value={settings.receipt_width || '80mm'}
                onChange={(e) => handleChange('receipt_width', e.target.value)}
              >
                <option value="50mm">50 мм</option>
                <option value="58mm">58 мм</option>
                <option value="80mm">80 мм</option>
              </select>
              <span className="setting-hint">Ширина чековой ленты вашего принтера</span>
            </div>

            {/* Быстрая печать - выпадающий список */}
            <div className="setting-group">
              <label>Быстрая печать</label>
              <select
                value={settings.quick_print_type || 'receipt'}
                onChange={(e) => handleChange('quick_print_type', e.target.value)}
              >
                <option value="receipt">Обычный чек</option>
                <option value="goods">Товарный чек</option>
                <option value="goods_double">Два товарных чека</option>
                <option value="assembly">Сборка</option>
              </select>
              <span className="setting-hint">Какой чек будет печататься при нажатии кнопки "Печать" на заказе</span>
            </div>

            {/* Размер шрифта - выпадающий список */}
            <div className="setting-group">
              <label>Размер шрифта</label>
              <select
                value={settings.font_size || '14'}
                onChange={(e) => handleChange('font_size', e.target.value)}
              >
                <option value="10">Маленький (10px)</option>
                <option value="12">Маленький (12px)</option>
                <option value="14">Средний (14px)</option>
                <option value="16">Большой (16px)</option>
                <option value="18">Очень большой (18px)</option>
              </select>
            </div>

            {/* Контрастность - отдельная настройка */}
            <div className="setting-group">
              <label>Контрастность текста: {settings.print_contrast || 5}</label>
              <div className="range-slider">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.print_contrast || 5}
                  onChange={(e) => handleChange('print_contrast', e.target.value)}
                />
                <div className="range-labels">
                  <span>Светлый</span>
                  <span>Тёмный</span>
                </div>
              </div>
              <span className="setting-hint">Регулирует яркость текста на чеке (полезно для матричных принтеров)</span>
            </div>

            {/* Кнопка предпросмотра */}
            <div className="setting-group">
              <button 
                className="btn btn-secondary" 
                onClick={generateLocalPreview}
                disabled={generatingPreview}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Eye size={18} />
                {generatingPreview ? 'Обновление...' : 'Обновить'}
              </button>
              <button 
                className="btn btn-secondary preview-toggle-btn"
                onClick={() => setShowPreview(!showPreview)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Maximize2 size={18} />
                {showPreview ? 'Скрыть' : 'Показать'} preview
              </button>
              <span className="setting-hint">Preview обновляется автоматически при изменении настроек</span>
            </div>
          </div>

          {/* Автоматизация */}
          <div className="settings-section">
            <div className="section-header">
              <Zap size={24} />
              <h2>Автоматизация</h2>
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
          </div>

          {/* Inline Preview панель */}
          {showPreview && (
            <div className="preview-panel">
              <div className="preview-header">
                <h3>Предпросмотр чека</h3>
                <button className="preview-close" onClick={() => setShowPreview(false)} title="Скрыть preview">
                  <X size={18} />
                </button>
              </div>
              <div className="preview-content">
                <iframe 
                  srcDoc={previewHTML}
                  title="Предпросмотр чека"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="settings-content">
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
        </div>
      )}

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

      {/* Modal preview removed - now using inline preview */}

      <style>{`
        .settings-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 10px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: #f5f5f5;
        }

        .tab-btn.active {
          background: #007bff;
          color: white;
        }

        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .settings-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .section-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .setting-group {
          margin-bottom: 20px;
        }

        .setting-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 8px;
          color: #333;
        }

        .setting-group input[type="text"],
        .setting-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .setting-group input[type="text"]:focus,
        .setting-group select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }

        .setting-hint {
          display: block;
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }

        .header-fields {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .header-fields input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .receipt-type-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .checkbox-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          background: #f8f9fa;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkbox-option:hover {
          background: #e9ecef;
        }

        .checkbox-option input[type="radio"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .checkbox-option span {
          font-size: 14px;
        }

        .range-slider {
          padding: 10px 0;
        }

        .range-slider input[type="range"] {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          outline: none;
          -webkit-appearance: none;
        }

        .range-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info label {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .setting-info p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: #007bff;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .settings-actions {
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .message {
          padding: 10px 15px;
          border-radius: 6px;
          font-size: 14px;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
        }

        /* Inline Preview Styles */
        .settings-with-preview {
          display: flex;
          gap: 20px;
        }

        .settings-panel {
          flex: 1;
          min-width: 0;
        }

        .preview-panel {
          width: 350px;
          flex-shrink: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 200px);
          position: sticky;
          top: 20px;
        }

        .preview-panel .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #e0e0e0;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }

        .preview-panel .preview-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .preview-panel .preview-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          border-radius: 4px;
        }

        .preview-panel .preview-close:hover {
          background: #e9ecef;
          color: #333;
        }

        .preview-panel .preview-content {
          flex: 1;
          overflow: auto;
          background: #f5f5f5;
          padding: 10px;
        }

        .preview-panel iframe {
          width: 100%;
          height: 500px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .preview-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .preview-toggle-btn {
          background: #6c757d !important;
        }

        .preview-toggle-btn:hover {
          background: #5a6268 !important;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }
      `}</style>
    </div>
  );
}

export default Settings;
