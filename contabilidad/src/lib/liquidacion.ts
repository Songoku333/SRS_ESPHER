import { AppData, Factura, Gasto, Proyecto, Reparto } from '../types';

export const COMERCIAL_PCT_DEFAULT = 10;
export const GENERALES_PCT_DEFAULT = 20;

/** Valor de un reparto (% u horas), con compatibilidad con el campo antiguo `porcentaje`. */
export function repartoValor(r: Reparto): number {
  return r.valor ?? r.porcentaje ?? 0;
}

export function comercialPct(p?: Proyecto): number {
  return p?.comercialPct ?? COMERCIAL_PCT_DEFAULT;
}
export function generalesPct(p?: Proyecto): number {
  return p?.gastosGeneralesPct ?? GENERALES_PCT_DEFAULT;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface LineaLiquidacion {
  contactoId: string;
  nombre: string;
  rol: 'comercial' | 'colaborador';
  modo: 'comision' | 'porcentaje' | 'horas';
  valor: number; // % u horas
  importe: number; // base imponible a percibir
  pagada: boolean;
  liquidacionId?: string;
}

export interface DesgloseFactura {
  factura: Factura;
  proyecto?: Proyecto;
  baseImponible: number;
  gastos: Gasto[];
  totalGastos: number; // base imponible de los gastos imputados a la factura
  netoTrasGastos: number;
  comercialPct: number;
  importeComercial: number;
  generalesPct: number;
  importeGenerales: number; // se queda en la empresa (no se paga fuera)
  baseReparto: number;
  modoReparto: 'porcentaje' | 'horas';
  lineas: LineaLiquidacion[]; // comercial (si lo hay) + colaboradores
  totalAPagar: number; // suma de líneas (comercial + colaboradores)
  totalPagado: number;
  pendiente: number;
  todoPagado: boolean;
  liquidada: boolean;
}

/** Calcula la cascada de liquidación de una factura:
 *  base − gastos propios → − % comercial − % gastos generales → base de reparto. */
export function desgloseFactura(data: AppData, factura: Factura): DesgloseFactura {
  const proyecto = data.proyectos.find((p) => p.id === factura.proyectoId);
  const nombre = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';

  const baseImponible = factura.base;
  const gastos = data.gastos.filter((g) => g.facturaId === factura.id);
  const totalGastos = r2(gastos.reduce((s, g) => s + g.base, 0));
  const netoTrasGastos = r2(baseImponible - totalGastos);

  const cPct = comercialPct(proyecto);
  const gPct = generalesPct(proyecto);
  const importeComercial = r2((netoTrasGastos * cPct) / 100);
  const importeGenerales = r2((netoTrasGastos * gPct) / 100);
  const baseReparto = r2(netoTrasGastos - importeComercial - importeGenerales);

  const modoReparto = proyecto?.modoReparto ?? 'porcentaje';
  const repartos = (proyecto?.repartos ?? []).slice(0, 6);
  const totalHoras = repartos.reduce((s, r) => s + repartoValor(r), 0);

  const liqDe = (contactoId: string, rol: 'comercial' | 'colaborador') =>
    data.liquidaciones.find(
      (l) => l.facturaId === factura.id && l.contactoId === contactoId && (l.rol ?? 'colaborador') === rol
    );

  const lineas: LineaLiquidacion[] = [];

  if (proyecto?.comercialId && importeComercial > 0) {
    const l = liqDe(proyecto.comercialId, 'comercial');
    lineas.push({
      contactoId: proyecto.comercialId,
      nombre: nombre(proyecto.comercialId),
      rol: 'comercial',
      modo: 'comision',
      valor: cPct,
      importe: importeComercial,
      pagada: l?.estado === 'pagada',
      liquidacionId: l?.id,
    });
  }

  for (const r of repartos) {
    const valor = repartoValor(r);
    let importe = 0;
    if (modoReparto === 'porcentaje') importe = r2((baseReparto * valor) / 100);
    else importe = totalHoras > 0 ? r2((baseReparto * valor) / totalHoras) : 0;
    const l = liqDe(r.contactoId, 'colaborador');
    lineas.push({
      contactoId: r.contactoId,
      nombre: nombre(r.contactoId),
      rol: 'colaborador',
      modo: modoReparto,
      valor,
      importe,
      pagada: l?.estado === 'pagada',
      liquidacionId: l?.id,
    });
  }

  const totalAPagar = r2(lineas.reduce((s, l) => s + l.importe, 0));
  const totalPagado = r2(lineas.filter((l) => l.pagada).reduce((s, l) => s + l.importe, 0));
  const pendiente = r2(totalAPagar - totalPagado);
  const todoPagado = lineas.length > 0 && lineas.every((l) => l.pagada);

  return {
    factura,
    proyecto,
    baseImponible,
    gastos,
    totalGastos,
    netoTrasGastos,
    comercialPct: cPct,
    importeComercial,
    generalesPct: gPct,
    importeGenerales,
    baseReparto,
    modoReparto,
    lineas,
    totalAPagar,
    totalPagado,
    pendiente,
    todoPagado,
    liquidada: !!factura.liquidada,
  };
}

/** Facturas cobradas aún no marcadas como liquidadas (las que hay que liquidar). */
export function facturasPorLiquidar(data: AppData): DesgloseFactura[] {
  return data.facturas
    .filter((f) => f.estado === 'cobrada' && !f.liquidada)
    .map((f) => desgloseFactura(data, f))
    .sort((a, b) => b.factura.fecha.localeCompare(a.factura.fecha));
}

export interface FacturaCerrada {
  d: DesgloseFactura;
  clienteNombre: string;
  /** base − gastos imputados − comercial − reparto: lo que queda en la empresa */
  beneficio: number;
  margen: number; // sobre la base imponible (0-1)
  motivo: 'liquidada' | 'pagos'; // marcada liquidada vs. todo pagado sin marcar
}

/** Facturas completamente cerradas en el rango: cobradas y con todos los pagos
 *  hechos (marcadas liquidadas, o con reparto y gastos íntegramente pagados),
 *  con su beneficio neto real para la empresa. */
export function facturasCerradas(
  data: AppData,
  rango?: { desde?: string; hasta?: string }
): FacturaCerrada[] {
  const nombre = (id?: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';
  return data.facturas
    .filter((f) => f.estado === 'cobrada')
    .filter((f) => (!rango?.desde || f.fecha >= rango.desde) && (!rango?.hasta || f.fecha <= rango.hasta))
    .map((f) => desgloseFactura(data, f))
    .filter((d) => d.liquidada || (d.todoPagado && d.gastos.every((g) => g.estado === 'pagado')))
    .map((d) => {
      const beneficio = r2(d.baseImponible - d.totalGastos - d.totalAPagar);
      return {
        d,
        clienteNombre: nombre(d.factura.clienteId),
        beneficio,
        margen: d.baseImponible > 0 ? beneficio / d.baseImponible : 0,
        motivo: d.liquidada ? ('liquidada' as const) : ('pagos' as const),
      };
    })
    .sort((a, b) => b.d.factura.fecha.localeCompare(a.d.factura.fecha));
}

/** Coste de reparto (comercial + colaboradores) atribuible a una factura, para la rentabilidad. */
export function repartoPagableFactura(data: AppData, factura: Factura): number {
  return desgloseFactura(data, factura).totalAPagar;
}

/** Total pendiente de liquidar (líneas no pagadas) de todas las facturas cobradas. */
export function totalPendienteLiquidar(data: AppData): number {
  return facturasPorLiquidar(data).reduce((s, d) => s + d.pendiente, 0);
}
