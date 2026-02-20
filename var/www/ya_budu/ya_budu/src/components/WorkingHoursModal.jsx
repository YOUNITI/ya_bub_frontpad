import React, { useState, useEffect } from 'react';

// Время работы ресторана
const WORKING_HOURS = {
  // Пн-Чт
  1: { open: '11:00', close: '22:00' },
  2: { open: '11:00', close: '22:00' },
  3: { open: '11:00', close: '22:00' },
  4: { open: '11:00', close: '22:00' },
  // Пт-Сб
  5: { open: '11:00', close: '23:00' },
  6: { open: '11:00', close: '23:00' },
  // Вс
  0: { open: '11:00', close: '22:00' }
};

// Проверить, открыт ли сейчас
const isOpenNow = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  const hoursSchedule = WORKING_HOURS[day];
  if (!hoursSchedule) return { isOpen: false, nextOpen: '11:00', nextDay: 'ПН' };
  
  if (time >= hoursSchedule.open && time <= hoursSchedule.close) {
    return { isOpen: true };
  }
  
  // Найти следующее время открытия
  if (time > hoursSchedule.close) {
    // Сегодня уже закрыт, ищем следующий день
    const nextDay = (day + 1) % 7;
    const nextHours = WORKING_HOURS[nextDay];
    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return { 
      isOpen: false, 
      nextOpen: nextHours.open, 
      nextDay: dayNames[nextDay],
      todayClose: hoursSchedule.close
    };
  }
  
  // Ещё не открылся сегодня
  return { 
    isOpen: false, 
    nextOpen: hoursSchedule.open, 
    nextDay: null,
    todayOpen: hoursSchedule.open
  };
};

// Получить текст статуса
const getStatusText = (status) => {
  if (status.isOpen) {
    return { text: 'Открыты', color: 'text-green-600' };
  }
  
  if (status.nextDay) {
    return { 
      text: `Откроемся ${status.nextDay} в ${status.nextOpen}`, 
      color: 'text-red-600' 
    };
  }
  
  return { 
    text: `Откроемся сегодня в ${status.nextOpen}`, 
    color: 'text-yellow-600' 
  };
};

const WorkingHoursModal = ({ onClose }) => {
  const [status, setStatus] = useState(isOpenNow());
  const [showModal, setShowModal] = useState(false);
  const [debug, setDebug] = useState('');

  // Получаем ключ для sessionStorage на основе текущей даты
  function getDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }

  useEffect(() => {
    // Проверяем, не закрыл ли пользователь окно ранее
    const dismissedKey = `workingHoursModalDismissed_${getDateKey()}`;
    const isDismissed = sessionStorage.getItem(dismissedKey);
    
    setDebug(`status.isOpen=${status.isOpen}, isDismissed=${isDismissed}`);
    
    // Показываем модалку только если закрыто и пользователь ещё не закрывал сегодня
    if (!status.isOpen && !isDismissed) {
      setShowModal(true);
    }
    
    // Обновляем статус каждую минуту
    const interval = setInterval(() => {
      const newStatus = isOpenNow();
      setStatus(newStatus);
      if (newStatus.isOpen) {
        setShowModal(false);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [status.isOpen]);

  // Обработчик закрытия
  const handleClose = () => {
    setShowModal(false);
    sessionStorage.setItem(`workingHoursModalDismissed_${getDateKey()}`, 'true');
    if (onClose) onClose();
  };

  if (!showModal) {
    console.log('WorkingHoursModal: скрыто -', debug);
    return null;
  }

  const statusInfo = getStatusText(status);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-bounce-in">
        {/* Иконка */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">🕐</span>
          </div>
        </div>
        
        {/* Заголовок */}
        <h2 className="text-2xl font-bold text-center mb-2">
          {status.isOpen ? 'Мы открыты!' : 'Мы закрыты'}
        </h2>
        
        {/* Статус */}
        <p className={`text-center text-lg font-medium mb-6 ${statusInfo.color}`}>
          {statusInfo.text}
        </p>
        
        {/* Время работы */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-bold mb-3 text-center">Время работы</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Пн-Чт:</span>
              <span>11:00 - 22:00</span>
            </div>
            <div className="flex justify-between">
              <span>Пт-Сб:</span>
              <span>11:00 - 23:00</span>
            </div>
            <div className="flex justify-between">
              <span>Вс:</span>
              <span>11:00 - 22:00</span>
            </div>
          </div>
        </div>
        
        {/* Кнопка */}
        <button
          onClick={handleClose}
          className="w-full bg-brand-yellow text-brand-black py-3 rounded-xl font-bold hover:bg-yellow-500 transition-colors"
        >
          Понятно
        </button>
      </div>
      
      {/* Анимация */}
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// Компонент для показа статуса в реальном времени
export const WorkingHoursStatus = ({ showModal = false, onModalClose }) => {
  const [status, setStatus] = useState(isOpenNow());
  const [showModalState, setShowModalState] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(isOpenNow());
    }, 60000); // Обновляем каждую минуту
    
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setShowModalState(false);
    onModalClose?.();
  };

  const statusInfo = getStatusText(status);

  return (
    <>
      {/* Статус в углу */}
      <div 
        className="fixed top-4 right-4 z-40 bg-white rounded-full shadow-lg px-4 py-2 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setShowModalState(true)}
      >
        <span className={`font-medium ${statusInfo.color}`}>
          {status.isOpen ? '🟢 Открыто' : '🔴 Закрыто'}
        </span>
      </div>
      
      {/* Модалка */}
      {(showModal || showModalState) && (
        <WorkingHoursModal onClose={handleClose} />
      )}
    </>
  );
};

export default WorkingHoursModal;
