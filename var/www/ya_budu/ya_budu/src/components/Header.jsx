import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Download } from 'lucide-react';
import CartModal from './CartModal.jsx';
import InstallModal from './InstallModal.jsx';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const { getTotalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
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
      <header className="bg-brand-black text-white z-50 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src="/logo.jpg" alt="Логотип" className="h-12 sm:h-16 mr-2 sm:mr-3 logo-transparent" />
              </Link>
            </div>

            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="hover:text-brand-yellow transition-colors font-medium">Главная</Link>
              <Link to="/menu" className="hover:text-brand-yellow transition-colors font-medium">Меню</Link>
              <button onClick={() => scrollToSection('about')} className="hover:text-brand-yellow transition-colors font-medium bg-transparent border-none cursor-pointer">О нас</button>
              <button onClick={() => scrollToSection('delivery')} className="hover:text-brand-yellow transition-colors font-medium bg-transparent border-none cursor-pointer">Доставка</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-brand-yellow transition-colors font-medium bg-transparent border-none cursor-pointer">Контакты</button>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {isAuthenticated() ? (
                <>
                  <Link
                    to="/profile"
                    className="hidden sm:flex bg-brand-yellow text-brand-black px-4 py-2 rounded-full items-center gap-2 hover:bg-yellow-500 transition-colors font-medium text-sm"
                  >
                    <i className="fas fa-user"></i>
                    <span>{user?.name || 'Профиль'}</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="hidden sm:flex bg-gray-700 text-white px-4 py-2 rounded-full items-center gap-2 hover:bg-gray-600 transition-colors font-medium text-sm"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Выйти</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex bg-brand-yellow text-brand-black px-4 py-2 rounded-full items-center gap-2 hover:bg-yellow-500 transition-colors font-medium text-sm"
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
                className="hidden sm:flex relative bg-brand-yellow text-brand-black w-10 h-10 sm:w-12 sm:h-12 rounded-full items-center justify-center hover:bg-yellow-500 transition-colors"
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
                className="sm:hidden relative bg-brand-yellow text-brand-black w-10 h-10 rounded-full flex items-center justify-center hover:bg-yellow-500 transition-colors"
              >
                <i className="fas fa-shopping-cart text-lg"></i>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>

              <button onClick={toggleMobileMenu} className="md:hidden text-white text-xl sm:text-2xl p-2">
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 border-t border-gray-700 pt-4">
              <div className="flex flex-col space-y-3">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-brand-yellow transition-colors font-medium py-2 text-lg">Главная</Link>
                <Link to="/menu" onClick={() => setMobileMenuOpen(false)} className="hover:text-brand-yellow transition-colors font-medium py-2 text-lg">Меню</Link>
                <button onClick={() => scrollToSection('about')} className="hover:text-brand-yellow transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg">О нас</button>
                <button onClick={() => scrollToSection('delivery')} className="hover:text-brand-yellow transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg">Доставка</button>
                <button onClick={() => scrollToSection('contact')} className="hover:text-brand-yellow transition-colors font-medium py-2 text-left bg-transparent border-none cursor-pointer text-lg">Контакты</button>
                
                {/* Кнопки авторизации для мобильных */}
                {isAuthenticated() ? (
                  <>
                    <Link 
                      to="/profile" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="bg-brand-yellow text-brand-black px-4 py-3 rounded-full items-center gap-2 hover:bg-yellow-500 transition-colors font-medium text-center text-lg"
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
                      className="bg-gray-700 text-white px-4 py-3 rounded-full items-center gap-2 hover:bg-gray-600 transition-colors font-medium text-lg"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Выйти</span>
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-brand-yellow text-brand-black px-4 py-3 rounded-full items-center gap-2 hover:bg-yellow-500 transition-colors font-medium text-center text-lg"
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
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 animate-slideIn">
          <button
            onClick={() => setCartModalOpen(true)}
            className="relative bg-brand-yellow text-brand-black w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:bg-yellow-500 transition-colors shadow-lg hover-lift"
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

export default Header;
