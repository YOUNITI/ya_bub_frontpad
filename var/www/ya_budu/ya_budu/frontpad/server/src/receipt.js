import moment from 'moment';
import { exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// SITE_URL из переменных окружения
const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем ОС
const isWindows = os.platform() === 'win32';

// Конфигурация принтера (проверяется динамиically)
const PRINTER_CONFIG = {
  // Имя принтера - из переменной окружения или по умолчанию
  printerName: process.env.PRINTER_NAME || (isWindows ? 'Microsoft Print to PDF' : 'receipt_printer'),
  
  // Функция проверки включена ли печать
  isEnabled: function() {
    // Проверяем переменную окружения или можно добавить проверку настройки из БД
    return process.env.SERVER_PRINT_ENABLED === 'true';
  }
};

// Настройки чека по умолчанию
const DEFAULT_RECEIPT_SETTINGS = {
  receipt_width: '80mm',
  receipt_type: 'receipt',
  font_size: '14',
  print_contrast: '5',
  receipt_logo: '',
  receipt_title: 'Я Буду',
  receipt_header_line1: '',
  receipt_header_line2: '',
  receipt_header_line3: '',
  receipt_header_line4: ''
};

// Получить настройки чека (объединяет настройки из БД с умолчаниями)
async function getReceiptSettings(db) {
  try {
    if (!db) return DEFAULT_RECEIPT_SETTINGS;
    
    const settings = {};
    const keys = Object.keys(DEFAULT_RECEIPT_SETTINGS);
    
    for (const key of keys) {
      try {
        const result = await db.get(`SELECT value FROM settings WHERE \`key\` = ?`, [key]);
        settings[key] = result?.value || DEFAULT_RECEIPT_SETTINGS[key];
      } catch (e) {
        settings[key] = DEFAULT_RECEIPT_SETTINGS[key];
      }
    }
    
    return settings;
  } catch (e) {
    console.log('[Receipt] Ошибка получения настроек:', e.message);
    return DEFAULT_RECEIPT_SETTINGS;
  }
}

// Ширина чеков в пикселях (при 96 DPI)
const RECEIPT_WIDTHS = {
  '50mm': 189,  // ~50mm при 96 DPI
  '58mm': 220,  // ~58mm при 96 DPI
  '80mm': 303   // ~80mm при 96 DPI
};

// Функция серверной печати (Windows через PowerShell или Linux через CUPS)
function printToPrinter(html, orderId) {
  if (!PRINTER_CONFIG.enabled) {
    console.log(`[ServerPrint] Серверная печать отключена (SERVER_PRINT_ENABLED=false)`);
    return { success: false, reason: 'disabled' };
  }

  // Сохраняем HTML во временный файл
  const tempFile = path.join(os.tmpdir(), `receipt_${orderId}_${Date.now()}.html`);
  
  try {
    fs.writeFileSync(tempFile, html, 'utf8');
    console.log(`[ServerPrint] HTML сохранён в: ${tempFile}`);
    
    let printCmd;
    
    if (isWindows) {
      // Windows: используем PowerShell
      printCmd = `powershell -Command "Start-Process -FilePath '${tempFile}' -Verb PrintTo -ArgumentList '${PRINTER_CONFIG.printerName}' -WindowStyle Hidden"`;
    } else {
      // Linux: используем CUPS
      printCmd = `lp -d "${PRINTER_CONFIG.printerName}" -o raw "${tempFile}"`;
    }
    
    return new Promise((resolve) => {
      exec(printCmd, { timeout: 30000 }, (error, stdout, stderr) => {
        // Удаляем временный файл
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {}
        
        if (error) {
          console.error(`[ServerPrint] Ошибка печати:`, error.message);
          console.error(`[ServerPrint] stderr:`, stderr);
          resolve({ success: false, error: error.message, platform: isWindows ? 'windows' : 'linux' });
        } else {
          console.log(`[ServerPrint] Отправлено на принтер "${PRINTER_CONFIG.printerName}"`);
          console.log(`[ServerPrint] stdout:`, stdout);
          resolve({ success: true, jobId: stdout.trim(), platform: isWindows ? 'windows' : 'linux' });
        }
      });
    });
  } catch (error) {
    console.error(`[ServerPrint] Ошибка сохранения файла:`, error);
    return { success: false, error: error.message };
  }
}

// Синхронная версия для вызова из другого кода
function printReceiptSync(html, orderId, forceEnabled = false) {
  // Печать включена если forceEnabled=true или установлена переменная окружения
  const isEnabled = forceEnabled || process.env.SERVER_PRINT_ENABLED === 'true';
  
  if (!isEnabled) {
    console.log(`[ServerPrint] Серверная печать отключена (SERVER_PRINT_ENABLED не установлен)`);
    return { success: false, reason: 'disabled' };
  }

  const tempFile = path.join(os.tmpdir(), `receipt_${orderId}_${Date.now()}.html`);
  
  try {
    fs.writeFileSync(tempFile, html, 'utf8');
    console.log(`[ServerPrint] HTML сохранён в: ${tempFile}`);
    
    let printCmd;
    
    if (isWindows) {
      // Windows: используем PowerShell для печати
      // Сохраняем как PDF и отправляем на принтер
      printCmd = `powershell -Command "Start-Process -FilePath '${tempFile}' -Verb PrintTo -ArgumentList '${PRINTER_CONFIG.printerName}' -WindowStyle Hidden"`;
    } else {
      // Linux: используем CUPS lp
      printCmd = `lp -d "${PRINTER_CONFIG.printerName}" -o raw "${tempFile}"`;
    }
    
    execSync(printCmd, { timeout: 30000 });
    
    // Удаляем временный файл
    try { fs.unlinkSync(tempFile); } catch (e) {}
    
    console.log(`[ServerPrint] Заказ #${orderId} отправлен на принтер "${PRINTER_CONFIG.printerName}"`);
    return { success: true, printer: PRINTER_CONFIG.printerName, platform: isWindows ? 'windows' : 'linux' };
  } catch (error) {
    console.error(`[ServerPrint] Ошибка:`, error.message);
    return { success: false, error: error.message, platform: isWindows ? 'windows' : 'linux' };
  }
}

// Функция парсинга адреса
function parseAddress(address) {
  if (!address) return { street: '', house: '', entrance: '', floor: '', apartment: '' };
  
  const result = { street: '', house: '', entrance: '', floor: '', apartment: '' };
  const parts = address.split(',').map(p => p.trim());
  
  // Предполагаем формат: "Улица, дом, подъезд, этаж, квартира"
  // Или: "Улица, дом, кв/офис"
  
  if (parts.length >= 1) result.street = parts[0] || '';
  if (parts.length >= 2) result.house = parts[1] || '';
  if (parts.length >= 3) result.entrance = parts[2] || '';
  if (parts.length >= 4) result.floor = parts[3] || '';
  if (parts.length >= 5) result.apartment = parts[4] || '';
  
  return result;
}

// Генерация стилей чека на основе настроек
function generateReceiptStyles(settings) {
  const width = RECEIPT_WIDTHS[settings.receipt_width] || RECEIPT_WIDTHS['80mm'];
  const fontSize = parseInt(settings.font_size) || 14;
  const contrast = parseInt(settings.print_contrast) || 5;
  
  // Рассчитываем контрастность (от 0.3 до 1.0)
  const opacity = 0.3 + (contrast / 10) * 0.7;
  
  return `
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
    .line-solid { border-top: 2px solid rgba(0, 0, 0, ${opacity}); margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    .receipt-table td { padding: 4px 0; font-weight: bold; }
    .receipt-table th { padding: 4px 0; font-weight: bold; border-bottom: 2px solid rgba(0, 0, 0, ${opacity}); }
    .total-row { font-weight: bold; font-size: ${fontSize + 2}px; }
    .header-text { font-weight: bold; }
    @media print { 
      body { width: ${width}px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: ${settings.receipt_width} auto; margin: 0; }
    }
  `;
}

// Генерация HTML заголовка чека
function generateReceiptHeader(settings) {
  let headerHTML = '';
  
  // Логотип
  if (settings.receipt_logo) {
    headerHTML += `<img src="${SITE_URL}${settings.receipt_logo}" alt="Logo" style="max-width: ${RECEIPT_WIDTHS[settings.receipt_width] * 0.6}px; max-height: 60px; margin-bottom: 8px;" onerror="this.style.display='none'">`;
  }
  
  // Название
  if (settings.receipt_title) {
    headerHTML += `<div class="header-text" style="font-size: 16px; margin-bottom: 4px;">${settings.receipt_title}</div>`;
  }
  
  // Дополнительные поля (только если заполнены)
  const headerFields = [
    settings.receipt_header_line1,
    settings.receipt_header_line2,
    settings.receipt_header_line3,
    settings.receipt_header_line4
  ].filter(field => field && field.trim() !== '');
  
  if (headerFields.length > 0) {
    headerFields.forEach(field => {
      headerHTML += `<div class="header-text" style="font-size: 12px;">${field}</div>`;
    });
  }
  
  return headerHTML;
}

// Генерация чека (возвращает HTML)
function generateReceiptHTML(order, items, settings = {}) {
  // Объединяем настройки с умолчаниями
  const receiptSettings = { ...DEFAULT_RECEIPT_SETTINGS, ...settings };
  
  const payment = order.payment === 'cash' ? 'Наличные' : order.payment === 'card' ? 'Карта' : 'Онлайн';
  const addr = parseAddress(order.address);
  
  // Формируем строки таблицы
  let itemsHTML = '';
  items.forEach(item => {
    const itemTotal = (parseFloat(item.price) * parseInt(item.quantity || 1)).toFixed(2);
    itemsHTML += `
      <tr>
        <td style="padding: 3px 0; text-align: left;">${item.name}</td>
        <td style="padding: 3px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 3px 0; text-align: right;">${itemTotal}</td>
      </tr>
    `;
  });
  
  // Расчёт скидки и суммы к оплате
  const totalAmount = parseFloat(order.total_amount || 0);
  const discountAmount = parseFloat(order.discount_amount || 0);
  const finalAmount = totalAmount - discountAmount;
  
  const logoHTML = generateReceiptHeader(receiptSettings);
  const styles = generateReceiptStyles(receiptSettings);
  
  // Заголовок чека
  let receiptTitle = 'Чек заказа';
  switch (receiptSettings.receipt_type) {
    case 'goods':
      receiptTitle = 'Товарный чек';
      break;
    case 'goods_double':
      receiptTitle = 'Товарный чек (1/2)';
      break;
    case 'assembly':
      receiptTitle = 'Накладная на сборку';
      break;
    default:
      receiptTitle = 'Чек заказа';
  }
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${receiptTitle} #${order.id}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="center">${logoHTML}</div>
  <div class="line"></div>
  
  <div class="center" style="font-weight: bold;">${moment(order.created_at).format('DD.MM.YYYY HH:mm')}</div>
  <div class="center bold" style="font-size: 18px; margin-top: 8px;">Заказ #${order.id}</div>
  
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
      ${itemsHTML}
    </tbody>
  </table>
  
  <div class="line"></div>
  
  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
    <span>ИТОГО:</span>
    <span>${totalAmount.toFixed(2)}</span>
  </div>
  
  ${discountAmount > 0 ? `
  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
    <span>Скидка:</span>
    <span>-${discountAmount.toFixed(2)}</span>
  </div>
  ${order.discount_reason ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${order.discount_reason}</div>` : ''}
  ` : ''}
  
  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 8px; font-size: 16px;">
    <span>К ОПЛАТЕ:</span>
    <span>${finalAmount.toFixed(2)}</span>
  </div>
  
  <div style="margin-top: 8px; font-weight: bold; font-size: 14px;">Оплата: ${payment}</div>
  
  <div class="line" style="margin-top: 12px;"></div>
  
  <div style="font-weight: bold; font-size: 14px;"><strong>Клиент:</strong> ${order.guest_name || 'Гость'}</div>
  ${addr.street ? `<div style="font-weight: bold;">${addr.street}</div>` : ''}
  ${addr.house ? `<div style="font-weight: bold;">Дом: ${addr.house}</div>` : ''}
  ${addr.entrance ? `<div style="font-weight: bold;">Подъезд: ${addr.entrance}</div>` : ''}
  ${addr.floor ? `<div style="font-weight: bold;">Этаж: ${addr.floor}</div>` : ''}
  ${addr.apartment ? `<div style="font-weight: bold;">Квартира: ${addr.apartment}</div>` : ''}
  <div style="font-weight: bold;">Телефон: ${order.guest_phone || '-'}</div>
  ${order.comment ? `<div style="margin-top: 8px; font-weight: bold;"><strong>Примечание:</strong> ${order.comment}</div>` : ''}
  
  <div class="line" style="margin-top: 12px;"></div>
  
  <div class="center" style="font-size: 12px; margin-top: 8px; font-weight: bold;">Спасибо за заказ!</div>
  <div class="center" style="font-size: 11px; font-weight: bold;">YaBudu - Доставка еды</div>
  
  <script>
    // Печать управляется из клиентского приложения
  </script>
</body>
</html>`;
  
  return html;
}

// Экспорт функций для использования с настройками из БД
export { 
  generateReceiptHTML,
  printToPrinter,
  printReceiptSync,
  PRINTER_CONFIG,
  isWindows,
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings
};
