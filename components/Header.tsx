
import React, { useState } from 'react';
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
  onClick?: () => void;
  mobile?: boolean;
}> = ({ page, currentPage, setCurrentPage, children, onClick, mobile }) => {
  const isActive = currentPage === page;
  const baseClasses = "font-semibold transition-colors duration-300";
  const mobileClasses = "block w-full text-center py-4 text-lg border-b border-gray-100 last:border-0 hover:bg-gray-50";
  const desktopClasses = "px-4 py-2 text-sm";

  return (
    <button
      onClick={() => {
        setCurrentPage(page);
        if (onClick) onClick();
      }}
      className={`${mobile ? mobileClasses : desktopClasses} ${baseClasses} ${
        isActive
          ? 'text-emerald-600 bg-emerald-50 md:bg-transparent'
          : 'text-gray-600 hover:text-emerald-500'
      }`}
    >
      {children}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 bg-white bg-opacity-95 backdrop-blur-md shadow-sm z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div 
            className="text-2xl font-bold text-gray-800 cursor-pointer relative z-50" 
            onClick={() => { setCurrentPage('home'); closeMenu(); }}
        >
          Smart Rem<span className="text-emerald-500">.</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <NavLink page="home" currentPage={currentPage} setCurrentPage={setCurrentPage}>Inicio</NavLink>
          <NavLink page="philosophy" currentPage={currentPage} setCurrentPage={setCurrentPage}>Filosofía</NavLink>
          <NavLink page="services" currentPage={currentPage} setCurrentPage={setCurrentPage}>Soluciones</NavLink>
          <NavLink page="caseStudies" currentPage={currentPage} setCurrentPage={setCurrentPage}>Casos</NavLink>
          <NavLink page="analysis" currentPage={currentPage} setCurrentPage={setCurrentPage}>Análisis</NavLink>
          
          <button
            onClick={() => { setCurrentPage('esg4dc'); closeMenu(); }}
            className="ml-2 px-4 py-2 rounded-full border-2 border-blue-500 text-blue-600 font-bold text-xs hover:bg-blue-500 hover:text-white transition-all duration-300 flex items-center gap-1"
          >
            ESG4DC
          </button>

          <button
            onClick={() => { setCurrentPage('vision2026'); closeMenu(); }}
            className="ml-2 px-4 py-2 rounded-full border-2 border-emerald-500 text-emerald-600 font-bold text-xs hover:bg-emerald-500 hover:text-white transition-all duration-300 flex items-center gap-1 animate-pulse"
          >
            Visión 2026
          </button>

          <button
            onClick={() => { setCurrentPage('contact'); closeMenu(); }}
            className="bg-gray-800 text-white font-semibold px-5 py-2 rounded-full hover:bg-black transition-transform duration-300 transform hover:scale-105 ml-2 text-sm shadow-md"
          >
            Contacto
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden relative z-50 flex items-center gap-4">
             <button
                onClick={() => { setCurrentPage('esg4dc'); closeMenu(); }}
                className="px-3 py-1 rounded-full border border-blue-500 text-blue-600 font-bold text-[10px] uppercase"
             >
                ESG4DC
             </button>
             <button 
                onClick={toggleMenu} 
                className="text-gray-600 hover:text-emerald-500 focus:outline-none p-2"
                aria-label="Menu"
            >
                {isMenuOpen ? (
                     <svg className="w-8 h-8 transition-transform duration-300 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                     <svg className="w-8 h-8 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-white z-40 flex flex-col pt-24 px-6 transition-all duration-300 ease-in-out transform md:hidden ${
            isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col space-y-1">
            <NavLink page="home" currentPage={currentPage} setCurrentPage={setCurrentPage} onClick={closeMenu} mobile>Inicio</NavLink>
            <NavLink page="philosophy" currentPage={currentPage} setCurrentPage={setCurrentPage} onClick={closeMenu} mobile>Filosofía</NavLink>
            <NavLink page="services" currentPage={currentPage} setCurrentPage={setCurrentPage} onClick={closeMenu} mobile>Soluciones</NavLink>
            <NavLink page="caseStudies" currentPage={currentPage} setCurrentPage={setCurrentPage} onClick={closeMenu} mobile>Casos de Éxito</NavLink>
            <NavLink page="analysis" currentPage={currentPage} setCurrentPage={setCurrentPage} onClick={closeMenu} mobile>Análisis</NavLink>
            <button
                onClick={() => { setCurrentPage('esg4dc'); closeMenu(); }}
                className="w-full text-left py-4 text-lg border-b border-gray-100 font-semibold text-blue-600"
              >
                ESG4DC: Data Centers
              </button>
             <button
                onClick={() => { setCurrentPage('contact'); closeMenu(); }}
                className="w-full bg-gray-800 text-white font-semibold px-5 py-4 rounded-lg hover:bg-black transition-colors mt-6 text-lg shadow-md"
              >
                Contacto
              </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
