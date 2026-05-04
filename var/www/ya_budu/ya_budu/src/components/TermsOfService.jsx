import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
            <span className="text-brand-yellow">Пользовательское</span> соглашение
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>

            <h2 className="text-2xl font-bold mt-8 mb-4">1. Общие положения</h2>
            <p className="text-gray-700 mb-4">
              Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между ИП «ЯБУДУ» 
              (далее — «Компания») и физическим лицом (далее — «Пользователь»), возникающие при использовании 
              сайта и услуг доставки еды.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">2. Предмет соглашения</h2>
            <p className="text-gray-700 mb-4">
              2.1. Компания предоставляет Пользователю доступ к сайту и возможность заказа доставки готовой еды 
              из меню, размещенного на сайте.
            </p>
            <p className="text-gray-700 mb-4">
              2.2. Пользователь обязуется использовать сайт и услуги в соответствии с настоящим Соглашением 
              и действующим законодательством Российской Федерации.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">3. Регистрация и аккаунт</h2>
            <p className="text-gray-700 mb-4">
              3.1. Для оформления заказа Пользователю необходимо предоставить достоверные контактные данные: 
              имя, номер телефона и адрес доставки.
            </p>
            <p className="text-gray-700 mb-4">
              3.2. Пользователь несет ответственность за достоверность предоставленной информации.
            </p>
            <p className="text-gray-700 mb-4">
              3.3. Компания не несет ответственности за невозможность доставки в случае предоставления 
              недостоверных контактных данных.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Оформление заказа</h2>
            <p className="text-gray-700 mb-4">
              4.1. Заказ считается оформленным после подтверждения оператором по телефону или через систему.
            </p>
            <p className="text-gray-700 mb-4">
              4.2. Минимальная сумма заказа и стоимость доставки указаны на сайте и могут меняться 
              в зависимости от зоны доставки.
            </p>
            <p className="text-gray-700 mb-4">
              4.3. Время доставки указано приблизительно и может изменяться в зависимости от 
              погодных условий, загруженности кухни и дорожной ситуации.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">5. Оплата</h2>
            <p className="text-gray-700 mb-4">
              5.1. Оплата заказа производится наличными при получении или картой при получении 
              (в зависимости от выбранного способа оплаты).
            </p>
            <p className="text-gray-700 mb-4">
              5.2. При самовывозе доступна оплата переводом при получении.
            </p>
            <p className="text-gray-700 mb-4">
              5.3. Цены на сайте могут меняться. Окончательная стоимость фиксируется в момент 
              оформления заказа.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">6. Отмена и возврат</h2>
            <p className="text-gray-700 mb-4">
              6.1. Пользователь имеет право отменить заказ до начала его приготовления, 
              связавшись с оператором.
            </p>
            <p className="text-gray-700 mb-4">
              6.2. В случае обнаружения брака или несоответствия заказа, Пользователь вправе 
              потребовать замены блюда или возврата денежных средств.
            </p>
            <p className="text-gray-700 mb-4">
              6.3. Претензии по качеству принимаются в течение 24 часов с момента получения заказа.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">7. Ответственность сторон</h2>
            <p className="text-gray-700 mb-4">
              7.1. Компания не несет ответственности за задержки доставки, вызванные 
              непреодолимой силой или действиями третьих лиц.
            </p>
            <p className="text-gray-700 mb-4">
              7.2. Пользователь несет ответственность за правильность указанных данных 
              и своевременное получение заказа.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">8. Изменение условий</h2>
            <p className="text-gray-700 mb-4">
              8.1. Компания оставляет за собой право изменять настоящее Соглашение в одностороннем порядке.
            </p>
            <p className="text-gray-700 mb-4">
              8.2. Изменения вступают в силу с момента их публикации на сайте.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4">9. Контактная информация</h2>
            <p className="text-gray-700 mb-4">
              По всем вопросам, связанным с использованием сайта и услуг, Вы можете связаться с нами:
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

export default TermsOfService;
