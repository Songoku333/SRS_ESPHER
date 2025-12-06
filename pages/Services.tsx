
import React, { useState } from 'react';
import { type Page } from '../types';

interface ServicesProps {
    setCurrentPage: (page: Page) => void;
}

const AccordionItem: React.FC<{
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: () => void;
}> = ({ title, children, isOpen, setIsOpen }) => {
  return (
    <div className="border-b">
      <button
        onClick={setIsOpen}
        className="flex justify-between items-center w-full py-5 px-6 text-left"
      >
        <span className={`text-xl font-semibold ${isOpen ? 'text-emerald-600' : 'text-gray-800'}`}>{title}</span>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="prose prose-lg max-w-none p-6 text-gray-600 bg-gray-50">{children}</div>
        </div>
      </div>
    </div>
  );
};

const Services: React.FC<ServicesProps> = ({ setCurrentPage }) => {
  const [openIndex, setOpenIndex] = useState<number>(3); // Default open ESG

  return (
    <div className="animate-fadeIn">
      <header className="bg-gray-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Soluciones para una Transformación Real.</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            No ofrecemos servicios aislados. Creamos soluciones a medida combinando "micro-servicios" ágiles y especializados, diseñados para generar el máximo impacto con la máxima eficiencia.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto shadow-lg rounded-lg overflow-hidden">
          <AccordionItem title="Ingeniería de Performance Sostenible" isOpen={openIndex === 0} setIsOpen={() => setOpenIndex(openIndex === 0 ? -1 : 0)}>
            <p>Construimos el futuro, hoy. Nuestro enfoque va más allá del diseño inicial para centrarse en el rendimiento real y sostenido de edificios e industrias. Optimizamos cada activo para garantizar máxima eficiencia, durabilidad y una perfecta alineación con un futuro de bajas emisiones. Sus activos no solo serán sostenibles en papel, sino rentables y resilientes en la práctica.</p>
          </AccordionItem>
          <AccordionItem title="Resiliencia y Transferencia del Riesgo" isOpen={openIndex === 1} setIsOpen={() => setOpenIndex(openIndex === 1 ? -1 : 1)}>
            <p>En un mundo de incertidumbre, la resiliencia no es una opción, es el pilar del valor. A través de nuestra correduría de seguros especializada, transformamos la gestión del riesgo. No se trata solo de una póliza; es una estrategia integral que asegura la continuidad de su negocio, protege sus activos y le da la confianza para operar ante cualquier eventualidad, desde riesgos climáticos hasta disrupciones del mercado.</p>
          </AccordionItem>
          <AccordionItem title="Venta Inteligente de Energía" isOpen={openIndex === 2} setIsOpen={() => setOpenIndex(openIndex === 2 ? -1 : 2)}>
            <p>Dejamos de vender kWh para convertirnos en su aliado estratégico en descarbonización. Diseñamos soluciones energéticas que no solo optimizan sus costes, sino que cumplen sus objetivos de sostenibilidad y aseguran un suministro responsable y resiliente. Es una nueva relación con la energía: inteligente, estratégica y alineada con el propósito de su organización y del planeta.</p>
          </AccordionItem>
          <AccordionItem title="Consultoría Avanzada Impulsada por Riesgo ESG" isOpen={openIndex === 3} setIsOpen={() => setOpenIndex(openIndex === 3 ? -1 : 3)}>
            <h3 className="text-2xl font-bold !mb-4 !text-emerald-700">Inteligencia Estratégica para el Liderazgo Sostenible.</h3>
            <p>Esta es la pieza central de nuestra propuesta de valor. Aquí es donde el riesgo se convierte en estrategia y la estrategia genera un impacto medible.</p>
            <ul>
                <li><strong>Technical Due Diligence (TDD) 360°:</strong> "No solo evaluamos el activo, medimos su pulso real". Integramos análisis del estado real de los equipos, el riesgo climático y el potencial de descarbonización para una visión completa del riesgo y la oportunidad.</li>
                <li><strong>Alineación con Taxonomía y Regulaciones de la UE:</strong> "Navegamos la complejidad regulatoria por usted." Ofrecemos consultoría experta sobre el cumplimiento del Código de Conducta de eficiencia energética, la Taxonomía Verde Europea y la EPBD, asegurando que sus activos no solo cumplan, sino que lideren el mercado.</li>
                <li><strong>Commissioning y Retro-Commissioning:</strong> "Garantizamos que tus activos cumplan su promesa de rendimiento." Aseguramos que los sistemas nuevos funcionen como se diseñaron y optimizamos los existentes para recuperar su eficiencia perdida.</li>
                <li><strong>Auditorías Energéticas y Planes de Descarbonización Basados en la Realidad:</strong> Creamos planes accionables, financiables y rentables que nacen de su operación, no de plantillas. Vinculamos cada acción a los principios de la Sostenibilidad Esférica.</li>
                <li><strong>Informes de Sostenibilidad ESG y Gestión de Riesgo Climático:</strong> "Pasamos del análisis a la gestión activa." Preparamos su organización para los riesgos físicos y de transición, convirtiendo el cumplimiento normativo en una ventaja competitiva.</li>
                <li><strong>Implementación de Herramientas Inteligentes para la Decisión:</strong> "Datos para el impacto." Implementamos y utilizamos estándares líderes como CRREM y GRESB para que sus decisiones de inversión y gestión estén basadas en el impacto real y el valor futuro.</li>
                <li><strong>Certificaciones y Sellos con Propósito (BREEAM, LEED, etc.):</strong> "No buscamos el sello, buscamos el valor que el sello representa." Ofrecemos "micro-servicios" ágiles para que cualquier cliente pueda acceder a estas herramientas, mejorando el valor de sus activos de forma flexible y según sus necesidades.</li>
            </ul>
          </AccordionItem>
        </div>
      </div>
      
      <section className="bg-emerald-700 text-white">
        <div className="container mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold">Ponga a prueba nuestra metodología.</h2>
            <p className="mt-4 text-emerald-100 max-w-2xl mx-auto">
                Utilice nuestra herramienta de análisis preliminar para obtener una visión instantánea del potencial de su activo, basada en datos públicos y benchmarks de mercado.
            </p>
            <button 
                onClick={() => setCurrentPage('analysis')}
                className="mt-8 bg-white text-emerald-700 font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-transform duration-300 transform hover:scale-105 shadow-lg"
            >
                Realizar Análisis Preliminar
            </button>
        </div>
      </section>

    </div>
  );
};

export default Services;
