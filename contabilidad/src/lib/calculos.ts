import { AppData, Proyecto } from '../types';

export interface Rango {
  desde: string; // ISO yyyy-mm-dd (vacío = sin límite)
  hasta: string;
}

export function enRango(fecha: string | undefined, r?: Rango): boolean {
  if (!r) return true;
  if (!fecha) return false;
  if (r.desde && fecha < r.desde) return false;
  if (r.hasta && fecha > r.hasta) return false;
  return true;
}

/** Total facturado (base) de un proyecto, excluyendo anuladas. */
export function baseFacturadaProyecto(data: AppData, proyectoId: string): number {
  return data.facturas
    .filter((f) => f.proyectoId === proyectoId && f.estado !== 'anulada')
    .reduce((s, f) => s + f.base, 0);
}

/** Base cobrada de un proyecto (facturas en estado cobrada), opcionalmente dentro de un rango. */
export function baseCobradaProyecto(data: AppData, proyectoId: string, rango?: Rango): number {
  return data.facturas
    .filter(
      (f) =>
        f.proyectoId === proyectoId &&
        f.estado === 'cobrada' &&
        enRango(f.fechaCobro || f.fecha, rango)
    )
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

/**
 * Calcula, para cada reparto de cada proyecto, lo devengado, liquidado y pendiente.
 * Con `rango`, devenga solo sobre lo cobrado en ese periodo y cuenta solo las
 * liquidaciones con fecha dentro del periodo (para proponer liquidaciones por tramos).
 */
export function resumenRepartos(data: AppData, rango?: Rango): ResumenReparto[] {
  const out: ResumenReparto[] = [];
  for (const p of data.proyectos) {
    const cobrado = baseCobradaProyecto(data, p.id, rango);
    for (const r of p.repartos) {
      const devengado = (cobrado * r.porcentaje) / 100;
      const liqs = data.liquidaciones.filter(
        (l) => l.proyectoId === p.id && l.contactoId === r.contactoId && enRango(l.fecha, rango)
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
