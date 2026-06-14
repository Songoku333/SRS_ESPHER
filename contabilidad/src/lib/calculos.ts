import { AppData } from '../types';
import { totalPendienteLiquidar } from './liquidacion';

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
  const liquidacionesPendientes = totalPendienteLiquidar(data);
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
