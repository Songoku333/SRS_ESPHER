import React from 'react';
import { type Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavLink: React.FC<{
  page: Page;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  children: React.ReactNode;
}> = ({ page, currentPage, setCurrentPage, children }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
        isActive
          ? 'text-emerald-500'
          : 'text-gray-600 hover:text-emerald-500'
      }`}
    >
      {children}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  return (
    <header className="sticky top-0 bg-white bg-opacity-90 backdrop-blur-md shadow-sm z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-800 cursor-pointer" onClick={() => setCurrentPage('home')}>
          Smart Rem<span className="text-emerald-500">.</span>
        </div>
        <nav className="hidden md:flex items-center space-x-2">
          <NavLink page="home" currentPage={currentPage} setCurrentPage={setCurrentPage}>Inicio</NavLink>
          <NavLink page="philosophy" currentPage={currentPage} setCurrentPage={setCurrentPage}>Filosofía</NavLink>
          <NavLink page="services" currentPage={currentPage} setCurrentPage={setCurrentPage}>Soluciones</NavLink>
          <NavLink page="caseStudies" currentPage={currentPage} setCurrentPage={setCurrentPage}>Casos de Éxito</NavLink>
          <NavLink page="analysis" currentPage={currentPage} setCurrentPage={setCurrentPage}>Análisis</NavLink>
          <button
            onClick={() => setCurrentPage('contact')}
            className="bg-emerald-500 text-white font-semibold px-5 py-2 rounded-full hover:bg-emerald-600 transition-transform duration-300 transform hover:scale-105"
          >
            Contacto
          </button>
        </nav>
        <div className="md:hidden">
            {/* Mobile menu button can be added here */}
        </div>
      </div>
    </header>
  );
};

export default Header;