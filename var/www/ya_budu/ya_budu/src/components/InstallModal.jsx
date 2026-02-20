import React, { useState, useEffect } from 'react';
import { X, Smartphone, Check, Monitor, Download } from 'lucide-react';

function InstallModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Проверяем, может ли браузер установить
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isOpen]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstalled(true);
      // Показываем уведомление
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ЯБУДУ установлен!', {
          body: 'Приложение добавлено на рабочий стол',
          icon: '/icons/icon-192x192.png'
        });
      }
    }
    
    setInstalling(false);
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-yellow-500/30 rounded-2xl max-w-sm w-full animate-slide-up">
        {/* Заголовок */}
        <div className="p-6 text-center border-b border-gray-800">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isDesktop ? <Monitor className="w-8 h-8 text-black" /> : <Smartphone className="w-8 h-8 text-black" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">ЯБУДУ</h2>
          <p className="text-gray-400">Приложение для заказа еды</p>
        </div>

        {/* Контент */}
        <div className="p-6">
          {installed ? (
            // Уже установлено
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="text-green-500 font-semibold text-lg">Приложение установлено!</p>
              <p className="text-gray-400 mt-2">Найдите иконку на рабочем столе</p>
            </div>
          ) : isDesktop && canInstall ? (
            // Компьютер - можно установить
            <div className="space-y-4">
              <p className="text-white text-center">Установите приложение на компьютер:</p>
              
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Установить на рабочий стол</p>
                    <p className="text-gray-400 text-sm">Windows / Mac / Linux</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Быстрый доступ из меню Пуск
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Работает без браузера
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Уведомления о заказах
                  </li>
                </ul>
              </div>

              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {installing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Установка...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Установить приложение
                  </>
                )}
              </button>
            </div>
          ) : isDesktop && !canInstall ? (
            // Компьютер - нельзя установить (не Chrome/Edge)
            <div className="text-center space-y-4">
              <p className="text-yellow-500 font-semibold">Откройте в Chrome или Edge</p>
              <p className="text-gray-400 text-sm">Для установки на компьютер используйте браузер Chrome или Edge</p>
              
              <div className="flex justify-center gap-4 my-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">🌐</div>
                  <p className="text-white text-sm">Chrome</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">🌊</div>
                  <p className="text-white text-sm">Edge</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Или установите на телефон:</p>
                <p className="text-yellow-500 font-mono mt-1">yabudu.ru</p>
              </div>
            </div>
          ) : isIOS ? (
            // iPhone инструкция
            <div className="space-y-4">
              <p className="text-yellow-500 font-semibold text-center">Установите на iPhone за 3 шага:</p>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <p className="text-white font-medium">Нажмите кнопку "Поделиться"</p>
                  <p className="text-gray-400 text-sm">внизу экрана Safari</p>
                  <div className="mt-2 text-3xl">⎋</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <p className="text-white font-medium">Прокрутите меню вниз</p>
                  <p className="text-gray-400 text-sm">и выберите "На экран Домой"</p>
                  <div className="mt-2 bg-gray-800 rounded-lg p-3 text-left">
                    <span className="text-2xl mr-2">🏠</span>
                    <span className="text-white">На экран Домой</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <p className="text-white font-medium">Нажмите "Добавить"</p>
                </div>
              </div>
            </div>
          ) : (
            // Android инструкция
            <div className="space-y-4">
              <p className="text-green-500 font-semibold text-center">Установите на Android:</p>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <p className="text-white font-medium">Нажмите ⋮ в Chrome</p>
                  <p className="text-gray-400 text-sm">в правом верхнем углу</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <p className="text-white font-medium">Выберите "Установить приложение"</p>
                  <div className="mt-2 bg-gray-800 rounded-lg p-3 text-left">
                    <span className="text-2xl mr-2">⬇️</span>
                    <span className="text-white">Установить приложение</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <p className="text-white font-medium">Нажмите "Установить"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка закрытия */}
        <div className="p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all duration-200"
          >
            {installed ? 'Отлично!' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallModal;