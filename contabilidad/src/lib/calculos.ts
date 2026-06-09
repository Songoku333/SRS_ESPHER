import { AppData, Liquidacion, Proyecto } from '../types';

/** Total facturado (base) de un proyecto, excluyendo anuladas. */
export function baseFacturadaProyecto(data: AppData, proyectoId: string): number {
  return data.facturas
    .filter((f) => f.proyectoId === proyectoId && f.estado !== 'anulada')
    .reduce((s, f) => s + f.base, 0);
}

/** Base cobrada de un proyecto (facturas en estado cobrada). */
export function baseCobradaProyecto(data: AppData, proyectoId: string): number {
  return data.facturas
    .filter((f) => f.proyectoId === proyectoId && f.estado === 'cobrada')
    .reduce((s, f) => s + f.base, 0);
}

export interface ResumenReparto {
  proyecto: Proyecto;
  contactoId: string;
  porcentaje: number;
  devengado: number; // % sobre base cobrada
  liquidado: number; // liquidaciones pagadas
  comprometido: number; // liquidaciones pendientes
  pendiente: number; // devengado - liquidado - comprometido
}

/** Calcula, para cada reparto de cada proyecto, lo devengado, liquidado y pendiente. */
export function resumenRepartos(data: AppData): ResumenReparto[] {
  const out: ResumenReparto[] = [];
  for (const p of data.proyectos) {
    const cobrado = baseCobradaProyecto(data, p.id);
    for (const r of p.repartos) {
      const devengado = (cobrado * r.porcentaje) / 100;
      const liqs = data.liquidaciones.filter(
        (l) => l.proyectoId === p.id && l.contactoId === r.contactoId
      );
      const liquidado = liqs.filter((l) => l.estado === 'pagada').reduce((s, l) => s + l.importe, 0);
      const comprometido = liqs
        .filter((l) => l.estado === 'pendiente')
        .reduce((s, l) => s + l.importe, 0);
      out.push({
        proyecto: p,
        contactoId: r.contactoId,
        porcentaje: r.porcentaje,
        devengado,
        liquidado,
        comprometido,
        pendiente: devengado - liquidado - comprometido,
      });
    }
  }
  return out;
}

export interface KPIs {
  facturadoAnyo: number;
  cobradoAnyo: number;
  pendienteCobro: number;
  gastosAnyo: number;
  gastosPendientes: number;
  liquidacionesPendientes: number;
  resultadoAnyo: number;
  ofertasVivas: number;
  importeOfertasVivas: number;
  ivaRepercutido: number;
  ivaSoportado: number;
}

export function calcularKPIs(data: AppData, anyo: number): KPIs {
  const enAnyo = (fecha: string) => fecha.startsWith(String(anyo));
  const facturas = data.facturas.filter((f) => f.estado !== 'anulada');
  const facturadoAnyo = facturas.filter((f) => enAnyo(f.fecha)).reduce((s, f) => s + f.base, 0);
  const cobradoAnyo = facturas
    .filter((f) => f.estado === 'cobrada' && enAnyo(f.fechaCobro || f.fecha))
    .reduce((s, f) => s + f.total, 0);
  const pendienteCobro = facturas
    .filter((f) => f.estado === 'emitida')
    .reduce((s, f) => s + f.total, 0);
  const gastosAnyo = data.gastos.filter((g) => enAnyo(g.fecha)).reduce((s, g) => s + g.base, 0);
  const gastosPendientes = data.gastos
    .filter((g) => g.estado === 'pendiente')
    .reduce((s, g) => s + g.total, 0);
  const liquidacionesPendientes = resumenRepartos(data).reduce(
    (s, r) => s + Math.max(0, r.pendiente) + r.comprometido,
    0
  );
  const ofertasAbiertas = data.ofertas.filter(
    (o) => o.estado === 'borrador' || o.estado === 'enviada'
  );
  const ivaRepercutido = facturas
    .filter((f) => enAnyo(f.fecha))
    .reduce((s, f) => s + (f.base * f.ivaPct) / 100, 0);
  const ivaSoportado = data.gastos
    .filter((g) => enAnyo(g.fecha))
    .reduce((s, g) => s + (g.base * g.ivaPct) / 100, 0);
  return {
    facturadoAnyo,
    cobradoAnyo,
    pendienteCobro,
    gastosAnyo,
    gastosPendientes,
    liquidacionesPendientes,
    resultadoAnyo: facturadoAnyo - gastosAnyo,
    ofertasVivas: ofertasAbiertas.length,
    importeOfertasVivas: ofertasAbiertas.reduce((s, o) => s + o.importe, 0),
    ivaRepercutido,
    ivaSoportado,
  };
}
