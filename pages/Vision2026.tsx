
import React, { useState } from 'react';
import { type Page } from '../types';
import emailjs from '@emailjs/browser';

interface Vision2026Props {
  setCurrentPage: (page: Page) => void;
}

const activityOptions = [
  'Promotora Inmobiliaria',
  'Fondo de Inversión / Socimi',
  'Consultoría ESG / Sostenibilidad',
  'Ingeniería / Construcción',
  'Gestión de Activos (Asset Management)',
  'Seguros / Risk Management',
  'Facility Management',
  'PropTech / Data Center Operator',
  'Otros'
];

const Vision2026: React.FC<Vision2026Props> = ({ setCurrentPage }) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pioneersCount, setPioneersCount] = useState(128);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    role: '',
    activity: '',
    otherActivity: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      alert("Por favor, acepta la política de privacidad para continuar.");
      return;
    }

    if (!formData.activity) {
      alert("Por favor, seleccione su actividad.");
      return;
    }

    setIsSending(true);

    // EmailJS Configuration
    const SERVICE_ID = 'service_f49c4ti';
    const TEMPLATE_ID = 'template_blcs7zr';
    const PUBLIC_KEY = '06F9z0t2ajTcdyDnT';

    const finalActivity = formData.activity === 'Otros' ? `Otros: ${formData.otherActivity}` : formData.activity;

    const emailMessage = `
        SOLICITUD DE ACCESO PIONERO (VISIÓN 2026)
        
        DATOS DEL PIONERO:
        Nombre: ${formData.name}
        Empresa: ${formData.company}
        Email: ${formData.email}
        Cargo: ${formData.role}
        Actividad: ${finalActivity}
        
        POLÍTICA DE PRIVACIDAD: Aceptada (RGPD)
        --------------------------------
        Puesto actual en la lista: ${pioneersCount + 1}
    `;

    const templateParams = {
        title: 'Nueva Solicitud: Lista Pioneros 2026',
        name: formData.name,
        email: formData.email,
        time: new Date().toLocaleString('es-ES'),
        message: emailMessage
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      setFormSubmitted(true);
      setPioneersCount(prev => prev + 1);
    } catch (error) {
      console.error("Error al enviar solicitud pionero:", error);
      alert("Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.");
    } finally {
      setIsSending(false);
    }
  };

  const inputClasses = "w-full px-6 py-4 bg-gray-100 border-none rounded-2xl text-black focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-gray-400 appearance-none transition-all";

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Sphere Animations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full animate-pulse delay-700"></div>
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-500/5 blur-[80px] rounded-full animate-bounce duration-[10000ms]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-8 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tighter cursor-pointer" onClick={() => setCurrentPage('home')}>
          Smart Rem<span className="text-emerald-500">.</span>
        </div>
        <button 
          onClick={() => setCurrentPage('home')}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver a la Home
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fadeIn">
          Visión Estratégica
        </div>
        <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          2026: La Re-Evolución de la Sostenibilidad
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12">
          De la narrativa del reporte al impacto tangible. Un modelo esférico integrado impulsado por el riesgo (Risk-Driven).
        </p>
        
        {/* Animated Central Sphere */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 mx-auto mb-16">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 md:w-72 md:h-72 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-full shadow-[0_0_80px_rgba(52,211,153,0.4)] transition-transform duration-500 hover:scale-105 cursor-pointer flex items-center justify-center group overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
               <span className="text-black font-black text-6xl md:text-8xl opacity-10 group-hover:opacity-20 transition-opacity">S³</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => document.getElementById('waitlist')?.scrollIntoView({behavior: 'smooth'})}
          className="bg-emerald-500 text-black font-black px-12 py-5 rounded-full hover:bg-emerald-400 transition-all transform hover:scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-lg"
        >
          Únete a los Pioneros (Waitlist)
        </button>
      </section>

      {/* The Gap Section */}
      <section className="relative z-10 bg-gray-900/50 py-24 border-y border-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">La brecha de la ejecución</h2>
            <p className="text-gray-500 text-center mb-16">La sostenibilidad lineal ha tocado techo. Es hora de integrar financiera y climáticamente.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="text-5xl font-bold text-emerald-400 mb-4">46%</div>
                <h3 className="text-xl font-bold mb-4 text-white">Temas Materiales sin Objetivos</h3>
                <p className="text-gray-400 leading-relaxed">Casi la mitad de los temas materiales del IBEX 35 no tienen objetivos publicados. La narrativa supera a la acción.</p>
                <div className="mt-6 text-xs text-gray-600 font-mono">Fuente: Estudio EY Ibex 35</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                <div className="text-5xl font-bold text-cyan-400 mb-4">40%</div>
                <h3 className="text-xl font-bold mb-4 text-white">Desconexión Financiera</h3>
                <p className="text-gray-400 leading-relaxed">De las empresas no conectan sus riesgos ESG con el mapa de riesgos corporativos. El impacto real no se mide en euros.</p>
                <div className="mt-6 text-xs text-gray-600 font-mono">Fuente: Reporte Riesgos ESG 2024</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section (MSCI) */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Ingeniería Local + Inteligencia Global</h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/40">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-xl text-white">Smart REM: Metodología New ERA</h4>
                  <p className="text-gray-400">Enterprise Risk Agile aplicada a la ingeniería de instalaciones e IoT en tiempo real.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/40">
                   <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-xl text-white">MSCI: Datos de Impacto Financiero</h4>
                  <p className="text-gray-400">Análisis de 28 peligros físicos y Climate Value-at-Risk (VaR) para activos inmobiliarios globales.</p>
                </div>
              </div>
            </div>
            <p className="mt-12 text-lg text-emerald-400 font-bold border-l-2 border-emerald-500 pl-6 italic">
              "Transformamos la incertidumbre climática en rentabilidad antifrágil."
            </p>
          </div>
          <div className="md:w-1/2 relative">
             <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden group">
                <div className="relative text-center p-12">
                   <div className="text-8xl font-black text-white/10 group-hover:scale-110 transition-transform duration-700">MSCI</div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 bg-emerald-500 rounded-full mix-blend-screen blur-2xl animate-pulse"></div>
                   </div>
                   <p className="mt-8 text-sm text-gray-500 tracking-[0.3em] uppercase">Partnership Tecnológico</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Gamified Waitlist */}
      <section id="waitlist" className="relative z-10 py-32 bg-emerald-600">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto bg-black rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5">
            <div className="flex flex-col md:flex-row">
              {/* Rewards Levels */}
              <div className="md:w-1/2 p-12 bg-gradient-to-br from-gray-900 to-black">
                <h3 className="text-3xl font-bold mb-8">Niveles de Pionero</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 transition-all group">
                    <div className="text-4xl grayscale group-hover:grayscale-0 transition-all">🥇</div>
                    <div>
                      <div className="font-bold text-emerald-400 text-sm uppercase mb-1">Top 3 (Nivel Oro)</div>
                      <p className="text-gray-300 text-sm">Informe Resiliencia (+1k€) + easyESG Pro + Diseño a Medida.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-4xl grayscale">🥈</div>
                    <div>
                      <div className="font-bold text-gray-400 text-sm uppercase mb-1">Niveles 4-6 (Plata)</div>
                      <p className="text-gray-300 text-sm">Licencia easyESG Pro + Sesión de Estrategia.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-4xl grayscale">🥉</div>
                    <div>
                      <div className="font-bold text-amber-800/80 text-sm uppercase mb-1">Niveles 7-9 (Bronce)</div>
                      <p className="text-gray-300 text-sm">Diseño de Modelo ESG a Medida + Sorpresa Especial.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-white/10">
                   <div className="flex justify-between text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">
                      <span>Capacidad fase 1</span>
                      <span>{pioneersCount} / 250</span>
                   </div>
                   <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{width: `${(pioneersCount/250)*100}%`}}></div>
                   </div>
                </div>
              </div>

              {/* Form */}
              <div className="md:w-1/2 p-12 bg-white flex flex-col justify-center">
                {formSubmitted ? (
                  <div className="text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h4 className="text-black text-3xl font-bold mb-4">¡Ya eres Pionero!</h4>
                    <p className="text-gray-600 mb-8 leading-relaxed">Te hemos asignado un puesto prioritario en la lista 2026. Recibirás un correo con tus beneficios en breve.</p>
                    <button 
                      onClick={() => {setFormSubmitted(false); setPrivacyAccepted(false); setFormData({name: '', company: '', email: '', role: '', activity: '', otherActivity: ''});}}
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      Añadir otro compañero
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-black text-3xl font-bold mb-8 text-center md:text-left">Acceso Pionero</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre completo" className={inputClasses} />
                      <input required type="text" name="company" value={formData.company} onChange={handleInputChange} placeholder="Empresa" className={inputClasses} />
                      <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email corporativo" className={inputClasses} />
                      <input required type="text" name="role" value={formData.role} onChange={handleInputChange} placeholder="Cargo" className={inputClasses} />
                      
                      <div className="relative group">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 ml-4">Actividad del Sector</label>
                        <select 
                          required 
                          name="activity" 
                          value={formData.activity} 
                          onChange={handleInputChange} 
                          className={`${inputClasses} ${formData.activity === '' ? 'text-gray-400' : 'text-black'}`}
                        >
                          <option value="" disabled hidden>Seleccione su actividad...</option>
                          {activityOptions.map(opt => <option key={opt} value={opt} className="text-black">{opt}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-5 top-8 flex items-center pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>

                      {formData.activity === 'Otros' && (
                        <input 
                          required 
                          type="text" 
                          name="otherActivity" 
                          value={formData.otherActivity} 
                          onChange={handleInputChange} 
                          placeholder="Especifique su actividad..." 
                          className={`${inputClasses} animate-fadeIn`} 
                        />
                      )}
                      
                      <div className="flex items-start mt-4 px-2">
                        <input
                          id="privacy-vision"
                          name="privacy-vision"
                          type="checkbox"
                          required
                          className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mt-1 cursor-pointer"
                          checked={privacyAccepted}
                          onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        />
                        <label htmlFor="privacy-vision" className="ml-3 block text-[11px] text-gray-500 leading-snug">
                          Acepto el tratamiento de mis datos personales para recibir acceso pionero y comunicaciones comerciales de Smart Rem Solutions. Puedes consultar nuestra <a href="https://smartremsolutions.com/politica-privacidad/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold">Política de Privacidad</a> (RGPD).
                        </label>
                      </div>

                      <button 
                        type="submit"
                        disabled={!privacyAccepted || isSending}
                        className="w-full bg-emerald-600 text-white font-bold py-5 rounded-2xl hover:bg-emerald-700 transition-all transform hover:scale-[1.02] shadow-xl disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center"
                      >
                        {isSending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Enviando solicitud...
                          </>
                        ) : 'Quiero mi Acceso Pionero'}
                      </button>
                    </form>
                    <p className="mt-6 text-center text-[10px] text-gray-400 uppercase tracking-widest">Exclusivo para profesionales del sector Real Estate y ESG</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center text-gray-500 text-xs">
        <div className="container mx-auto px-6">
          <p className="mb-4">&copy; {new Date().getFullYear()} Smart REM Solutions. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-6 mb-4">
             <a href="https://smartremsolutions.com/politica-privacidad/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacidad</a>
             <a href="#" className="hover:text-white transition-colors">Términos</a>
             <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <p className="opacity-40 uppercase tracking-[0.2em]">Desarrollado por MSCI Data & Smart REM Engineering</p>
        </div>
      </footer>
    </div>
  );
};

export default Vision2026;
