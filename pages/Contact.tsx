import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    company: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically handle form submission (e.g., API call)
    console.log('Form submitted:', formState);
    setSubmitted(true);
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
          <div className="bg-gray-50 p-8 rounded-lg">
            {submitted ? (
              <div className="text-center py-10">
                <h2 className="text-2xl font-bold text-emerald-600">Gracias por su mensaje.</h2>
                <p className="mt-4 text-gray-600">Nos pondremos en contacto con usted en breve.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" name="name" id="name" required value={formState.name} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">Empresa</label>
                  <input type="text" name="company" id="company" value={formState.company} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" id="email" required value={formState.email} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensaje</label>
                  <textarea name="message" id="message" rows={5} required value={formState.message} onChange={handleChange} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"></textarea>
                </div>
                <div>
                  <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors">
                    Enviar Mensaje
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-8 pt-8 md:pt-0">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Dirección</h3>
              <p className="mt-2 text-gray-600">Paseo de la Castellana, 93<br/>28046 Madrid, España</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Email</h3>
              <a href="mailto:contacto@smartremsolutions.com" className="mt-2 text-emerald-600 hover:underline">contacto@smartremsolutions.com</a>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">LinkedIn</h3>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="mt-2 text-emerald-600 hover:underline">/smart-rem-solutions</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;