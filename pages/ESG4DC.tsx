
import React, { useState } from 'react';
import { type Page } from '../types';
import emailjs from '@emailjs/browser';

interface ESG4DCProps {
  setCurrentPage: (page: Page) => void;
}

const ESG4DC: React.FC<ESG4DCProps> = ({ setCurrentPage }) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      alert("Por favor, acepta la política de privacidad.");
      return;
    }

    setIsSending(true);

    const SERVICE_ID = 'service_f49c4ti';
    const TEMPLATE_ID = 'template_blcs7zr';
    const PUBLIC_KEY = '06F9z0t2ajTcdyDnT';

    const emailMessage = `
        SOLICITUD DE CONTACTO ESG4DC (DATA CENTERS)
        
        DATOS:
        Nombre: ${formData.name}
        Empresa: ${formData.company}
        Email: ${formData.email}
        Mensaje: ${formData.message}
        
        ORIGEN: ESG4DC Landing Page
    `;

    const templateParams = {
        title: 'Nuevo Lead: ESG4DC Specialized',
        name: formData.name,
        email: formData.email,
        time: new Date().toLocaleString('es-ES'),
        message: emailMessage
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      setFormSubmitted(true);
    } catch (error) {
      console.error("Error sending ESG4DC contact:", error);
      alert("Error al enviar. Inténtalo de nuevo.");
    } finally {
      setIsSending(false);
    }
  };

  const inputClasses = "w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-500 transition-all";

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Tech Background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-cyan-500/10 blur-[150px] rounded-full"></div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 container mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black text-sm">DC</div>
          <div className="text-xl font-black tracking-tighter">ESG<span className="text-blue-500">4</span>DC</div>
        </div>
        <button 
          onClick={() => setCurrentPage('home')}
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver a Smart Rem
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-16 pb-24 text-center max-w-5xl">
          <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              Data Center Specialist Division
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-tight">
              Especialistas en Maximizar la <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Sostenibilidad de Data Centers.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-4xl mx-auto leading-relaxed mb-12">
              Como expertos en la evaluación y mejora del <strong>EU CoC</strong>, maximizamos la rentabilidad de la sostenibilidad de las infraestructuras críticas alineándonos con la <strong>Taxonomía Verde Europea</strong>.
          </p>
          <div className="flex justify-center gap-6">
              <button 
                onClick={() => document.getElementById('contact-dc')?.scrollIntoView({behavior: 'smooth'})}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]"
              >
                  Solicitar Auditoría PUE
              </button>
              <a 
                href="https://www.linkedin.com/company/esg4dc/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 text-white font-bold px-10 py-5 rounded-2xl transition-all border border-white/10 flex items-center gap-2"
              >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  Seguir ESG4DC
              </a>
          </div>
      </section>

      {/* Metrics Section */}
      <section className="bg-slate-900 py-24 border-y border-slate-800">
          <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                  <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800">
                      <div className="text-5xl font-black text-blue-500 mb-2">PUE</div>
                      <h4 className="font-bold text-xl mb-4">Power Usage Effectiveness</h4>
                      <p className="text-slate-500">Optimizamos la eficiencia energética total del activo bajo estándares EU CoC.</p>
                  </div>
                  <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800">
                      <div className="text-5xl font-black text-cyan-500 mb-2">WUE</div>
                      <h4 className="font-bold text-xl mb-4">Water Usage Effectiveness</h4>
                      <p className="text-slate-500">Reducimos el consumo hídrico alineándonos con la Taxonomía Verde Europea.</p>
                  </div>
                  <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800">
                      <div className="text-5xl font-black text-indigo-500 mb-2">ERE</div>
                      <h4 className="font-bold text-xl mb-4">Energy Reuse Effectiveness</h4>
                      <p className="text-slate-500">Diseñamos soluciones para la reutilización del calor residual y circularidad.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Contact Section */}
      <section id="contact-dc" className="py-32">
          <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-16 border border-slate-800 shadow-2xl">
                  {formSubmitted ? (
                      <div className="text-center py-20">
                          <div className="w-20 h-20 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-8">
                              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <h2 className="text-4xl font-bold mb-4">Mensaje Recibido</h2>
                          <p className="text-slate-400 text-lg mb-12">Un consultor experto de nuestra división ESG4DC se pondrá en contacto contigo.</p>
                          <button 
                            onClick={() => {setFormSubmitted(false); setFormData({name: '', company: '', email: '', message: ''});}}
                            className="text-blue-500 font-bold hover:underline"
                          >
                            Enviar otra consulta
                          </button>
                      </div>
                  ) : (
                      <>
                          <div className="text-center mb-16">
                              <h2 className="text-4xl font-black mb-4">Hablemos de tu Infraestructura</h2>
                              <p className="text-slate-400 text-lg">Especialistas en auditorías técnicas y cumplimiento EU CoC / Taxonomía para centros de datos.</p>
                          </div>
                          <form onSubmit={handleSubmit} className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre" className={inputClasses} />
                                  <input required type="text" name="company" value={formData.company} onChange={handleInputChange} placeholder="Empresa" className={inputClasses} />
                              </div>
                              <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email corporativo" className={inputClasses} />
                              <textarea required name="message" value={formData.message} onChange={handleInputChange} placeholder="Cuéntanos sobre tus necesidades o retos actuales en DC..." rows={4} className={inputClasses}></textarea>
                              
                              <div className="flex items-start gap-4 py-4">
                                  <input 
                                    id="privacy-dc" 
                                    type="checkbox" 
                                    required 
                                    className="h-6 w-6 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 mt-1" 
                                    checked={privacyAccepted}
                                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                  />
                                  <label htmlFor="privacy-dc" className="text-sm text-slate-400 leading-snug">
                                      Acepto la política de privacidad y el tratamiento de mis datos para fines profesionales relacionados con ESG4DC y Smart Rem. <a href="https://smartremsolutions.com/politica-privacidad/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver política completa.</a>
                                  </label>
                              </div>

                              <button 
                                type="submit" 
                                disabled={isSending}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-2xl transition-all transform hover:scale-[1.01] shadow-xl flex items-center justify-center gap-3 disabled:bg-slate-700"
                              >
                                  {isSending ? 'Enviando consulta...' : 'Solicitar Información Técnica'}
                              </button>
                          </form>
                      </>
                  )}
              </div>
          </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-12 border-t border-slate-900 text-center text-slate-600 text-xs">
          <div className="container mx-auto px-6">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-black text-[10px]">DC</div>
                <div className="font-black tracking-tighter text-sm">ESG<span className="text-blue-500">4</span>DC</div>
              </div>
              <p className="mb-4">ESG4DC es la marca especializada en infraestructuras críticas de Smart Rem Solutions.</p>
              <p>&copy; {new Date().getFullYear()} Smart Rem Solutions. Todos los derechos reservados.</p>
          </div>
      </footer>
    </div>
  );
};

export default ESG4DC;
