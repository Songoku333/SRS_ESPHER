
import React from 'react';

const Philosophy: React.FC = () => {
  return (
    <div className="bg-white animate-fadeIn">
      <header className="bg-gray-800 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">Sostenibilidad Esférica: El Nuevo Paradigma Empresarial.</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">Es hora de ir más allá del reporte. Es hora de rediseñar el núcleo de su negocio.</p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto space-y-16">
          
          <article>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">El Fin de la Sostenibilidad Plana</h2>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p>Durante décadas, la sostenibilidad ha sido tratada como una lista de tareas: obtener un sello, publicar un informe, cumplir una regulación. Este enfoque "plano" es reactivo, limitado y, en última instancia, frágil. Trata la sostenibilidad como un centro de coste, una obligación, en lugar de lo que realmente es: el motor más potente para la innovación, la resiliencia y la creación de valor a largo plazo.</p>
              <p>Las empresas que se aferran a este modelo están construyendo sobre cimientos inestables, vulnerables a los shocks del mercado, las crisis climáticas y los cambios sociales. Están mirando por el espejo retrovisor mientras el futuro acelera hacia ellos.</p>
            </div>
          </article>
          
          <article className="bg-gray-50 p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-emerald-600 mb-4">Nacimiento de la Esfera</h2>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p>La naturaleza nos enseña una lección fundamental: la esfera es la forma más resiliente, eficiente y perfecta. Contiene el máximo volumen con la mínima superficie. Resiste la presión desde todas las direcciones. Así deben ser las organizaciones del siglo XXI.</p>
              <p>La Sostenibilidad Esférica es un modelo de gestión integral que concibe a la empresa como un sistema vivo, en simbiosis con su entorno. No hay "dentro" y "fuera"; solo un ecosistema interconectado. Cada decisión —desde la cadena de suministro hasta el desarrollo de productos y la cultura interna— se toma considerando su impacto y su oportunidad en 360 grados.</p>
            </div>
          </article>

          <article>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Vibrando con la Amormonía</h2>
            <div className="prose prose-lg max-w-none text-gray-600">
              <p>El núcleo energético de la Sostenibilidad Esférica es la <span className="font-semibold">Amormonía</span> (Amor + Harmonía). Es la filosofía de acción que guía cada interacción: "dar sin esperar nada a cambio para acabar recibiendo mucho más".</p>
              <p>En términos empresariales, esto se traduce en crear valor genuino para todos los stakeholders no como un medio para un fin, sino como el fin mismo. Al enfocarse en el bienestar de sus empleados, la prosperidad de sus clientes, la salud de la comunidad y la regeneración del planeta, una organización genera un campo de confianza y reciprocidad. Este capital relacional se convierte en su activo más valioso, generando retornos inesperados y fortaleciendo su resiliencia de formas que los balances tradicionales no pueden medir.</p>
            </div>
          </article>

          <article className="border-t pt-12">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Principios de una Organización Esférica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Flexibilidad Radical</h3>
                <p className="text-gray-600">Adaptabilidad estructural para fluir con el cambio, no resistirlo.</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Agilidad Estratégica</h3>
                <p className="text-gray-600">Capacidad de pivotar y capturar oportunidades emergentes en tiempo real.</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Simbiosis con el Entorno</h3>
                <p className="text-gray-600">Operar como un ecosistema, donde el éxito mutuo es la única métrica.</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Propósito Centrado en el Bien Común</h3>
                <p className="text-gray-600">Un norte claro que va más allá del beneficio, atrayendo talento y lealtad.</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Philosophy;
