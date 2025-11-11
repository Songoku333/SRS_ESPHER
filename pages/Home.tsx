
import React from 'react';
import { type Page } from '../types';
import SustainableEngineeringIcon from '../components/icons/SustainableEngineeringIcon';
import ResilienceIcon from '../components/icons/ResilienceIcon';
import SmartEnergyIcon from '../components/icons/SmartEnergyIcon';
import EsgConsultingIcon from '../components/icons/EsgConsultingIcon';

interface HomeProps {
    setCurrentPage: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentPage }) => {
  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[500px] bg-cover bg-center text-white" style={{ backgroundImage: "url('https://picsum.photos/1600/900?grayscale&blur=2')" }}>
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">Donde la Incertidumbre se Convierte en Valor.</h1>
          <p className="mt-6 text-lg md:text-xl max-w-3xl text-gray-200">
            La sostenibilidad tradicional es una foto fija en un mundo en movimiento. En Smart Rem Solutions, hemos adoptado un nuevo paradigma: la Sostenibilidad Esférica, un modelo de gestión integral que transforma el cambio en su mayor activo.
          </p>
          <button onClick={() => setCurrentPage('philosophy')} className="mt-8 bg-emerald-500 text-white font-semibold px-8 py-3 rounded-full hover:bg-emerald-600 transition-transform duration-300 transform hover:scale-105 shadow-lg">
            Descubre Nuestra Filosofía
          </button>
        </div>
      </section>

      {/* Section 1: ¿Qué es la Sostenibilidad Esférica? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">¿Qué es la Sostenibilidad Esférica?</h2>
          <div className="w-20 h-1 bg-emerald-500 mx-auto mt-4 mb-8"></div>
          <p className="max-w-4xl mx-auto text-gray-600 text-lg">
            Es un modelo de gestión que ve a su organización como una esfera en constante interacción con su entorno: mercado, sociedad y planeta. En lugar de temer al cambio, lo aprovechamos para adaptar, evolucionar y fortalecer su negocio. Convierte amenazas en oportunidades y la gestión en un acto de co-creación. El pulso de este modelo es la <span className="font-semibold text-emerald-600">"Amormonía"</span>: dar valor para recibir un éxito exponencial.
          </p>
        </div>
      </section>

      {/* Section 2: Nuestros Servicios */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">Nuestros Servicios: De la Visión a la Acción</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Materializamos nuestra filosofía en soluciones tangibles que generan un impacto real y medible.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard icon={<SustainableEngineeringIcon className="w-12 h-12 text-emerald-500"/>} title="Ingeniería de Performance Sostenible" description="Diseñamos activos que respiran eficiencia y futuro." />
            <ServiceCard icon={<ResilienceIcon className="w-12 h-12 text-emerald-500"/>} title="Resiliencia y Transferencia de Riesgo" description="Aseguramos tu valor en un mundo impredecible." />
            <ServiceCard icon={<SmartEnergyIcon className="w-12 h-12 text-emerald-500"/>} title="Energía Inteligente para la Descarbonización" description="Alineamos tu consumo con los objetivos del planeta y de tu negocio." />
            <ServiceCard icon={<EsgConsultingIcon className="w-12 h-12 text-emerald-500"/>} title="Consultoría Avanzada ESG & Riesgo" description="Transformamos el riesgo en estrategia y la estrategia en impacto." />
          </div>
           <div className="text-center mt-12">
            <button onClick={() => setCurrentPage('services')} className="text-emerald-600 font-semibold hover:underline">
              Explorar todas las soluciones &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Casos de Éxito */}
      <section className="py-20 bg-white">
         <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-800">Casos de Éxito Destacados</h2>
                <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Nuestro impacto no es teórico, es real. Vea cómo hemos ayudado a líderes a prosperar.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <SuccessStoryCard 
                    title="Portfolio Inmobiliario Global" 
                    result="Reducción del 30% en riesgo climático." 
                    image="https://picsum.photos/400/300?random=1"
                />
                <SuccessStoryCard 
                    title="Centro Logístico Europeo" 
                    result="Aumento del 25% en la eficiencia energética." 
                    image="https://picsum.photos/400/300?random=2"
                />
                <SuccessStoryCard 
                    title="Fondo de Inversión Sostenible" 
                    result="Mejora de 10 puntos en la evaluación GRESB." 
                    image="https://picsum.photos/400/300?random=3"
                />
                <SuccessStoryCard 
                    title="Data Center Hyperscaler" 
                    result="Optimización del PUE en un 15%." 
                    image="https://picsum.photos/400/300?random=4"
                />
            </div>
            <div className="text-center mt-12">
              <button onClick={() => setCurrentPage('caseStudies')} className="text-emerald-600 font-semibold hover:underline">
                Ver más proyectos &rarr;
              </button>
            </div>
        </div>
      </section>
      
      {/* Section 4: Manifiesto Amormonía */}
      <section className="bg-emerald-700 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold">Manifiesto de la "Amormonía"</h3>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-emerald-100">
            Creemos que la estrategia empresarial más inteligente es fundamentalmente humana. Se basa en dar sin esperar, en priorizar el bien común para crear un ecosistema de confianza y reciprocidad. Al nutrir tu entorno, aseguras tu propio éxito de una manera que nunca creíste posible. Eso es amormonía.
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800">¿Estás listo para evolucionar?</h2>
            <p className="mt-4 text-gray-600 max-w-xl mx-auto">Dejemos de reaccionar al futuro y empecemos a construirlo juntos.</p>
            <button onClick={() => setCurrentPage('contact')} className="mt-8 bg-gray-800 text-white font-semibold px-10 py-4 rounded-full hover:bg-black transition-colors duration-300 shadow-lg text-lg">
                Hablemos
            </button>
        </div>
      </section>
    </div>
  );
};

// Fix: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
const ServiceCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 text-center flex flex-col items-center">
    {icon}
    <h3 className="text-xl font-bold mt-6 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const SuccessStoryCard: React.FC<{ title: string, result: string, image: string }> = ({ title, result, image }) => (
    <div className="group rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-2">
        <div className="relative">
            <img src={image} alt={title} className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
        </div>
        <div className="p-6 bg-white">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="mt-2 text-emerald-600 font-semibold">{result}</p>
        </div>
    </div>
);

export default Home;
