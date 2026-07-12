import { CategoriaGasto } from '../types';
import { GastoPrevisto, LineaEquipo } from './estimador';

/**
 * Módulo de sostenibilidad inteligente (inmótica / smart building + ESG).
 * Ofertable solo o como extra de cualquier línea: sensórica y medición
 * conectadas al BMS/BACS, eficiencia y confort, y KPIs listos para reportar
 * en los marcos estándar a través de la plataforma EasyESG.pro.
 *
 * Dimensionado con referencias de mercado del segmento (Deepki, Measurabl,
 * Spacewell/Dexma, aedifion): SaaS ≈ 0,1–1 €/m²/año según alcance, hardware
 * por puntos de medida y servicios profesionales de implantación. La EPBD
 * 2024 obliga a BACS en terciario (2024–2029, SRI para >290 kW) y a
 * monitorizar la calidad del aire interior en edificios cero emisiones y
 * renovaciones importantes: argumento normativo directo de la venta.
 */

export type NivelSostenibilidad = 'esencial' | 'avanzado' | 'premium';

export interface NivelSpec {
  etiqueta: string;
  descripcion: string;
  /** m² cubiertos por cada sensor ambiental (CO2, temperatura, humedad, PM) */
  m2PorSensorIAQ: number;
  precioSensorIAQ: number; // € instalado
  /** m² por punto de submetering eléctrico/térmico (0 = sin submetering) */
  m2PorSubmeter: number;
  precioSubmeter: number;
  gatewayBms: number; // € pasarela + integración física BMS/BACS
  // Horas de servicio SRS
  horasAuditoriaPorM2: number;
  horasAuditoriaMin: number;
  horasIntegracionBms: number;
  horasKpisEasyEsg: number; // configuración de KPIs y cuadros de mando en EasyESG.pro
  horasAutomatizaciones: number; // escenas, optimización, puesta en marcha
  /** SaaS EasyESG.pro (€/m²·año, con mínimo anual) — ingreso recurrente aparte */
  saasEurM2Anyo: number;
  saasMinAnyo: number;
}

export const NIVELES: Record<NivelSostenibilidad, NivelSpec> = {
  esencial: {
    etiqueta: 'Esencial — medir y reportar',
    descripcion: 'Sensórica ambiental (CO₂, T, HR), consumo general, KPIs y reporting en EasyESG.pro.',
    m2PorSensorIAQ: 150,
    precioSensorIAQ: 180,
    m2PorSubmeter: 0,
    precioSubmeter: 0,
    gatewayBms: 1200,
    horasAuditoriaPorM2: 0.02,
    horasAuditoriaMin: 12,
    horasIntegracionBms: 8,
    horasKpisEasyEsg: 16,
    horasAutomatizaciones: 0,
    saasEurM2Anyo: 0.6,
    saasMinAnyo: 600,
  },
  avanzado: {
    etiqueta: 'Avanzado — eficiencia y confort',
    descripcion: 'Añade submetering por usos, calidad de aire por zonas e integración BMS bidireccional.',
    m2PorSensorIAQ: 100,
    precioSensorIAQ: 200,
    m2PorSubmeter: 500,
    precioSubmeter: 450,
    gatewayBms: 1800,
    horasAuditoriaPorM2: 0.03,
    horasAuditoriaMin: 16,
    horasIntegracionBms: 24,
    horasKpisEasyEsg: 20,
    horasAutomatizaciones: 8,
    saasEurM2Anyo: 0.9,
    saasMinAnyo: 900,
  },
  premium: {
    etiqueta: 'Premium — edificio inteligente',
    descripcion: 'Automatización y optimización continua (clima, iluminación), análisis predictivo y SRI.',
    m2PorSensorIAQ: 80,
    precioSensorIAQ: 220,
    m2PorSubmeter: 300,
    precioSubmeter: 450,
    gatewayBms: 3000,
    horasAuditoriaPorM2: 0.04,
    horasAuditoriaMin: 24,
    horasIntegracionBms: 40,
    horasKpisEasyEsg: 28,
    horasAutomatizaciones: 24,
    saasEurM2Anyo: 1.2,
    saasMinAnyo: 1500,
  },
};

/** Marcos de reporte soportados y horas de configuración inicial (mapeo de
 *  KPIs, materialidad y primera campaña en EasyESG.pro). */
export const ESTANDARES_REPORTE = [
  { id: 'CSRD', nombre: 'CSRD / ESRS (E1 clima)', horasSetup: 14 },
  { id: 'VSME', nombre: 'VSME (pymes, voluntario)', horasSetup: 8 },
  { id: 'GRESB', nombre: 'GRESB (inmobiliario)', horasSetup: 10 },
  { id: 'EPBD', nombre: 'EPBD / SRI (indicador de inteligencia)', horasSetup: 12 },
] as const;

export type EstandarId = (typeof ESTANDARES_REPORTE)[number]['id'];

export const ROL_CONSULTOR_ESG = '🌱 Consultor ESG / Sostenibilidad';
export const ROL_INTEGRADOR = '🌱 Integrador BMS / IoT';

export interface ModuloSostenibilidad {
  nivel: NivelSostenibilidad;
  estandares: EstandarId[];
  equipo: LineaEquipo[]; // horas de servicio (se suman al equipo de la oferta)
  gastos: GastoPrevisto[]; // hardware e instalación (gastos directos)
  horas: number;
  hardware: number;
  saasAnual: number; // suscripción EasyESG.pro (recurrente, aparte de la oferta)
  notas: string[];
}

const r0 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Dimensiona el módulo para una superficie dada. */
export function calcularModuloSostenibilidad(
  m2: number,
  nivel: NivelSostenibilidad,
  estandares: EstandarId[]
): ModuloSostenibilidad {
  const s = NIVELES[nivel];
  const sup = Math.max(100, m2 || 1000); // sin m², dimensiona un activo tipo de 1.000 m²

  const nSensores = Math.max(3, Math.ceil(sup / s.m2PorSensorIAQ));
  const nSubmeters = s.m2PorSubmeter > 0 ? Math.max(2, Math.ceil(sup / s.m2PorSubmeter)) : 0;

  const gastos: GastoPrevisto[] = [
    {
      concepto: `Sensores IAQ (CO₂, T, HR, PM) — ${nSensores} uds instaladas`,
      categoria: 'Material y equipos' as CategoriaGasto,
      base: r2(nSensores * s.precioSensorIAQ),
    },
    ...(nSubmeters > 0
      ? [
          {
            concepto: `Submetering eléctrico/térmico — ${nSubmeters} puntos`,
            categoria: 'Material y equipos' as CategoriaGasto,
            base: r2(nSubmeters * s.precioSubmeter),
          },
        ]
      : []),
    {
      concepto: 'Pasarela e integración física BMS/BACS',
      categoria: 'Material y equipos' as CategoriaGasto,
      base: s.gatewayBms,
    },
  ];

  const horasAuditoria = r0(Math.max(s.horasAuditoriaMin, sup * s.horasAuditoriaPorM2));
  const horasEstandares = estandares.reduce(
    (t, id) => t + (ESTANDARES_REPORTE.find((e) => e.id === id)?.horasSetup || 0),
    0
  );
  const equipo: LineaEquipo[] = [
    {
      rol: `${ROL_CONSULTOR_ESG} (auditoría y KPIs${estandares.length ? ` · ${estandares.join(', ')}` : ''})`,
      horas: horasAuditoria + s.horasKpisEasyEsg + horasEstandares,
      costeHora: 45,
      ventaHora: 75,
    },
    {
      rol: `${ROL_INTEGRADOR} (sensórica, BMS y automatización)`,
      horas: s.horasIntegracionBms + s.horasAutomatizaciones,
      costeHora: 40,
      ventaHora: 65,
    },
  ];

  const hardware = r2(gastos.reduce((t, g) => t + g.base, 0));
  const horas = equipo.reduce((t, e) => t + e.horas, 0);
  const saasAnual = r2(Math.max(s.saasMinAnyo, sup * s.saasEurM2Anyo));

  const notas = [
    `Módulo dimensionado para ${sup.toLocaleString('es-ES')} m² (nivel ${s.etiqueta.split(' — ')[0]}): ${nSensores} sensores IAQ${nSubmeters ? `, ${nSubmeters} puntos de submetering` : ''} e integración BMS/BACS.`,
    `Reporte y gestión de KPIs a través de EasyESG.pro: ${saasAnual.toFixed(0)} €/año de suscripción (recurrente, se factura aparte de esta oferta).`,
    ...(estandares.includes('EPBD')
      ? ['La EPBD 2024 exige BACS en terciario (2024–2029) y monitorización de calidad de aire en renovaciones importantes: este módulo deja el edificio preparado.']
      : []),
  ];

  return { nivel, estandares, equipo, gastos, horas, hardware, saasAnual, notas };
}
