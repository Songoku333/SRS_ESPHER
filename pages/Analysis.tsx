import React, { useState, useEffect } from 'react';
import { type Page } from '../types';
import { GoogleGenAI } from '@google/genai';

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
        analysisType: 'Análisis de Resiliencia Climática',
        gla: '15000',
        buildYear: '1995',
        pue: '1.5',
    });
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [result, setResult] = useState<{ analysisText: string; risks: Record<string, string>; sources: any[] } | null>(null);

     useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting user location:", error);
                }
            );
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateAnalysis = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const fullAddress = `${formData.address}, ${formData.postalCode}, España`;
            const prompt = `
                Realiza un análisis de resiliencia y riesgo climático para un activo de tipo "${formData.assetType}" en la dirección: "${fullAddress}".
                El análisis debe centrarse en los siguientes riesgos físicos principales: Olas de Calor, Inundaciones, y Sequías.
                Proporciona un resumen de no más de 100 palabras sobre la situación climática general de la zona.
                Finalmente, DEBES incluir una línea con el siguiente formato exacto para la clasificación de riesgos:
                SEMAFORO_RIESGOS:Olas de Calor=[NIVEL],Inundaciones=[NIVEL],Sequías=[NIVEL]
                Donde [NIVEL] puede ser 'Bajo', 'Medio', o 'Alto'.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleMaps: {} }],
                    ...(userLocation && {
                        toolConfig: {
                            retrievalConfig: {
                                latLng: userLocation
                            }
                        }
                    })
                },
            });

            const text = response.text;
            
            const risks: Record<string, string> = {};
            const riskRegex = /SEMAFORO_RIESGOS:(.*)/;
            const riskMatch = text.match(riskRegex);

            if (riskMatch && riskMatch[1]) {
                riskMatch[1].split(',').forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key && value) {
                        risks[key.trim()] = value.trim();
                    }
                });
            }

            const analysisText = text.replace(riskRegex, '').trim();
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            
            setResult({
                analysisText,
                risks,
                sources
            });

            setStep(3);

        } catch (error) {
            console.error("Error generating analysis:", error);
            alert("Hubo un error al generar el análisis. Por favor, intente de nuevo.");
        } finally {
            setLoading(false);
        }
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
                return result && (
                    <div>
                         <h2 className="text-2xl font-bold mb-2 text-center text-emerald-700">Análisis Preliminar Completado</h2>
                         <p className="text-center text-gray-600 mb-6">Resultados para: {formData.address}</p>
                         
                         <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                            {result.sources.length > 0 && result.sources[0].maps && (
                                 <div className="bg-white p-4 rounded-md border text-center">
                                    <h3 className="text-xl font-semibold text-gray-800">Ubicación del Activo</h3>
                                    <p className="mt-1 text-gray-600">Visualice la ubicación y obtenga más información contextual.</p>
                                    <a 
                                        href={result.sources[0].maps.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
                                    >
                                        Ver en Google Maps
                                    </a>
                                </div>
                            )}
                            
                            <div className="p-4 border rounded-md">
                                <h3 className="font-bold text-lg mb-2">Resumen de Resiliencia Climática</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{result.analysisText}</p>
                            </div>

                            <TrafficLight risks={result.risks} />

                            <div className="text-center bg-white p-6 rounded-lg border border-emerald-200 shadow-sm">
                                <h3 className="text-xl font-bold">Este es solo el comienzo.</h3>
                                <p className="mt-2 text-gray-600">Este análisis básico, basado en fuentes públicas y benchmarks, indica un potencial de mejora y riesgos a gestionar. Un estudio detallado permitiría crear un plan de acción financiable y con un ROI claro.</p>
                                <button onClick={() => setCurrentPage('contact')} className="mt-4 bg-gray-800 text-white font-semibold px-8 py-3 rounded-full hover:bg-black transition-colors duration-300">
                                    Solicitar un Estudio Completo
                                </button>
                            </div>

                             {result.sources.length > 0 && (
                                <div className="text-xs text-gray-500 pt-4 border-t">
                                    <p className="font-semibold mb-1">Fuentes:</p>
                                    <ul className="list-disc list-inside">
                                        {result.sources.filter(s => s.maps).map((source, index) => (
                                            <li key={index}>
                                                <a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                                                    {source.maps.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                         </div>
                         <button onClick={() => {setResult(null); setStep(1);}} className="w-full mt-6 text-emerald-600 font-semibold hover:underline">Realizar otro análisis</button>
                    </div>
                );
            default:
                return null;
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

const TrafficLight: React.FC<{ risks: Record<string, string> }> = ({ risks }) => {
    const getColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'bajo': return 'bg-green-500';
            case 'medio': return 'bg-yellow-500';
            case 'alto': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="p-4 border rounded-md">
            <h3 className="font-bold text-lg mb-4 text-center">Semáforo de Riesgo Climático</h3>
            <div className="flex justify-around items-start text-center">
                {/* FIX: Refactored to use Object.keys to avoid type inference issues with Object.entries where `level` was inferred as `unknown`. */}
                {Object.keys(risks).map((risk) => {
                    const level = risks[risk];
                    return (
                        <div key={risk} className="flex-1 px-2">
                            <div className={`w-16 h-16 rounded-full mx-auto mb-2 border-4 border-gray-700 flex items-center justify-center`}>
                                <div className={`w-12 h-12 rounded-full ${getColor(level)}`}></div>
                            </div>
                            <p className="font-semibold">{risk}</p>
                            <p className="text-sm text-gray-600">{level || 'N/A'}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Analysis;
