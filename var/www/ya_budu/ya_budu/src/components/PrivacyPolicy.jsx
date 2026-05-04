import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Навигация */}
      <header className="bg-brand-black text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            <Link to="/" className="bg-brand-yellow text-brand-black px-6 py-2 rounded-full font-bold hover:bg-yellow-500 transition-colors">
              <i className="fas fa-arrow-left mr-2"></i> На главную
            </Link>
          </div>
        </div>
      </header>

      {/* Контент */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 font-heading">
            <span className="text-brand-yellow">Политика</span> конфиденциальности
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Общие положения</h2>
            <p className="text-gray-700 mb-4">
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки 
              и защиты персональных данных пользователей сайта «ЯБУДУ» (далее — «Сайт»).
            </p>
            <p className="text-gray-700 mb-4">
              Используя Сайт, Пользователь выражает согласие с условиями настоящей Политики. 
              В случае несогласия Пользователь должен немедленно прекратить использование Сайта.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Собираемые данные</h2>
            <p className="text-gray-700 mb-4">
              2.1. Компания может собирать следующие персональные данные:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Фамилия, имя, отчество</li>
              <li>Контактный телефон</li>
              <li>Адрес электронной почты</li>
              <li>Адрес доставки</li>
              <li>История заказов</li>
              <li>IP-адрес и данные о браузере</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Цели обработки данных</h2>
            <p className="text-gray-700 mb-4">
              3.1. Персональные данные обрабатываются в следующих целях:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Оформление и доставка заказов</li>
              <li>Связь с Пользователем для подтверждения заказа</li>
              <li>Улучшение качества обслуживания</li>
              <li>Отправка информации об акциях и специальных предложениях (с согласия)</li>
              <li>Защита прав и законных интересов Компании</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Правовые основания</h2>
            <p className="text-gray-700 mb-4">
              4.1. Обработка персональных данных осуществляется на основании:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Федерального закона № 152-ФЗ «О персональных данных»</li>
              <li>Согласия субъекта персональных данных</li>
              <li>Необходимости выполнения договора</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Хранение и защита данных</h2>
            <p className="text-gray-700 mb-4">
              5.1. Компания принимает все необходимые организационные и технические меры 
              для защиты персональных данных от несанкционированного доступа, уничтожения, 
              изменения, блокирования, копирования, распространения.
            </p>
            <p className="text-gray-700 mb-4">
              5.2. Данные хранятся на защищенных серверах с ограниченным доступом.
            </p>
            <p className="text-gray-700 mb-4">
              5.3. Срок хранения персональных данных не превышает срока, необходимого 
              для достижения целей обработки, если иное не предусмотрено законодательством.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Передача данных третьим лицам</h2>
            <p className="text-gray-700 mb-4">
              6.1. Компания не передает персональные данные третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Передача курьерским службам для осуществления доставки</li>
              <li>По требованию уполномоченных государственных органов</li>
              <li>С согласия Пользователя</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Права пользователя</h2>
            <p className="text-gray-700 mb-4">
              7.1. Пользователь имеет право:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Получать информацию об обработке своих персональных данных</li>
              <li>Требовать уточнения, блокирования или уничтожения данных</li>
              <li>Отозвать согласие на обработку данных</li>
              <li>Обжаловать действия Компании в уполномоченный орган</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4">8. Использование cookies</h2>
            <p className="text-gray-700 mb-4">
              8.1. Сайт использует файлы cookies для улучшения работы и персонализации контента.
            </p>
            <p className="text-gray-700 mb-4">
              8.2. Пользователь может отключить cookies в настройках браузера, 
              однако это может повлиять на функциональность Сайта.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">9. Изменения политики</h2>
            <p className="text-gray-700 mb-4">
              9.1. Компания оставляет за собой право вносить изменения в настоящую Политику.
            </p>
            <p className="text-gray-700 mb-4">
              9.2. Новая редакция Политики вступает в силу с момента ее размещения на Сайте.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">10. Контактная информация</h2>
            <p className="text-gray-700 mb-4">
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Телефон: 8 (938) 475-09-99</li>
              <li>Email: zakazyabudu@gmail.com</li>
              <li>Адреса: Профессора Малигонова 35, ул. Мурата Ахеджака 26</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
