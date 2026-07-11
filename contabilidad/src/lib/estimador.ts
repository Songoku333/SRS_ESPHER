import { AppData, CategoriaGasto, EstimacionOferta, LineaServicio, LINEAS_SERVICIO } from '../types';
import { desgloseFactura, repartoValor } from './liquidacion';
import { PLANTILLAS, adivinarLinea } from './plantillas';

const r0 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Base de conocimiento: lo que dicen TUS números (facturas, gastos imputados,
 * repartos y liquidaciones) sobre cada línea de servicio. Alimenta las
 * sugerencias del asistente de ofertas; donde el histórico es escaso
 * (menos de MIN_FACTURAS), el asistente cae a las tarifas de mercado.
 */
export interface BenchmarkLinea {
  linea: LineaServicio;
  nFacturas: number; // facturas no anuladas clasificadas en la línea
  baseTotal: number;
  ticketMedio: number; // base media por factura
  /** gastos imputados / base, medido solo en facturas con costes completos
   *  (liquidadas o con algún gasto imputado) para no diluir con facturas a medio imputar */
  pctGastosDirectos: number | null;
  nFacturasConCoste: number;
  /** reparto pagado a comercial+colaboradores / base (facturas con reparto configurado) */
  pctReparto: number | null;
  /** margen neto real medio de las facturas liquidadas (0-1) */
  margenReal: number | null;
  nFacturasCerradas: number;
  /** €/h realmente pagado en proyectos con reparto por horas */
  costeHoraReal: number | null;
}

export const MIN_FACTURAS = 3;

export function benchmarksHistorico(data: AppData): Record<LineaServicio, BenchmarkLinea> {
  const out = {} as Record<LineaServicio, BenchmarkLinea>;
  for (const linea of LINEAS_SERVICIO) {
    out[linea] = {
      linea,
      nFacturas: 0,
      baseTotal: 0,
      ticketMedio: 0,
      pctGastosDirectos: null,
      nFacturasConCoste: 0,
      pctReparto: null,
      margenReal: null,
      nFacturasCerradas: 0,
      costeHoraReal: null,
    };
  }

  // Acumuladores por línea
  const acc = {} as Record<
    LineaServicio,
    { baseConCoste: number; gastos: number; baseConReparto: number; reparto: number; baseCerrada: number; beneficio: number; horas: number; pagoHoras: number }
  >;
  for (const l of LINEAS_SERVICIO) acc[l] = { baseConCoste: 0, gastos: 0, baseConReparto: 0, reparto: 0, baseCerrada: 0, beneficio: 0, horas: 0, pagoHoras: 0 };

  for (const f of data.facturas) {
    if (f.estado === 'anulada' || f.base <= 0) continue;
    const proyecto = data.proyectos.find((p) => p.id === f.proyectoId);
    const linea = proyecto?.lineaServicio ?? adivinarLinea(`${f.concepto} ${proyecto?.nombre || ''}`);
    const b = out[linea];
    const a = acc[linea];
    b.nFacturas++;
    b.baseTotal += f.base;

    const d = desgloseFactura(data, f);
    const costesCompletos = f.liquidada || d.gastos.length > 0;
    if (costesCompletos) {
      b.nFacturasConCoste++;
      a.baseConCoste += f.base;
      a.gastos += d.totalGastos;
    }
    if (d.lineas.length > 0) {
      a.baseConReparto += f.base;
      a.reparto += d.totalAPagar;
    }
    if (f.liquidada) {
      b.nFacturasCerradas++;
      a.baseCerrada += f.base;
      a.beneficio += f.base - d.totalGastos - d.totalAPagar;
    }
    // Coste €/h real: proyectos con reparto por horas
    if (proyecto?.modoReparto === 'horas') {
      const horas = (proyecto.repartos || []).reduce((s, r) => s + repartoValor(r), 0);
      const pago = d.lineas.filter((l) => l.rol === 'colaborador').reduce((s, l) => s + l.importe, 0);
      if (horas > 0 && pago > 0) {
        a.horas += horas;
        a.pagoHoras += pago;
      }
    }
  }

  for (const linea of LINEAS_SERVICIO) {
    const b = out[linea];
    const a = acc[linea];
    b.ticketMedio = b.nFacturas > 0 ? r2(b.baseTotal / b.nFacturas) : 0;
    b.pctGastosDirectos = a.baseConCoste > 0 ? a.gastos / a.baseConCoste : null;
    b.pctReparto = a.baseConReparto > 0 ? a.reparto / a.baseConReparto : null;
    b.margenReal = a.baseCerrada > 0 ? a.beneficio / a.baseCerrada : null;
    b.costeHoraReal = a.horas > 0 ? r2(a.pagoHoras / a.horas) : null;
  }
  return out;
}

// ------------------------------------------------------------------
// Cálculo del presupuesto
// ------------------------------------------------------------------

export interface LineaEquipo {
  rol: string;
  horas: number;
  costeHora: number; // €/h pagado al colaborador
  ventaHora?: number; // €/h de venta de mercado (referencia, no entra en el cálculo)
}

/** Referencia "oficial" de mercado en España para una línea de servicio:
 *  tarifas medias ponderadas por el mix de roles y ticket típico. */
export interface ReferenciaMercado {
  costeMedioHora: number; // €/h medio pagado a colaboradores
  ventaMediaHora: number; // €/h medio de venta al cliente
  ticketMercado: [number, number]; // rango típico de honorarios (base €)
}

export function referenciaMercado(linea: LineaServicio): ReferenciaMercado {
  const pl = PLANTILLAS[linea] ?? PLANTILLAS['Otros'];
  const pesos = pl.roles.reduce((s, r) => s + r.pesoHoras, 0) || 1;
  return {
    costeMedioHora: r2(pl.roles.reduce((s, r) => s + r.costeHora * r.pesoHoras, 0) / pesos),
    ventaMediaHora: r2(pl.roles.reduce((s, r) => s + r.ventaHora * r.pesoHoras, 0) / pesos),
    ticketMercado: pl.ticketMercado,
  };
}

/** Lo que costaría este trabajo a precio de mercado: horas × tarifa de venta media. */
export function precioMercadoEquipo(equipo: LineaEquipo[]): number {
  return r2(equipo.reduce((s, e) => s + e.horas * (e.ventaHora ?? 0), 0));
}

export interface GastoPrevisto {
  concepto: string;
  categoria: CategoriaGasto;
  base: number;
}

export interface ParametrosPresupuesto {
  linea: LineaServicio;
  equipo: LineaEquipo[];
  gastos: GastoPrevisto[];
  contingenciaPct: number; // % sobre el coste del equipo (imprevistos)
  comercialPct: number; // % sobre (precio − gastos), como en la cascada de liquidación
  generalesPct: number; // % sobre (precio − gastos) que retiene la empresa
  margenObjetivoPct: number; // beneficio neto objetivo sobre el precio
}

export interface ResultadoPresupuesto {
  totalHoras: number;
  costeEquipo: number;
  contingencia: number;
  gastosDirectos: number;
  costeTotal: number; // equipo + contingencia + gastos
  /** Precio (base imponible) que cubre costes, comercial y generales y deja el margen objetivo */
  precioRecomendado: number;
  /** Precio por debajo del cual se pierde dinero (margen 0, cubriendo comercial y generales) */
  precioMinimo: number;
  tarifaEfectiva: number; // precio recomendado / horas
}

/** Evaluación de un precio concreto (el recomendado o el que quiera poner el usuario). */
export interface EvaluacionPrecio {
  precio: number;
  comercial: number;
  generales: number; // retenido por la empresa (cubre estructura)
  beneficio: number; // neto tras todo
  margen: number; // beneficio / precio (0-1)
  retornoEmpresa: number; // generales + beneficio: lo que queda en casa
}

/** Cascada usada (idéntica a la liquidación): comercial y generales se aplican
 *  sobre (precio − gastos directos). Con margen objetivo m:
 *  precio·(1−c−g−m) = equipo + contingencia + gastos·(1−c−g) */
export function calcularPresupuesto(p: ParametrosPresupuesto): ResultadoPresupuesto {
  const costeEquipo = r2(p.equipo.reduce((s, e) => s + e.horas * e.costeHora, 0));
  const contingencia = r2((costeEquipo * p.contingenciaPct) / 100);
  const gastosDirectos = r2(p.gastos.reduce((s, g) => s + g.base, 0));
  const costeTotal = r2(costeEquipo + contingencia + gastosDirectos);
  const cg = (p.comercialPct + p.generalesPct) / 100;
  const m = p.margenObjetivoPct / 100;
  const numerador = costeEquipo + contingencia + gastosDirectos * (1 - cg);
  const precioRecomendado = 1 - cg - m > 0.01 ? r2(numerador / (1 - cg - m)) : 0;
  const precioMinimo = 1 - cg > 0.01 ? r2(numerador / (1 - cg)) : 0;
  const totalHoras = r2(p.equipo.reduce((s, e) => s + e.horas, 0));
  return {
    totalHoras,
    costeEquipo,
    contingencia,
    gastosDirectos,
    costeTotal,
    precioRecomendado,
    precioMinimo,
    tarifaEfectiva: totalHoras > 0 && precioRecomendado > 0 ? r2(precioRecomendado / totalHoras) : 0,
  };
}

export function evaluarPrecio(p: ParametrosPresupuesto, precio: number): EvaluacionPrecio {
  const costeEquipo = p.equipo.reduce((s, e) => s + e.horas * e.costeHora, 0);
  const contingencia = (costeEquipo * p.contingenciaPct) / 100;
  const gastos = p.gastos.reduce((s, g) => s + g.base, 0);
  const neto = precio - gastos;
  const comercial = r2((neto * p.comercialPct) / 100);
  const generales = r2((neto * p.generalesPct) / 100);
  const beneficio = r2(neto - comercial - generales - costeEquipo - contingencia);
  return {
    precio,
    comercial,
    generales,
    beneficio,
    margen: precio > 0 ? beneficio / precio : 0,
    retornoEmpresa: r2(generales + beneficio),
  };
}

/** Reparte un total de horas entre los roles según los pesos de la plantilla. */
export function equipoSugerido(linea: LineaServicio, totalHoras: number): LineaEquipo[] {
  const pl = PLANTILLAS[linea] ?? PLANTILLAS['Otros'];
  return pl.roles.map((rol) => ({
    rol: rol.nombre,
    horas: Math.max(1, r0((totalHoras * rol.pesoHoras) / 100)),
    costeHora: rol.costeHora,
    ventaHora: rol.ventaHora,
  }));
}

export type Complejidad = 'sencillo' | 'medio' | 'complejo';
export const FACTOR_COMPLEJIDAD: Record<Complejidad, number> = {
  sencillo: 0.8,
  medio: 1,
  complejo: 1.3,
};

/** Propuesta inicial completa para una línea: horas por rol, gastos previstos y
 *  parámetros, mezclando tu histórico (si hay ≥ MIN_FACTURAS) con el mercado. */
export function sugerirParametros(
  data: AppData,
  linea: LineaServicio,
  importeObjetivo: number | undefined,
  complejidad: Complejidad,
  benchmark?: BenchmarkLinea
): { params: ParametrosPresupuesto; baseReferencia: number; notas: string[] } {
  const pl = PLANTILLAS[linea] ?? PLANTILLAS['Otros'];
  const b = benchmark ?? benchmarksHistorico(data)[linea];
  const notas: string[] = [];

  const baseReferencia =
    importeObjetivo && importeObjetivo > 0
      ? importeObjetivo
      : b.nFacturas >= MIN_FACTURAS
        ? b.ticketMedio
        : 6000;
  if (!importeObjetivo && b.nFacturas >= MIN_FACTURAS) {
    notas.push(`Dimensionado sobre tu ticket medio en ${linea}: ${b.ticketMedio.toFixed(0)} € (${b.nFacturas} facturas).`);
  }

  const totalHoras = r0((baseReferencia / pl.eurPorHora) * FACTOR_COMPLEJIDAD[complejidad]);
  const equipo = equipoSugerido(linea, totalHoras);
  // Si el histórico dice cuánto pagas realmente por hora, ajusta el coste medio
  if (b.costeHoraReal) {
    const medio = equipo.reduce((s, e) => s + e.horas * e.costeHora, 0) / Math.max(1, equipo.reduce((s, e) => s + e.horas, 0));
    const factor = b.costeHoraReal / medio;
    if (factor > 0.5 && factor < 2) {
      for (const e of equipo) e.costeHora = r2(e.costeHora * factor);
      notas.push(`Coste €/h ajustado a tu histórico real: ${b.costeHoraReal.toFixed(2)} €/h de media.`);
    }
  }

  let gastos: GastoPrevisto[] = pl.gastos.map((g) => ({
    concepto: g.concepto,
    categoria: g.categoria,
    base: g.modo === 'pct' ? r2((baseReferencia * g.valor) / 100) : g.valor,
  }));
  // Escala los gastos previstos al % real de coste directo de tu histórico
  if (b.pctGastosDirectos !== null && b.nFacturasConCoste >= MIN_FACTURAS) {
    const previsto = gastos.reduce((s, g) => s + g.base, 0);
    const real = baseReferencia * b.pctGastosDirectos;
    if (previsto > 0 && real > 0) {
      const factor = real / previsto;
      gastos = gastos.map((g) => ({ ...g, base: r2(g.base * factor) }));
      notas.push(
        `Gastos directos ajustados a tu histórico: ${(b.pctGastosDirectos * 100).toFixed(1).replace('.', ',')}% de la base (${b.nFacturasConCoste} facturas con costes).`
      );
    }
  }

  return {
    params: {
      linea,
      equipo,
      gastos,
      contingenciaPct: complejidad === 'complejo' ? 10 : 5,
      comercialPct: pl.comercialPct,
      generalesPct: pl.generalesPct,
      margenObjetivoPct: 15,
    },
    baseReferencia,
    notas,
  };
}

/** Reescala las horas del equipo para que un precio dado alcance el margen objetivo. */
export function ajustarHorasAPrecio(p: ParametrosPresupuesto, precio: number): LineaEquipo[] {
  const gastos = p.gastos.reduce((s, g) => s + g.base, 0);
  const cg = (p.comercialPct + p.generalesPct) / 100;
  const disponible = ((precio - gastos) * (1 - cg) - (p.margenObjetivoPct / 100) * precio) / (1 + p.contingenciaPct / 100);
  const costeActual = p.equipo.reduce((s, e) => s + e.horas * e.costeHora, 0);
  if (disponible <= 0 || costeActual <= 0) return p.equipo.map((e) => ({ ...e, horas: 0 }));
  const factor = disponible / costeActual;
  return p.equipo.map((e) => ({ ...e, horas: Math.max(0, Math.round(e.horas * factor * 2) / 2) }));
}

/** Estimación persistible en la oferta + texto de desglose para las notas. */
export function construirEstimacion(
  p: ParametrosPresupuesto,
  importeOfertado: number
): { estimacion: EstimacionOferta; resumen: string } {
  const r = calcularPresupuesto(p);
  const ev = evaluarPrecio(p, importeOfertado);
  const estimacion: EstimacionOferta = {
    equipo: p.equipo.filter((e) => e.horas > 0),
    gastos: p.gastos.filter((g) => g.base > 0),
    contingenciaPct: p.contingenciaPct,
    comercialPct: p.comercialPct,
    generalesPct: p.generalesPct,
    margenObjetivoPct: p.margenObjetivoPct,
    totalHoras: r.totalHoras,
    costeEquipo: r.costeEquipo,
    gastosDirectos: r.gastosDirectos,
    precioRecomendado: r.precioRecomendado,
    margenPrevisto: ev.margen,
  };
  const lineas = [
    `— Estimación (${p.linea}) —`,
    ...estimacion.equipo.map((e) => `· ${e.rol}: ${e.horas} h × ${e.costeHora.toFixed(2)} €/h = ${(e.horas * e.costeHora).toFixed(2)} €`),
    ...estimacion.gastos.map((g) => `· ${g.concepto}: ${g.base.toFixed(2)} €`),
    `Coste total: ${r.costeTotal.toFixed(2)} € (incluye ${p.contingenciaPct}% contingencia)`,
    `Comercial ${p.comercialPct}% · Generales ${p.generalesPct}% · Margen previsto: ${(ev.margen * 100).toFixed(1)}%`,
    `Precio recomendado: ${r.precioRecomendado.toFixed(2)} € · mínimo viable: ${r.precioMinimo.toFixed(2)} €`,
  ];
  return { estimacion, resumen: lineas.join('\n') };
}
