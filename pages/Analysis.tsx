import React, { useState, useMemo } from 'react';
import { type Page } from '../types';

interface AnalysisProps {
    setCurrentPage: (page: Page) => void;
}

const assetTypes = ['Oficinas', 'Logística', 'Retail', 'Residencial', 'Data Center'];
const analysisOptions = [
    'Plan de Descarbonización (CRREM)',
    'Análisis de Resiliencia Climática',
    'Evaluación de Riesgos ESG',
    'Análisis de Riesgo de Transición',
];

const Analysis: React.FC<AnalysisProps> = ({ setCurrentPage }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        address: 'Paseo de la Castellana, 93',
        postalCode: '28046',
        assetType: 'Oficinas',
        analysisType: 'Plan de Descarbonización (CRREM)',
        gla: '15000',
        buildYear: '1995',
        pue: '1.5',
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateAnalysis = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call and data processing
        setTimeout(() => {
            const simulatedData = {
                catastralRef: `12345${Math.floor(Math.random() * 900 + 100)}XX${Math.floor(Math.random() * 900 + 100)}Y`,
                climateZone: 'D3 (AEMET)',
                currentIntensity: 50 + Math.random() * 20, // kgCO2/m2/yr
                crremPathway2030: 30,
                crremPathway2050: 5,
                strandingYear: 2028 + Math.floor(Math.random() * 5),
                climateRisks: {
                    heatwave: 'Alto',
                    flooding: 'Bajo',
                    drought: 'Medio-Alto',
                },
            };
            setResult(simulatedData);
            setLoading(false);
            setStep(3); // Move to result step
        }, 2500);
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-6 text-center">Paso 1: Identifique su Activo</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección</label>
                                <input type="text" name="address" id="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                            </div>
                            <div>
                                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Código Postal</label>
                                <input type="text" name="postalCode" id="postalCode" value={formData.postalCode} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                            </div>
                            <div>
                                <label htmlFor="assetType" className="block text-sm font-medium text-gray-700">Tipo de Activo</label>
                                <select name="assetType" id="assetType" value={formData.assetType} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md bg-white text-gray-900">
                                    {assetTypes.map(type => <option key={type}>{type}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={() => setStep(2)} className="w-full mt-6 bg-emerald-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-emerald-700 transition-colors">Siguiente</button>
                    </div>
                );
            case 2:
                return (
                    <form onSubmit={generateAnalysis}>
                        <h2 className="text-2xl font-bold mb-6 text-center">Paso 2: Configure su Análisis</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="analysisType" className="block text-sm font-medium text-gray-700">Tipo de Estudio Solicitado</label>
                                <select name="analysisType" id="analysisType" value={formData.analysisType} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md bg-white text-gray-900">
                                    {analysisOptions.map(opt => <option key={opt}>{opt}</option>)}
                                </select>
                            </div>
                            
                            {formData.assetType !== 'Data Center' && (
                                <>
                                    <div>
                                        <label htmlFor="gla" className="block text-sm font-medium text-gray-700">Superficie (m²)</label>
                                        <input type="number" name="gla" id="gla" value={formData.gla} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                                    </div>
                                    <div>
                                        <label htmlFor="buildYear" className="block text-sm font-medium text-gray-700">Año de Construcción</label>
                                        <input type="number" name="buildYear" id="buildYear" value={formData.buildYear} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                                    </div>
                                </>
                            )}
                            {formData.assetType === 'Data Center' && (
                                <div>
                                    <label htmlFor="pue" className="block text-sm font-medium text-gray-700">PUE (Power Usage Effectiveness)</label>
                                    <input type="number" step="0.1" name="pue" id="pue" value={formData.pue} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-6">
                            <button type="button" onClick={() => setStep(1)} className="text-gray-600 hover:underline">Atrás</button>
                            <button type="submit" disabled={loading} className="bg-emerald-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400">
                                {loading ? 'Analizando...' : 'Generar Análisis Básico'}
                            </button>
                        </div>
                    </form>
                );
            case 3:
                return (
                    <div>
                         <h2 className="text-2xl font-bold mb-2 text-center text-emerald-700">Análisis Preliminar Completado</h2>
                         <p className="text-center text-gray-600 mb-6">Resultados para: {formData.address}</p>
                         
                         <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoCard title="Referencia Catastral (Simulada)" value={result.catastralRef} />
                                <InfoCard title="Zona Climática (Simulada)" value={result.climateZone} />
                            </div>

                            {formData.analysisType === 'Plan de Descarbonización (CRREM)' && (
                                <div className="p-4 border rounded-md">
                                    <h3 className="font-bold text-lg mb-2">Resultado del Análisis CRREM</h3>
                                    <div className="flex justify-around text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-red-500">{result.currentIntensity.toFixed(1)}</p>
                                            <p className="text-sm text-gray-500">Intensidad Actual (kgCO₂/m²)</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">{result.crremPathway2030}</p>
                                            <p className="text-sm text-gray-500">Objetivo CRREM 2030</p>
                                        </div>
                                    </div>
                                    <p className="text-center mt-4 bg-orange-100 text-orange-800 font-semibold p-2 rounded-md">
                                        Año de Obsolescencia (Stranding Year) Proyectado: <span className="text-xl">{result.strandingYear}</span>
                                    </p>
                                </div>
                            )}

                             {formData.analysisType === 'Análisis de Resiliencia Climática' && (
                                <div className="p-4 border rounded-md">
                                    <h3 className="font-bold text-lg mb-2">Matriz de Riesgo Climático Físico</h3>
                                    <div className="space-y-2">
                                        <RiskItem risk="Olas de Calor" level={result.climateRisks.heatwave} />
                                        <RiskItem risk="Inundaciones Fluviales" level={result.climateRisks.flooding} />
                                        <RiskItem risk="Sequías" level={result.climateRisks.drought} />
                                    </div>
                                </div>
                            )}

                            <div className="text-center bg-white p-6 rounded-lg border border-emerald-200 shadow-sm">
                                <h3 className="text-xl font-bold">Este es solo el comienzo.</h3>
                                <p className="mt-2 text-gray-600">Este análisis básico, basado en fuentes públicas y benchmarks, indica un potencial de mejora y riesgos a gestionar. Un estudio detallado permitiría crear un plan de acción financiable y con un ROI claro.</p>
                                <button onClick={() => setCurrentPage('contact')} className="mt-4 bg-gray-800 text-white font-semibold px-8 py-3 rounded-full hover:bg-black transition-colors duration-300">
                                    Solicitar un Estudio Completo
                                </button>
                            </div>
                         </div>
                         <button onClick={() => {setResult(null); setStep(1);}} className="w-full mt-6 text-emerald-600 font-semibold hover:underline">Realizar otro análisis</button>
                    </div>
                )
        }
    }

    return (
        <div className="animate-fadeIn">
            <header className="bg-gray-800 text-white py-20">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold">Análisis Preliminar de Activos</h1>
                    <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">
                        Obtenga una primera visión del rendimiento y riesgo de su activo utilizando nuestra herramienta de análisis basada en datos públicos y benchmarks de mercado.
                    </p>
                </div>
            </header>
            <div className="bg-gray-50">
                <div className="container mx-auto px-6 py-20">
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
                        {renderStepContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoCard: React.FC<{title: string; value: string}> = ({ title, value }) => (
    <div className="bg-white p-3 rounded-md border text-center">
        <h4 className="text-sm font-semibold text-gray-500">{title}</h4>
        <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
);

const RiskItem: React.FC<{risk: string; level: 'Bajo' | 'Medio' | 'Medio-Alto' | 'Alto'}> = ({ risk, level }) => {
    const levelColor = {
        'Bajo': 'bg-green-100 text-green-800',
        'Medio': 'bg-yellow-100 text-yellow-800',
        'Medio-Alto': 'bg-orange-100 text-orange-800',
        'Alto': 'bg-red-100 text-red-800'
    }[level];
    return (
        <div className="flex justify-between items-center p-2 rounded-md bg-gray-100">
            <span>{risk}</span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${levelColor}`}>{level}</span>
        </div>
    );
}

export default Analysis;