
import React from 'react';
import { type CaseStudy } from '../types';

const caseStudiesData: CaseStudy[] = [
  {
    client: "Promotor Inmobiliario Europeo",
    challenge: "Asegurar que su nuevo desarrollo de oficinas prime cumpliera con el Código de Conducta de la UE y la Taxonomía Verde para atraer inversión institucional y maximizar su valor.",
    solution: "Realizamos una consultoría integral desde la fase de diseño, alineando el proyecto con los criterios técnicos de la Taxonomía y la EPBD. Implementamos una estrategia de 'Commissioning' continuo para garantizar y documentar el rendimiento energético real.",
    result: "El activo fue clasificado como 100% alineado con la Taxonomía de la UE, atrayendo una financiación 'verde' con condiciones preferentes y logrando una valoración un 12% superior a la del mercado.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"
  },
  {
    client: "Fondo de Inversión Inmobiliaria Global",
    challenge: "Evaluar el riesgo climático de su portfolio de oficinas en el sur de Europa y trazar un plan de descarbonización viable.",
    solution: "Combinamos una TDD 360° con análisis CRREM y auditorías energéticas avanzadas. A través de nuestra correduría, identificamos nuevas coberturas para los riesgos no mitigables.",
    result: "Plan de descarbonización con un ROI del 15%, reducción del 40% en la prima de seguro por riesgo climático y aumento de 10 puntos en su evaluación GRESB.",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&q=80&w=800"
  },
  {
    client: "Operador Logístico Paneuropeo",
    challenge: "Optimizar el consumo energético de su red de almacenes y cumplir con las nuevas directivas de la UE sobre eficiencia de edificios.",
    solution: "Realizamos un programa de Retro-Commissioning en 15 activos clave e implementamos una estrategia de compra de energía verde a largo plazo, asegurando precios y suministro.",
    result: "Reducción promedio del 22% en el consumo energético, cumplimiento normativo garantizado para 2030 y ahorros de 3M€ en los primeros 2 años.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800"
  },
  {
    client: "Operador de Data Center Hyperscale",
    challenge: "Reducir el PUE (Power Usage Effectiveness) para cumplir con los objetivos corporativos de sostenibilidad y reducir los costes operativos en un mercado altamente competitivo.",
    solution: "Implementamos un programa de 'Retro-Commissioning' enfocado en la optimización del sistema de refrigeración y la gestión del flujo de aire. Además, se desarrolló un gemelo digital para modelar y predecir el impacto de los cambios antes de su implementación.",
    result: "Optimización del PUE en un 15%, resultando en un ahorro energético anual de 1.2M€ y un aumento significativo en la capacidad de carga de TI sin nueva inversión en infraestructura.",
    image: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&q=80&w=800"
  },
  {
    client: "Empresa Tecnológica en Crecimiento",
    challenge: "Obtener certificaciones de sostenibilidad para su nueva sede corporativa que reflejaran su cultura de innovación y atrajeran al mejor talento.",
    solution: "Utilizamos nuestro enfoque de 'micro-servicios' para implementar de forma ágil certificaciones BREEAM, LEED y Wiredscore, enfocándonos en las medidas de mayor impacto para el bienestar de los empleados y la eficiencia.",
    result: "Sede certificada como 'Excelente' por BREEAM, aumento del 15% en la satisfacción de los empleados y reconocimiento como una de las oficinas más sostenibles del sector.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800"
  }
];

const CaseStudyCard: React.FC<{ caseStudy: CaseStudy }> = ({ caseStudy }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row mb-12 transform hover:scale-[1.02] transition-transform duration-300">
        <div className="md:w-1/2 relative min-h-[300px]">
            <img 
              src={caseStudy.image} 
              alt={caseStudy.client} 
              className="absolute inset-0 w-full h-full object-cover" 
              loading="lazy"
            />
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
