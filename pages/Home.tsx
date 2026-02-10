
import React, { useState, useEffect } from 'react';
import { type Page } from '../types';
import SustainableEngineeringIcon from '../components/icons/SustainableEngineeringIcon';
import ResilienceIcon from '../components/icons/ResilienceIcon';
import SmartEnergyIcon from '../components/icons/SmartEnergyIcon';
import EsgConsultingIcon from '../components/icons/EsgConsultingIcon';
import { GoogleGenAI } from '@google/genai';

interface HomeProps {
    setCurrentPage: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ setCurrentPage }) => {
  const placeholderImageUrl = "https://images.unsplash.com/photo-1611251915391-a10c05a07aa2?q=80&w=1920&auto=format&fit=crop&blur=10";
  const [heroImageUrl, setHeroImageUrl] = useState(placeholderImageUrl);
  const [showApiKeyButton, setShowApiKeyButton] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const heroPrompt = 'A cinematic, photorealistic wide shot representing "Spherical Sustainability" for a corporate consulting firm. The composition should feature a harmonious blend of futuristic glass architecture and lush, vertical gardens, encapsulated within a subtle, glowing spherical aura or lens effect. Lighting should be golden hour, warm and inspiring. High detail, 8k resolution, architectural photography style.';

  const generateHighResVersion = async () => {
      try {
          setIsUpgrading(true);
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: { parts: [{ text: heroPrompt }] },
              config: { imageConfig: { aspectRatio: "16:9", imageSize: "2K" } },
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) {
                  const base64EncodeString: string = part.inlineData.data;
                  const imageUrl = `data:image/png;base64,${base64EncodeString}`;
                  const img = new Image();
                  img.src = imageUrl;
                  img.onload = () => {
                      setHeroImageUrl(imageUrl);
                      setIsUpgrading(false);
                  };
                  break; 
              }
          }
      } catch (error) {
          console.warn("Could not upgrade to high-res image:", error);
          setIsUpgrading(false);
      }
  };

  const generateHeroImage = async () => {
    try {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                setShowApiKeyButton(true);
                setIsGenerating(false);
                return;
            }
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: heroPrompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } },
        });

        let fastImageLoaded = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64EncodeString: string = part.inlineData.data;
                const imageUrl = `data:image/png;base64,${base64EncodeString}`;
                setHeroImageUrl(imageUrl);
                setShowApiKeyButton(false);
                fastImageLoaded = true;
                break; 
            }
        }
        setIsGenerating(false);
        if (fastImageLoaded) { generateHighResVersion(); }
      } catch (error: any) {
        if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.toString().includes('403')) {
             setShowApiKeyButton(true);
        }
        setIsGenerating(false);
      }
    };

  useEffect(() => { generateHeroImage(); }, []);

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] bg-cover bg-center text-white transition-all duration-1000 ease-in-out" style={{ backgroundImage: `url('${heroImageUrl}')` }}>
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity duration-700"></div>
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center items-center text-center">
          <div className="border-[3px] border-blue-400/60 p-8 md:p-12 mb-10 max-w-6xl">
            <h1 className="text-5xl md:text-8xl font-bold leading-tight tracking-tight">
              Donde la <span className="text-white">INCERTIDUMBRE</span> se convierte en <span className="text-white">VALOR</span>
            </h1>
          </div>
          <p className="mt-2 text-lg md:text-2xl max-w-4xl text-gray-100 font-medium">
            La sostenibilidad tradicional es una foto fija en un mundo en movimiento. En Smart Rem Solutions, hemos adoptado un nuevo paradigma: la Sostenibilidad Esférica.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <button onClick={() => setCurrentPage('philosophy')} className="bg-emerald-500 text-white font-bold px-10 py-4 rounded-full hover:bg-emerald-600 transition-all transform hover:scale-105 shadow-2xl text-lg">
                Descubre Nuestra Filosofía
            </button>
            {showApiKeyButton && (
                <button onClick={() => window.aistudio.openSelectKey().then(generateHeroImage)} className="mt-4 px-4 py-2 bg-black bg-opacity-40 hover:bg-opacity-60 text-gray-300 hover:text-white text-xs rounded transition-colors backdrop-blur-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Habilitar IA Generativa
                </button>
            )}
          </div>
        </div>
      </section>

      {/* Novedades Section - Vision 2026 / WAITLIST */}
      <section className="py-12 bg-emerald-50 border-y border-emerald-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white p-8 rounded-2xl shadow-sm border-[3px] border-blue-400">
             <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">Novedad Exclusiva</span>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Apúntate a nuestra WAITLIST</h2>
                <p className="text-gray-600 text-lg">Cambia tu visión del Mundo por una visión de Sostenibilidad Esférica S³)</p>
             </div>
             <button 
                onClick={() => setCurrentPage('vision2026')}
                className="bg-slate-800 text-white font-bold px-8 py-4 rounded-xl hover:bg-black transition-all transform hover:scale-105 shadow-xl flex items-center gap-3 group"
             >
                Explorar Visión 2026
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </button>
          </div>
        </div>
      </section>

      {/* ESG4DC Specialty Section */}
      <section className="py-20 relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-40">
              <img 
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=1920&auto=format&fit=crop" 
                className="w-full h-full object-cover" 
                alt="Data Center" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent"></div>
          </div>
          <div className="container mx-auto px-6 relative z-10">
              <div className="max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xl">DC</div>
                      <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">ESG<span className="text-blue-500">4</span>DC</h2>
                  </div>
                  <div className="border-[3px] border-blue-500/50 p-6 md:p-8 mb-8 inline-block">
                    <h3 className="text-2xl md:text-4xl font-bold text-blue-50">Especialistas en Maximizar la Sostenibilidad de los Data Centers</h3>
                  </div>
                  <p className="text-lg text-gray-300 leading-relaxed mb-8 max-w-3xl">
                      Como expertos en la evaluación y mejora del <strong>EU CoC</strong> (Código de Conducta de eficiencia energética de la Unión Europea para Data Centers), maximizamos la rentabilidad de la sostenibilidad alineándonos con las directrices de elegibilidad de la <strong>Taxonomía Verde Europea</strong>.
                  </p>
                  <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => setCurrentPage('esg4dc')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                      >
                          Conoce ESG4DC
                      </button>
                      <a 
                        href="https://www.linkedin.com/company/esg4dc/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center gap-2 border border-white/20"
                      >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                          Síguenos en LinkedIn
                      </a>
                  </div>
              </div>
          </div>
      </section>

      {/* Section 1: ¿Qué es la Sostenibilidad Esférica? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">¿Qué es la Sostenibilidad Esférica?</h2>
          <div className="w-20 h-1 bg-emerald-500 mx-auto mt-4 mb-8"></div>
          <p className="max-w-4xl mx-auto text-gray-600 text-lg leading-relaxed">
            Es un modelo de gestión que ve a su organización como una esfera en constante interacción con su entorno: mercado, sociedad y planeta. Convierte amenazas en oportunidades y la gestión en un acto de co-creación. El pulso de este modelo es la <span className="font-semibold text-emerald-600">"Amormonía"</span>.
          </p>
        </div>
      </section>

      {/* Section 2: Nuestros Servicios */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">Nuestros Servicios: De la Visión a la Acción</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard icon={<SustainableEngineeringIcon className="w-12 h-12 text-emerald-500"/>} title="Ingeniería Sostenible" description="Diseñamos activos que respiran eficiencia." />
            <ServiceCard icon={<ResilienceIcon className="w-12 h-12 text-emerald-500"/>} title="Resiliencia & Riesgo" description="Aseguramos tu valor en un mundo impredecible." />
            <ServiceCard icon={<SmartEnergyIcon className="w-12 h-12 text-emerald-500"/>} title="Energía Inteligente" description="Alineamos tu consumo con los objetivos del planeta." />
            <ServiceCard icon={<EsgConsultingIcon className="w-12 h-12 text-emerald-500"/>} title="Consultoría ESG" description="Transformamos el riesgo en estrategia medible." />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800">¿Estás listo para evolucionar?</h2>
            <button onClick={() => setCurrentPage('contact')} className="mt-8 bg-gray-800 text-white font-semibold px-10 py-4 rounded-full hover:bg-black transition-all shadow-lg text-lg">
                Hablemos
            </button>
        </div>
      </section>
    </div>
  );
};

const ServiceCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 text-center flex flex-col items-center border border-gray-100">
    {icon}
    <h3 className="text-xl font-bold mt-6 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default Home;
