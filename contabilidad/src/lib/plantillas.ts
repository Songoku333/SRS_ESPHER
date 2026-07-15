import { CategoriaGasto, LineaServicio } from '../types';

/**
 * Plantillas de estimación por línea de servicio. Cifras ORIENTATIVAS basadas en
 * ratios de mercado de ingeniería/consultoría en España (honorarios liberalizados
 * desde la Ley Ómnibus 2009; visado colegial ~0,6–2,5% del PEM con mínimos).
 * Todo es editable en el momento de generar el proyecto.
 */
export interface RolPlantilla {
  nombre: string;
  pesoHoras: number; // % del total de horas estimadas
  costeHora: number; // €/h que se paga al colaborador (precio medio de mercado, editable)
  ventaHora: number; // €/h de venta al cliente (precio medio de mercado en España)
}

export interface GastoPlantilla {
  concepto: string;
  categoria: CategoriaGasto;
  modo: 'pct' | 'fijo'; // % sobre la base imponible o importe fijo
  valor: number;
}

export interface DisciplinaPlantilla {
  nombre: string;
  peso: number; // % de las horas técnicas del trabajo
}

export interface Plantilla {
  eurPorHora: number; // tarifa media efectiva para estimar las horas totales
  /** Desglose técnico típico por actividad/disciplina (solo líneas de ingeniería) */
  disciplinas?: DisciplinaPlantilla[];
  ticketMercado: [number, number]; // rango típico de honorarios en España (base €)
  /** Curva de dimensionado por superficie: horas = max(horasMin, coef · m²^exp).
   *  El exponente < 1 recoge la economía de escala del sector (a más m², menos h/m²). */
  superficie: { coef: number; exp: number; horasMin: number };
  comercialPct: number;
  generalesPct: number;
  roles: RolPlantilla[];
  gastos: GastoPlantilla[];
}

export const PLANTILLAS: Record<LineaServicio, Plantilla> = {
  'Ingeniería MEP': {
    eurPorHora: 45,
    ticketMercado: [5000, 45000],
    superficie: { coef: 0.7, exp: 0.75, horasMin: 40 },
    disciplinas: [
      { nombre: 'Climatización / HVAC', peso: 28 },
      { nombre: 'Electricidad', peso: 24 },
      { nombre: 'PCI (protección contra incendios)', peso: 14 },
      { nombre: 'Fontanería y saneamiento', peso: 12 },
      { nombre: 'Telecomunicaciones / ICT', peso: 8 },
      { nombre: 'Gas y combustibles', peso: 5 },
      { nombre: 'Coordinación y proyecto', peso: 9 },
    ],
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Ingeniero proyectista', pesoHoras: 45, costeHora: 35, ventaHora: 55 },
      { nombre: 'Modelador BIM / Delineante', pesoHoras: 30, costeHora: 28, ventaHora: 40 },
      { nombre: 'Director / Revisor de proyecto', pesoHoras: 15, costeHora: 50, ventaHora: 80 },
      { nombre: 'Tramitador administrativo', pesoHoras: 10, costeHora: 22, ventaHora: 32 },
    ],
    gastos: [
      { concepto: 'Visado colegial', categoria: 'Visados y colegios', modo: 'pct', valor: 1.0 },
      { concepto: 'Seguro RC del proyecto', categoria: 'Seguros (RC, decenal)', modo: 'fijo', valor: 120 },
      { concepto: 'Copias, impresión y encuadernación', categoria: 'Suministros y oficina', modo: 'fijo', valor: 60 },
      { concepto: 'Desplazamientos a obra', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 1.5 },
    ],
  },
  Legalizaciones: {
    eurPorHora: 42,
    ticketMercado: [1500, 8000],
    superficie: { coef: 4, exp: 0.45, horasMin: 25 },
    disciplinas: [
      { nombre: 'Electricidad (BT/AT)', peso: 34 },
      { nombre: 'Climatización / RITE', peso: 20 },
      { nombre: 'PCI (protección contra incendios)', peso: 18 },
      { nombre: 'Gas y combustibles', peso: 10 },
      { nombre: 'Telecomunicaciones / ICT', peso: 6 },
      { nombre: 'Tramitación y coordinación', peso: 12 },
    ],
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Ingeniero', pesoHoras: 50, costeHora: 35, ventaHora: 55 },
      { nombre: 'Tramitador administrativo', pesoHoras: 25, costeHora: 22, ventaHora: 32 },
      { nombre: 'Director / Firma técnica', pesoHoras: 15, costeHora: 50, ventaHora: 80 },
      { nombre: 'Apoyo técnico', pesoHoras: 10, costeHora: 25, ventaHora: 35 },
    ],
    gastos: [
      { concepto: 'OCA / inspección', categoria: 'OCA / Inspecciones', modo: 'fijo', valor: 350 },
      { concepto: 'Tasas de la administración (Industria)', categoria: 'Tasas y licencias administrativas', modo: 'fijo', valor: 120 },
      { concepto: 'Visado colegial', categoria: 'Visados y colegios', modo: 'pct', valor: 1.0 },
      { concepto: 'Desplazamientos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 2.0 },
    ],
  },
  'Auditoría energética': {
    eurPorHora: 48,
    ticketMercado: [2500, 12000],
    superficie: { coef: 1.2, exp: 0.55, horasMin: 20 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Auditor energético', pesoHoras: 45, costeHora: 40, ventaHora: 60 },
      { nombre: 'Técnico de campo / mediciones', pesoHoras: 30, costeHora: 28, ventaHora: 40 },
      { nombre: 'Analista de datos', pesoHoras: 25, costeHora: 30, ventaHora: 45 },
    ],
    gastos: [
      { concepto: 'Alquiler de equipos de medición', categoria: 'Material y equipos', modo: 'fijo', valor: 250 },
      { concepto: 'Desplazamientos y visitas', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 3.0 },
      { concepto: 'Registro / certificación', categoria: 'Tasas y licencias administrativas', modo: 'fijo', valor: 90 },
    ],
  },
  'Modelado y simulación energética': {
    eurPorHora: 50,
    ticketMercado: [3000, 15000],
    superficie: { coef: 1.4, exp: 0.55, horasMin: 24 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Modelador energético (HULC/IDA/DesignBuilder)', pesoHoras: 50, costeHora: 38, ventaHora: 60 },
      { nombre: 'Ingeniero', pesoHoras: 30, costeHora: 35, ventaHora: 55 },
      { nombre: 'QA / Revisión', pesoHoras: 20, costeHora: 45, ventaHora: 65 },
    ],
    gastos: [
      { concepto: 'Licencias de software de simulación', categoria: 'Software y licencias', modo: 'pct', valor: 4.0 },
      { concepto: 'Desplazamientos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 1.0 },
    ],
  },
  'Consultoría fondos inmobiliarios': {
    eurPorHora: 65,
    ticketMercado: [8000, 60000],
    superficie: { coef: 1.8, exp: 0.5, horasMin: 30 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Consultor senior', pesoHoras: 45, costeHora: 55, ventaHora: 90 },
      { nombre: 'Analista técnico', pesoHoras: 35, costeHora: 35, ventaHora: 55 },
      { nombre: 'Due diligence / Soporte', pesoHoras: 20, costeHora: 32, ventaHora: 45 },
    ],
    gastos: [
      { concepto: 'Desplazamientos y visitas a activos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 3.0 },
      { concepto: 'Maquetación de informes', categoria: 'Suministros y oficina', modo: 'fijo', valor: 150 },
    ],
  },
  'Consultoría residencial': {
    eurPorHora: 55,
    ticketMercado: [4000, 25000],
    superficie: { coef: 1.5, exp: 0.5, horasMin: 24 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Consultor senior', pesoHoras: 40, costeHora: 55, ventaHora: 90 },
      { nombre: 'Técnico', pesoHoras: 40, costeHora: 30, ventaHora: 45 },
      { nombre: 'Soporte', pesoHoras: 20, costeHora: 25, ventaHora: 35 },
    ],
    gastos: [
      { concepto: 'Desplazamientos y visitas', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 2.5 },
      { concepto: 'Informes', categoria: 'Suministros y oficina', modo: 'fijo', valor: 120 },
    ],
  },
  'Clima y sostenibilidad': {
    eurPorHora: 55,
    ticketMercado: [5000, 30000],
    superficie: { coef: 1.6, exp: 0.6, horasMin: 30 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Consultor sostenibilidad (BREEAM/LEED)', pesoHoras: 45, costeHora: 45, ventaHora: 75 },
      { nombre: 'Técnico', pesoHoras: 35, costeHora: 30, ventaHora: 45 },
      { nombre: 'QA / Revisión', pesoHoras: 20, costeHora: 45, ventaHora: 65 },
    ],
    gastos: [
      { concepto: 'Tasas de certificación (BREEAM/LEED/Passivhaus)', categoria: 'Tasas y licencias administrativas', modo: 'fijo', valor: 400 },
      { concepto: 'Registro', categoria: 'Tasas y licencias administrativas', modo: 'fijo', valor: 150 },
      { concepto: 'Desplazamientos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 2.0 },
    ],
  },
  'Pre-assessment BREEAM': {
    // Mercado España: preevaluación aislada 2.000–4.000 € en proyecto estándar,
    // hasta ~9.000 € en activos grandes (1–2 semanas, 40–80 h). Las tasas de
    // registro/certificación BREEAM ES van aparte (2.200–13.800 € según m²).
    eurPorHora: 58,
    ticketMercado: [2500, 9000],
    superficie: { coef: 1.0, exp: 0.5, horasMin: 32 },
    disciplinas: [
      { nombre: 'Gestión (Man)', peso: 12 },
      { nombre: 'Salud y bienestar (Hea)', peso: 15 },
      { nombre: 'Energía (Ene)', peso: 24 },
      { nombre: 'Transporte (Tra)', peso: 8 },
      { nombre: 'Agua (Wat)', peso: 6 },
      { nombre: 'Materiales (Mat)', peso: 12 },
      { nombre: 'Residuos (Wst)', peso: 6 },
      { nombre: 'Uso del suelo y ecología (LE)', peso: 8 },
      { nombre: 'Contaminación (Pol)', peso: 9 },
    ],
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Asesor BREEAM (evaluación y puntuación)', pesoHoras: 40, costeHora: 50, ventaHora: 85 },
      { nombre: 'Ingeniero de instalaciones (energía y agua)', pesoHoras: 25, costeHora: 35, ventaHora: 55 },
      { nombre: 'Consultor de sostenibilidad', pesoHoras: 20, costeHora: 45, ventaHora: 75 },
      { nombre: 'Técnico de documentación', pesoHoras: 15, costeHora: 25, ventaHora: 40 },
    ],
    gastos: [
      { concepto: 'Visita al activo y desplazamientos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 2.5 },
      { concepto: 'Maquetación del informe de preevaluación', categoria: 'Suministros y oficina', modo: 'fijo', valor: 150 },
    ],
  },
  Otros: {
    eurPorHora: 45,
    ticketMercado: [2000, 15000],
    superficie: { coef: 1.5, exp: 0.5, horasMin: 16 },
    comercialPct: 10,
    generalesPct: 20,
    roles: [
      { nombre: 'Ingeniero / Consultor', pesoHoras: 60, costeHora: 35, ventaHora: 55 },
      { nombre: 'Apoyo técnico', pesoHoras: 40, costeHora: 25, ventaHora: 35 },
    ],
    gastos: [{ concepto: 'Desplazamientos', categoria: 'Desplazamientos y dietas', modo: 'pct', valor: 2.0 }],
  },
};

export interface RolEstimado {
  nombre: string;
  horas: number;
}
export interface GastoEstimado {
  concepto: string;
  categoria: CategoriaGasto;
  base: number;
}
export interface Estimacion {
  linea: LineaServicio;
  eurPorHora: number;
  totalHoras: number;
  comercialPct: number;
  generalesPct: number;
  roles: RolEstimado[];
  gastos: GastoEstimado[];
}

const r0 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Genera una estimación (horas por rol y gastos típicos) para una línea y una base imponible. */
export function estimarProyecto(linea: LineaServicio, base: number, eurPorHoraOverride?: number): Estimacion {
  const pl = PLANTILLAS[linea] ?? PLANTILLAS['Otros'];
  const eurPorHora = eurPorHoraOverride && eurPorHoraOverride > 0 ? eurPorHoraOverride : pl.eurPorHora;
  const totalHoras = base > 0 ? r0(base / eurPorHora) : 0;
  const roles: RolEstimado[] = pl.roles.map((rol) => ({
    nombre: rol.nombre,
    horas: r0((totalHoras * rol.pesoHoras) / 100),
  }));
  const gastos: GastoEstimado[] = pl.gastos.map((g) => ({
    concepto: g.concepto,
    categoria: g.categoria,
    base: g.modo === 'pct' ? r2((base * g.valor) / 100) : g.valor,
  }));
  return {
    linea,
    eurPorHora,
    totalHoras,
    comercialPct: pl.comercialPct,
    generalesPct: pl.generalesPct,
    roles,
    gastos,
  };
}

/** Adivina la línea de servicio a partir del concepto/título de la factura. */
export function adivinarLinea(texto: string): LineaServicio {
  const t = (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const has = (...ws: string[]) => ws.some((w) => t.includes(w));
  if (has('legaliz', 'puesta en marcha', 'boletin', 'oca', 'industria')) return 'Legalizaciones';
  if (has('auditoria energetica', 'auditoria', 'certificado energetico', 'cee')) return 'Auditoría energética';
  if (has('simulacion', 'modelado', 'hulc', 'calener', 'designbuilder', 'ida ice')) return 'Modelado y simulación energética';
  if (has('fondo', 'due diligence', 'inversion', 'socimi', 'cartera', 'activos')) return 'Consultoría fondos inmobiliarios';
  if (has('residencia', 'residencial', 'senior living', 'flex living', 'coliving')) return 'Consultoría residencial';
  if (has('breeam') && has('pre-assessment', 'preassessment', 'pre assessment', 'preevaluacion', 'pre-evaluacion', 'preanalisis', 'pre-analisis')) return 'Pre-assessment BREEAM';
  if (has('sostenib', 'breeam', 'leed', 'passivhaus', 'esg', 'descarboniz', 'clima')) return 'Clima y sostenibilidad';
  if (has('mep', 'climatizacion', 'electric', 'fontaneria', 'pci', 'instalacion', 'hvac')) return 'Ingeniería MEP';
  return 'Otros';
}
