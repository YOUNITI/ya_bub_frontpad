import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
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

function App() {
  return (
    <Router>
      <CartProvider>
        <AuthProvider>
          <ChatProvider>
            <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
              <Header />
              <main className="flex-grow pb-24">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/order" element={<Order />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                </Routes>
              </main>
              <Footer />
              <InstallPWA />
              <WorkingHoursModal />
              <OrderStatusNotification />
            </div>
          </ChatProvider>
        </AuthProvider>
      </CartProvider>
    </Router>
  );
}

export default App;
