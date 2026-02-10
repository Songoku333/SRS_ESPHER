
import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

const Contact: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    company: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // DATOS DE EMAILJS - CONFIGURACIÓN FINAL
    const SERVICE_ID = 'service_f49c4ti'; 
    const TEMPLATE_ID = 'template_blcs7zr'; 
    const PUBLIC_KEY = '06F9z0t2ajTcdyDnT';

    // Preparamos los parámetros para que coincidan con tu plantilla:
    // Plantilla espera: {{title}}, {{name}}, {{time}}, {{message}}, {{email}}
    const templateParams = {
        title: 'Nuevo Lead desde Web Smart Rem', // Variable {{title}}
        name: formState.name,                    // Variable {{name}}
        email: formState.email,                  // Variable {{email}} (Para Reply-To)
        time: new Date().toLocaleString('es-ES'), // Variable {{time}}
        // Concatenamos la empresa Y EL EMAIL al mensaje para asegurar que se vean en el cuerpo del correo
        message: `${formState.message}\n\n--------------------------------\nDATOS DE CONTACTO:\nEmpresa: ${formState.company}\nEmail: ${formState.email}` 
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      .then((result) => {
          console.log('Email enviado con éxito:', result.text);
          setStatus('success');
      }, (error) => {
          console.error('Error al enviar email:', error.text);
          setStatus('error');
      });
  };

  return (
    <div className="bg-white animate-fadeIn">
      <header className="bg-emerald-600 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">Iniciemos la Evolución.</h1>
          <p className="mt-4 text-lg text-emerald-100 max-w-3xl mx-auto">
            Creemos que cada conversación es una oportunidad para co-crear valor. Hablemos.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="bg-gray-50 p-8 rounded-lg shadow-inner">
            {status === 'success' ? (
              <div className="text-center py-10 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-emerald-800">Mensaje Enviado</h2>
                <p className="mt-4 text-gray-600">Gracias por contactar con Smart Rem Solutions.</p>
                <p className="text-gray-500 text-sm mt-2">Hemos recibido sus datos y le responderemos a la mayor brevedad posible.</p>
                <button 
                    onClick={() => { setStatus('idle'); setFormState({name: '', company: '', email: '', message: ''}); }}
                    className="mt-6 text-emerald-600 font-semibold hover:underline"
                >
                    Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" name="name" id="name" required value={formState.name} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" placeholder="Su nombre completo" />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">Empresa</label>
                  <input type="text" name="company" id="company" value={formState.company} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" placeholder="Nombre de su organización" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Corporativo</label>
                  <input type="email" name="email" id="email" required value={formState.email} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" placeholder="ejemplo@empresa.com" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensaje</label>
                  <textarea name="message" id="message" rows={5} required value={formState.message} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" placeholder="¿Cómo podemos ayudarle a transformar su sostenibilidad en valor?"></textarea>
                </div>
                
                {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                        Hubo un error al enviar el mensaje. Verifique la consola o intente de nuevo más tarde.
                    </div>
                )}

                <div>
                  <button 
                    type="submit" 
                    disabled={status === 'sending'}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition-all duration-300 ${
                        status === 'sending' 
                        ? 'bg-emerald-400 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    {status === 'sending' ? (
                        <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Enviando...
                        </div>
                    ) : 'Enviar Mensaje'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-8 pt-8 md:pt-0">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Oficina Central
              </h3>
              <p className="text-gray-600 ml-7">Calle Alcalá, 375, 1º<br/>28027 Madrid, España</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 Contacto Directo
              </h3>
              <a href="mailto:info@smartremsolutions.com" className="block text-emerald-600 hover:underline ml-7 font-medium">info@smartremsolutions.com</a>
              <p className="text-sm text-gray-500 ml-7 mt-1">Respuesta garantizada en 24h laborables.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
               <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd"/></svg>
                 Síguenos
              </h3>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="block text-emerald-600 hover:underline ml-7">LinkedIn: /smart-rem-solutions</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
