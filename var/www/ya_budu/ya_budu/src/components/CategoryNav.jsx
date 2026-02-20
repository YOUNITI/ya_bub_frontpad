import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const CategoryNav = ({ onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json();
        const uniqueCategories = [...new Set(data.map(product => product.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) return <div className="text-center py-4">Загрузка категорий...</div>;

  return (
    <div className="flex flex-wrap justify-center gap-4 py-8">
      <button
        onClick={() => onCategorySelect('')}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 bg-opacity-70 text-gray-700 font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out backdrop-blur-sm border border-gray-300"
      >
        Все
      </button>
      {categories.map((category, index) => {
        const pastelColors = [
          'from-pink-200 to-pink-300',
          'from-blue-200 to-blue-300',
          'from-green-200 to-green-300',
          'from-yellow-200 to-yellow-300',
          'from-purple-200 to-purple-300',
          'from-indigo-200 to-indigo-300',
          'from-teal-200 to-teal-300',
          'from-orange-200 to-orange-300',
        ];
        const colorClass = pastelColors[index % pastelColors.length];

        return (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`px-6 py-3 rounded-xl bg-gradient-to-r ${colorClass} bg-opacity-70 text-gray-800 font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ease-in-out backdrop-blur-sm border border-opacity-50`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryNav;