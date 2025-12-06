
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
            // Check for API Key Selection for Gemini 3.0
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (!hasKey) {
                    await window.aistudio.openSelectKey();
                }
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const fullAddress = `${formData.address}, ${formData.postalCode}, España`;
            
            // Strategic Prompt for Gemini 3.0 Pro
            // Using a complex prompt that requires the model to "Think" as a strategist
            const prompt = `
                Actúa como un Consultor Senior de Estrategia de Sostenibilidad en "Smart Rem Solutions". Tu tono es profesional, visionario y experto.
                
                Analiza el activo:
                Tipo: ${formData.assetType}
                Dirección: ${fullAddress}
                Contexto: ${formData.analysisType}

                Tarea:
                1. Utiliza Google Maps para entender el entorno micro-climático y urbano real.
                2. Redacta un "Brief Estratégico de Resiliencia" (máx 200 palabras). NO hagas una lista aburrida. Escribe una narrativa potente que explique cómo la ubicación específica y el tipo de activo presentan desafíos que pueden transformarse en ventajas competitivas usando la filosofía de "Sostenibilidad Esférica". Habla de oportunidades de inversión, reputación y longevidad del activo.
                3. Evalúa los riesgos climáticos (Olas de Calor, Inundaciones, Sequías) basándote en la ubicación.

                Formato de Salida Requerido:
                Primero, el texto narrativo del Brief.
                Al final, añade EXACTAMENTE esta línea oculta para parsear el semáforo:
                SEMAFORO_RIESGOS:Olas de Calor=[NIVEL],Inundaciones=[NIVEL],Sequías=[NIVEL]
                (Donde [NIVEL] es Bajo, Medio o Alto).
            `;

            // Using Gemini 3.0 Pro Preview for superior reasoning and "Thinking" capabilities
            const response = await ai.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    // Enable thinking for deep analysis of the location and strategy
                    thinkingConfig: { thinkingBudget: 2048 },
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

        } catch (error: any) {
            console.error("Error generating analysis:", error);
             if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.toString().includes('403')) {
                const retry = window.confirm("Se requiere una API Key válida y compatible con Gemini 3.0 para realizar este análisis. ¿Desea configurarla ahora?");
                if (retry && window.aistudio) {
                    await window.aistudio.openSelectKey();
                    // We don't auto-retry here to prevent loop, user can click "Generar" again
                }
            } else {
                alert("Hubo un error al generar el análisis estratégico. Por favor, intente de nuevo.");
            }
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
                        <h2 className="text-2xl font-bold mb-6 text-center">Paso 2: Configure su Estrategia</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="analysisType" className="block text-sm font-medium text-gray-700">Enfoque del Estudio</label>
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
                            <button type="submit" disabled={loading} className="bg-emerald-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400 flex items-center justify-center">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Razonando Estrategia...
                                    </>
                                ) : 'Generar Análisis con IA'}
                            </button>
                        </div>
                    </form>
                );
            case 3:
                return result && (
                    <div>
                         <h2 className="text-2xl font-bold mb-2 text-center text-emerald-700">Informe Estratégico Preliminar</h2>
                         <p className="text-center text-gray-600 mb-6">Activo: {formData.address}</p>
                         
                         <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                            {result.sources.length > 0 && result.sources[0].maps && (
                                 <div className="bg-white p-4 rounded-md border text-center shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-800">Ubicación Verificada</h3>
                                    <p className="mt-1 text-gray-600 text-sm">Análisis basado en datos geográficos reales.</p>
                                    <a 
                                        href={result.sources[0].maps.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block text-emerald-600 hover:text-emerald-700 font-semibold text-sm hover:underline"
                                    >
                                        Ver en Google Maps &rarr;
                                    </a>
                                </div>
                            )}
                            
                            <div className="p-6 bg-white border border-emerald-100 rounded-lg shadow-sm">
                                <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Visión del Consultor
                                </h3>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.analysisText}</p>
                            </div>

                            <TrafficLight risks={result.risks} />

                            <div className="text-center bg-gray-900 text-white p-8 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold">Transforme este Insight en Acción.</h3>
                                <p className="mt-3 text-gray-300 mb-6">Nuestra IA ha detectado el potencial. Nuestros expertos lo hacen realidad.</p>
                                <button onClick={() => setCurrentPage('contact')} className="bg-emerald-500 text-white font-bold px-8 py-3 rounded-full hover:bg-emerald-600 transition-transform duration-300 transform hover:scale-105 shadow-lg">
                                    Agendar Sesión Estratégica
                                </button>
                            </div>

                             {result.sources.length > 0 && (
                                <div className="text-xs text-gray-500 pt-4 border-t">
                                    <p className="font-semibold mb-1">Fuentes de Datos:</p>
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
                         <button onClick={() => {setResult(null); setStep(1);}} className="w-full mt-6 text-gray-500 text-sm hover:text-emerald-600 font-semibold">Realizar otro análisis</button>
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
                    <h1 className="text-4xl md:text-5xl font-bold">Análisis de Resiliencia Inteligente</h1>
                    <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto">
                        Potenciado por <strong>Gemini 3.0 Pro</strong>. Obtenga una evaluación estratégica instantánea de la vulnerabilidad y el potencial oculto de su activo.
                    </p>
                </div>
            </header>
            <div className="bg-gray-50">
                <div className="container mx-auto px-6 py-20">
                    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border-t-4 border-emerald-500">
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
            case 'bajo': return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
            case 'medio': return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]';
            case 'alto': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
            default: return 'bg-gray-300';
        }
    };

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-center text-gray-800">Matriz de Riesgo Climático</h3>
            <div className="flex flex-wrap justify-around items-start text-center gap-4">
                {Object.keys(risks).map((risk) => {
                    const level = risks[risk];
                    return (
                        <div key={risk} className="flex-1 min-w-[100px]">
                            <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center transition-all duration-500 ${getColor(level)}`}>
                            </div>
                            <p className="font-semibold text-gray-700 text-sm">{risk}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase mt-1">{level || 'N/A'}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Analysis;
