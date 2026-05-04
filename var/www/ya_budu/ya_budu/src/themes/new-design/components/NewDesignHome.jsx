import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';

const NewDesignHome = () => {
  const { isNewDesign } = useTheme();

  return (
    <div className="min-h-screen">
      {/* Hero секция */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Фоновое изображение */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("/hero-bg.jpg")'
          }}
        />

        {/* Контент */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="new-design-h1 text-4xl md:text-6xl lg:text-7xl mb-6 tracking-wider">
            КИТАНА СУШИ
          </h1>
          <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Искусство японской кухни в каждом ролле. Премиум ингредиенты,
            мастерское исполнение, быстрая доставка.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/menu"
              className="new-design-button-primary px-8 py-4 text-lg font-semibold uppercase tracking-wider"
            >
              Посмотреть меню
            </Link>
            <button
              onClick={() => {
                const el = document.getElementById('about');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="new-design-button-secondary px-8 py-4 text-lg font-semibold uppercase tracking-wider"
            >
              О нас
            </button>
          </div>
        </div>

        {/* Декоративные элементы */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/40 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* О нас */}
      <section id="about" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="new-design-h2 text-3xl md:text-4xl mb-6">
                О ресторане
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                Китана Суши — это место, где традиции японской кухни встречаются
                с современными технологиями приготовления. Мы используем только
                свежие ингредиенты премиум качества и следуем аутентичным рецептам.
              </p>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                Наша команда поваров — профессионалы с многолетним опытом,
                которые вкладывают душу в каждое блюдо. Мы гарантируем качество,
                вкус и быструю доставку в любую точку города.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="new-design-h3 text-2xl text-yellow-400 mb-2">5+</div>
                  <div className="text-white/60">лет опыта</div>
                </div>
                <div className="text-center">
                  <div className="new-design-h3 text-2xl text-yellow-400 mb-2">1000+</div>
                  <div className="text-white/60">довольных клиентов</div>
                </div>
              </div>
            </div>
            <div className="new-design-card p-8">
              <h3 className="new-design-h3 text-xl mb-4">Наши преимущества</h3>
              <ul className="space-y-3 text-white/80">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  Только свежие ингредиенты
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  Опытные су-шефы
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  Быстрая доставка
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                  Качество гарантировано
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Популярные блюда */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="new-design-h2 text-3xl md:text-4xl mb-4">
              Популярные блюда
            </h2>
            <p className="text-white/60 text-lg">
              Любимые позиции наших гостей
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Блюдо 1 */}
            <div className="new-design-card p-6 text-center group hover:transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-4xl">🍣</span>
              </div>
              <h3 className="new-design-h3 text-lg mb-2">Филадельфия ролл</h3>
              <p className="text-white/60 text-sm mb-3">
                Лосось, сливочный сыр, огурец, рис
              </p>
              <div className="text-yellow-400 font-semibold text-lg">450 ₽</div>
            </div>

            {/* Блюдо 2 */}
            <div className="new-design-card p-6 text-center group hover:transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-4xl">🍱</span>
              </div>
              <h3 className="new-design-h3 text-lg mb-2">Калифорния ролл</h3>
              <p className="text-white/60 text-sm mb-3">
                Креветка, авокадо, огурец, рис
              </p>
              <div className="text-yellow-400 font-semibold text-lg">380 ₽</div>
            </div>

            {/* Блюдо 3 */}
            <div className="new-design-card p-6 text-center group hover:transform hover:scale-105 transition-transform duration-300">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-4xl">🥢</span>
              </div>
              <h3 className="new-design-h3 text-lg mb-2">Унаги ролл</h3>
              <p className="text-white/60 text-sm mb-3">
                Угорь, рис, соус унаги
              </p>
              <div className="text-yellow-400 font-semibold text-lg">520 ₽</div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/menu"
              className="new-design-button-primary px-8 py-3 text-lg font-semibold uppercase tracking-wider"
            >
              Полное меню
            </Link>
          </div>
        </div>
      </section>

      {/* Доставка */}
      <section id="delivery" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="new-design-card p-8">
              <h2 className="new-design-h2 text-2xl mb-6">
                Доставка и оплата
              </h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-truck text-black"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Бесплатная доставка</h3>
                    <p className="text-white/60 text-sm">От 800 ₽ в пределах города</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-clock text-black"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Быстрая доставка</h3>
                    <p className="text-white/60 text-sm">30-45 минут</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-credit-card text-black"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Удобная оплата</h3>
                    <p className="text-white/60 text-sm">Наличными или картой</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="new-design-h2 text-2xl mb-6">
                Зона доставки
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                Мы доставляем заказы по всему городу и пригороду.
                Уточните адрес при оформлении заказа — наши менеджеры
                подтвердят возможность доставки.
              </p>
              <div className="new-design-card p-6">
                <h3 className="font-semibold text-white mb-3">Районы доставки:</h3>
                <ul className="text-white/60 space-y-1">
                  <li>• Центр города</li>
                  <li>• Микрорайоны</li>
                  <li>• Частный сектор</li>
                  <li>• Пригород (до 10 км)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Контакты */}
      <section id="contact" className="py-20 px-4 bg-black/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="new-design-h2 text-3xl md:text-4xl mb-6">
            Свяжитесь с нами
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Готовы ответить на все вопросы и принять ваш заказ
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="new-design-card p-6">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-phone text-black text-xl"></i>
              </div>
              <h3 className="font-semibold text-white mb-2">Телефон</h3>
              <a
                href="tel:+7(999)123-45-67"
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                +7 (999) 123-45-67
              </a>
            </div>

            <div className="new-design-card p-6">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-envelope text-black text-xl"></i>
              </div>
              <h3 className="font-semibold text-white mb-2">Email</h3>
              <a
                href="mailto:info@kitanasushi.ru"
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                info@kitanasushi.ru
              </a>
            </div>

            <div className="new-design-card p-6">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marker-alt text-black text-xl"></i>
              </div>
              <h3 className="font-semibold text-white mb-2">Адрес</h3>
              <span className="text-white/70">ул. Ленина, 123</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewDesignHome;