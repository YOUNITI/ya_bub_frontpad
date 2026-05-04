import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Download, Moon, Sun } from 'lucide-react';
import CartModal from '../../../components/CartModal.jsx';
import InstallModal from '../../../components/InstallModal.jsx';

const NewDesignHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const { getTotalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, isNewDesign } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Отслеживаем возможность установки PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    } else {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowFloatingCart(true);
      } else {
        setShowFloatingCart(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const scrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      setMobileMenuOpen(false);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div>
      <header className="new-design-nav fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img
                  src="/logo.jpg"
                  alt="Логотип"
                  className="h-12 sm:h-16 mr-2 sm:mr-3 filter brightness-0 invert"
                />
              </Link>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link
                to="/"
                className="text-white/80 hover:text-white transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Главная
              </Link>
              <Link
                to="/menu"
                className="text-white/80 hover:text-white transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Меню
              </Link>
              <button
                onClick={() => scrollToSection('about')}
                className="text-white/80 hover:text-white transition-colors font-medium text-sm uppercase tracking-wider bg-transparent border-none cursor-pointer"
              >
                О нас
              </button>
              <button
                onClick={() => scrollToSection('delivery')}
                className="text-white/80 hover:text-white transition-colors font-medium text-sm uppercase tracking-wider bg-transparent border-none cursor-pointer"
              >
                Доставка
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-white/80 hover:text-white transition-colors font-medium text-sm uppercase tracking-wider bg-transparent border-none cursor-pointer"
              >
                Контакты
              </button>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Переключатель тем */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title={isNewDesign ? 'Переключить на светлый дизайн' : 'Переключить на тёмный дизайн'}
              >
                {isNewDesign ? (
                  <Sun className="w-5 h-5 text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {isAuthenticated() ? (
                <>
                  <Link
                    to="/profile"
                    className="hidden sm:flex new-design-button-primary px-4 py-2 items-center gap-2 font-medium text-sm"
                  >
                    <i className="fas fa-user"></i>
                    <span>{user?.name || 'Профиль'}</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="hidden sm:flex new-design-button-secondary px-4 py-2 items-center gap-2 font-medium text-sm"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Выйти</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex new-design-button-primary px-4 py-2 items-center gap-2 font-medium text-sm"
                >
                  <i className="fas fa-user"></i>
                  <span>Войти</span>
                </Link>
              )}

              <button
                onClick={handleInstallClick}
                className="hidden sm:flex bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-3 py-2 rounded-full items-center gap-2 transition-all duration-200 font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Скачать</span>
              </button>

              <button
                onClick={() => setCartModalOpen(true)}
                className="hidden sm:flex relative new-design-button-primary w-10 h-10 sm:w-12 sm:h-12 rounded-full items-center justify-center"
              >
                <i className="fas fa-shopping-cart text-lg sm:text-xl"></i>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCartModalOpen(true)}
                className="sm:hidden relative new-design-button-primary w-10 h-10 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-shopping-cart text-lg"></i>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <button
                onClick={toggleMobileMenu}
                className="md:hidden text-white text-xl sm:text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 border-t border-white/10 pt-4">
              <div className="flex flex-col space-y-3">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/80 hover:text-white transition-colors font-medium py-2 text-lg uppercase tracking-wider"
                >
                  Главная
                </Link>
                <Link
                  to="/menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/80 hover:text-white transition-colors font-medium py-2 text-lg uppercase tracking-wider"
                >
                  Меню
                </Link>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-white/80 hover:text-white transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg uppercase tracking-wider"
                >
                  О нас
                </button>
                <button
                  onClick={() => scrollToSection('delivery')}
                  className="text-white/80 hover:text-white transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg uppercase tracking-wider"
                >
                  Доставка
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-white/80 hover:text-white transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg uppercase tracking-wider"
                >
                  Контакты
                </button>

                {/* Кнопки авторизации для мобильных */}
                {isAuthenticated() ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="new-design-button-primary px-4 py-3 items-center gap-2 font-medium text-center text-lg"
                    >
                      <i className="fas fa-user"></i>
                      <span>{user?.name || 'Профиль'}</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className="new-design-button-secondary px-4 py-3 items-center gap-2 font-medium text-lg"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Выйти</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="new-design-button-primary px-4 py-3 items-center gap-2 font-medium text-center text-lg"
                  >
                    <i className="fas fa-user"></i>
                    <span>Войти</span>
                  </Link>
                )}

                <button
                  onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium py-3 px-4 rounded-xl text-left text-lg"
                >
                  <Download className="w-5 h-5" />
                  Установить приложение
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {showFloatingCart && (
        <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 animate-slideIn">
          <button
            onClick={() => setCartModalOpen(true)}
            className="relative new-design-button-primary w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg hover-lift"
          >
            <i className="fas fa-shopping-cart text-lg sm:text-xl"></i>
            {getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold">
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>
      )}

      <CartModal isOpen={cartModalOpen} onClose={() => setCartModalOpen(false)} />
      <InstallModal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} />
    </div>
  );
};

export default NewDesignHeader;