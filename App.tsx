
import React, { useState, useEffect } from 'react';
import { type Page } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Philosophy from './pages/Philosophy';
import Services from './pages/Services';
import CaseStudies from './pages/CaseStudies';
import Contact from './pages/Contact';
import Analysis from './pages/Analysis';
import Vision2026 from './pages/Vision2026';
import ESG4DC from './pages/ESG4DC';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  // Smooth scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home setCurrentPage={setCurrentPage} />;
      case 'philosophy':
        return <Philosophy />;
      case 'services':
        return <Services setCurrentPage={setCurrentPage} />;
      case 'caseStudies':
        return <CaseStudies />;
      case 'contact':
        return <Contact />;
      case 'analysis':
        return <Analysis setCurrentPage={setCurrentPage} />;
      case 'vision2026':
        return <Vision2026 setCurrentPage={setCurrentPage} />;
      case 'esg4dc':
        return <ESG4DC setCurrentPage={setCurrentPage} />;
      default:
        return <Home setCurrentPage={setCurrentPage} />;
    }
  };

  // Hide global header/footer for special landings
  const isSpecialLanding = currentPage === 'vision2026' || currentPage === 'esg4dc';

  return (
    <div className={`flex flex-col min-h-screen ${isSpecialLanding ? 'bg-black' : 'bg-white'}`}>
      {!isSpecialLanding && <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {!isSpecialLanding && <Footer setCurrentPage={setCurrentPage} />}
    </div>
  );
};

export default App;
