import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('new'); // 'old' или 'new'

  // Загружаем тему из localStorage при инициализации
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Применяем класс к body при изменении темы
  useEffect(() => {
    if (theme === 'new') {
      document.body.classList.add('new-design-theme');
      document.body.classList.remove('old-design-theme');
    } else {
      document.body.classList.add('old-design-theme');
      document.body.classList.remove('new-design-theme');
    }

    // Сохраняем выбор в localStorage
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'old' ? 'new' : 'old');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isNewDesign: theme === 'new',
    isOldDesign: theme === 'old'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};