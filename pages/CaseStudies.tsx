
import React from 'react';
import { type CaseStudy } from '../types';

const caseStudiesData: CaseStudy[] = [
  {
    client: "Fondo de Inversión Inmobiliaria Global",
    challenge: "Evaluar el riesgo climático de su portfolio de oficinas en el sur de Europa y trazar un plan de descarbonización viable.",
    solution: "Combinamos una TDD 360° con análisis CRREM y auditorías energéticas avanzadas. A través de nuestra correduría, identificamos nuevas coberturas para los riesgos no mitigables.",
    result: "Plan de descarbonización con un ROI del 15%, reducción del 40% en la prima de seguro por riesgo climático y aumento de 10 puntos en su evaluación GRESB.",
    image: "https://picsum.photos/800/600?random=4"
  },
  {
    client: "Operador Logístico Paneuropeo",
    challenge: "Optimizar el consumo energético de su red de almacenes y cumplir con las nuevas directivas de la UE sobre eficiencia de edificios.",
    solution: "Realizamos un programa de Retro-Commissioning en 15 activos clave e implementamos una estrategia de compra de energía verde a largo plazo, asegurando precios y suministro.",
    result: "Reducción promedio del 22% en el consumo energético, cumplimiento normativo garantizado para 2030 y ahorros de 3M€ en los primeros 2 años.",
    image: "https://picsum.photos/800/600?random=5"
  },
  {
    client: "Empresa Tecnológica en Crecimiento",
    challenge: "Obtener certificaciones de sostenibilidad para su nueva sede corporativa que reflejaran su cultura de innovación y atrajeran al mejor talento.",
    solution: "Utilizamos nuestro enfoque de 'micro-servicios' para implementar de forma ágil certificaciones BREEAM, LEED y Wiredscore, enfocándonos en las medidas de mayor impacto para el bienestar de los empleados y la eficiencia.",
    result: "Sede certificada como 'Excelente' por BREEAM, aumento del 15% en la satisfacción de los empleados y reconocimiento como una de las oficinas más sostenibles del sector.",
    image: "https://picsum.photos/800/600?random=6"
  }
];

const CaseStudyCard: React.FC<{ caseStudy: CaseStudy }> = ({ caseStudy }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row mb-12 transform hover:scale-[1.02] transition-transform duration-300">
        <div className="md:w-1/2">
            <img src={caseStudy.image} alt={caseStudy.client} className="w-full h-64 md:h-full object-cover" />
        </div>
        <div className="p-8 md:w-1/2 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide">{caseStudy.client}</h3>
            <h4 className="text-2xl font-bold text-gray-800 mt-2">El Reto</h4>
            <p className="mt-2 text-gray-600">{caseStudy.challenge}</p>
            <h4 className="text-xl font-bold text-gray-800 mt-6">Nuestra Solución Esférica</h4>
            <p className="mt-2 text-gray-600">{caseStudy.solution}</p>
            <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-bold text-emerald-700">El Resultado</h4>
                <p className="mt-1 text-gray-800 font-semibold">{caseStudy.result}</p>
            </div>
        </div>
    </div>
);

const CaseStudies: React.FC = () => {
  return (
    <div className="bg-gray-50 animate-fadeIn">
      <header className="bg-white py-20 border-b">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Nuestro Impacto en el Mundo Real.</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            La teoría es importante, pero los resultados lo son todo. Explore cómo nuestra filosofía se traduce en valor tangible para nuestros clientes.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-20">
        {caseStudiesData.map((cs, index) => (
          <CaseStudyCard key={index} caseStudy={cs} />
        ))}
      </div>
    </div>
  );
};

export default CaseStudies;
