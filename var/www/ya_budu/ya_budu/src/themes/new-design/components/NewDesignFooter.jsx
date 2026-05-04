import React from 'react';
import { Link } from 'react-router-dom';

const NewDesignFooter = () => {
  return (
    <footer className="new-design-nav border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Логотип и описание */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <img
                src="/logo.jpg"
                alt="Логотип"
                className="h-12 mr-3 filter brightness-0 invert"
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Доставка роллов и суши премиум качества. Быстро, вкусно, свежо.
              Заказывайте онлайн и наслаждайтесь японской кухней у себя дома.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors"
              >
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a
                href="https://vk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors"
              >
                <i className="fab fa-vk text-xl"></i>
              </a>
              <a
                href="tel:+7(999)123-45-67"
                className="text-white/40 hover:text-white transition-colors"
              >
                <i className="fas fa-phone text-xl"></i>
              </a>
            </div>
          </div>

          {/* Навигация */}
          <div>
            <h3 className="new-design-h3 text-sm mb-4">Навигация</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-white/60 hover:text-white transition-colors text-sm">
                  Главная
                </Link>
              </li>
              <li>
                <Link to="/menu" className="text-white/60 hover:text-white transition-colors text-sm">
                  Меню
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    const el = document.getElementById('about');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/60 hover:text-white transition-colors text-sm bg-transparent border-none cursor-pointer text-left"
                >
                  О нас
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    const el = document.getElementById('delivery');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/60 hover:text-white transition-colors text-sm bg-transparent border-none cursor-pointer text-left"
                >
                  Доставка
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    const el = document.getElementById('contact');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-white/60 hover:text-white transition-colors text-sm bg-transparent border-none cursor-pointer text-left"
                >
                  Контакты
                </button>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="new-design-h3 text-sm mb-4">Контакты</h3>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a
                  href="tel:+7(999)123-45-67"
                  className="hover:text-white transition-colors"
                >
                  +7 (999) 123-45-67
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@kitanasushi.ru"
                  className="hover:text-white transition-colors"
                >
                  info@kitanasushi.ru
                </a>
              </li>
              <li>
                <span>ул. Ленина, 123</span>
              </li>
              <li>
                <span>пн-вс: 10:00 - 22:00</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Нижняя часть */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-white/40 text-sm mb-4 md:mb-0">
            © 2024 Китана Суши. Все права защищены.
          </div>
          <div className="flex space-x-6 text-sm">
            <Link to="/terms" className="text-white/40 hover:text-white transition-colors">
              Пользовательское соглашение
            </Link>
            <Link to="/privacy" className="text-white/40 hover:text-white transition-colors">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default NewDesignFooter;