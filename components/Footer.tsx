import React from 'react';
import { type Page } from '../types';

interface FooterProps {
  setCurrentPage: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ setCurrentPage }) => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold">Smart Rem<span className="text-emerald-400">.</span></h3>
            <p className="mt-4 text-gray-400 max-w-md">
              Impulsando la Sostenibilidad Esférica para transformar la incertidumbre en valor y co-crear un futuro resiliente y próspero.
            </p>
          </div>
          <div>
            <h4 className="font-semibold tracking-wider uppercase">Navegación</h4>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => setCurrentPage('philosophy')} className="hover:text-emerald-400 transition-colors">Filosofía</button></li>
              <li><button onClick={() => setCurrentPage('services')} className="hover:text-emerald-400 transition-colors">Soluciones</button></li>
              <li><button onClick={() => setCurrentPage('caseStudies')} className="hover:text-emerald-400 transition-colors">Casos de Éxito</button></li>
              <li><button onClick={() => setCurrentPage('analysis')} className="hover:text-emerald-400 transition-colors">Análisis</button></li>
              <li><button onClick={() => setCurrentPage('contact')} className="hover:text-emerald-400 transition-colors">Contacto</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold tracking-wider uppercase">Contacto</h4>
            <ul className="mt-4 space-y-2 text-gray-400">
              <li><a href="mailto:info@smartrem.com" className="hover:text-emerald-400 transition-colors">info@smartrem.com</a></li>
              <li>Madrid, España</li>
            </ul>
            <div className="mt-4">
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd"/></svg>
                </a>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-6 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Smart Rem Solutions. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;