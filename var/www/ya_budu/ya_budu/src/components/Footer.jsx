import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-brand-black text-white py-8 sm:py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center md:flex-row md:justify-between md:items-start gap-6 md:gap-0">
          {/* Логотип */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-3 sm:mb-4">
              <div className="bg-brand-yellow text-brand-black p-2 sm:p-3 rounded-full mr-2 sm:mr-3">
                <i className="fas fa-hamburger text-xl sm:text-2xl"></i>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading">
                <span className="text-brand-yellow">Я</span>БУДУ
              </h2>
            </div>
            <p className="text-gray-400 text-sm sm:text-base">
              Быстрая доставка вкусного фаст-фуда
            </p>
          </div>

          {/* Ссылки на документы */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-8">
            <Link to="/terms" className="text-gray-400 hover:text-brand-yellow transition-colors text-xs sm:text-sm text-center">
              Пользовательское соглашение
            </Link>
            <Link to="/privacy" className="text-gray-400 hover:text-brand-yellow transition-colors text-xs sm:text-sm text-center">
              Политика конфиденциальности
            </Link>
          </div>

          {/* Соц. сети */}
          <div className="flex space-x-3 sm:space-x-4">
            <a href="#" className="bg-gray-800 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-brand-yellow hover:text-brand-black transition-colors">
              <i className="fab fa-vk text-lg sm:text-xl"></i>
            </a>
            <a href="#" className="bg-gray-800 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-brand-yellow hover:text-brand-black transition-colors">
              <i className="fab fa-telegram text-lg sm:text-xl"></i>
            </a>
            <a href="#" className="bg-gray-800 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-brand-yellow hover:text-brand-black transition-colors">
              <i className="fab fa-instagram text-lg sm:text-xl"></i>
            </a>
            <a href="#" className="bg-gray-800 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-brand-yellow hover:text-brand-black transition-colors">
              <i className="fab fa-whatsapp text-lg sm:text-xl"></i>
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
          <p className="text-gray-400 mb-1 sm:mb-2 text-sm sm:text-base">© {new Date().getFullYear()} ЯБУДУ. Все права защищены.</p>
          <p className="text-gray-500 text-xs sm:text-sm">Сайт создан с ❤️ для любителей вкусной еды</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
