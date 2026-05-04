import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ClientChat from './components/ClientChat';
import Header from './components/Header';
import Footer from './components/Footer';
import InstallPWA from './components/InstallPWA';
import Home from './components/Home';
import Menu from './components/Menu';
import Order from './components/Order';
import Login from './components/Login';
import Profile from './components/Profile';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ProtectedRoute from './components/ProtectedRoute';
import WorkingHoursModal from './components/WorkingHoursModal';
import OrderStatusNotification from './components/OrderStatusNotification';

// Импорт новой темы
import './themes/new-design/theme.css';

// Компоненты новой темы
import NewDesignHeader from './themes/new-design/components/NewDesignHeader';
import NewDesignFooter from './themes/new-design/components/NewDesignFooter';
import NewDesignHome from './themes/new-design/components/NewDesignHome';

function AppContent() {
  const { isNewDesign } = useTheme();

  return (
    <div className={`min-h-screen ${isNewDesign ? 'bg-black text-white' : 'bg-gray-50 text-gray-800'} flex flex-col`}>
      {isNewDesign ? <NewDesignHeader /> : <Header />}
      <main className={`flex-grow ${isNewDesign ? 'pt-20' : 'pb-24'}`}>
        <Routes>
          <Route path="/" element={isNewDesign ? <NewDesignHome /> : <Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </main>
      {isNewDesign ? <NewDesignFooter /> : <Footer />}
      <InstallPWA />
      <WorkingHoursModal />
      <OrderStatusNotification />
      <ClientChat />
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <CartProvider>
          <AuthProvider>
            <ChatProvider>
              <AppContent />
            </ChatProvider>
          </AuthProvider>
        </CartProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
