import { AppData, Factura, Gasto, Liquidacion } from '../types';
import { baseFacturadaProyecto, Rango, enRango } from './calculos';
import { repartoPagableFactura } from './liquidacion';

export type { Rango };
export { enRango };

/**
 * Rentabilidad de un proyecto (o del grupo "sin proyecto"): cruza ingresos
 * (facturas), costes directos (gastos imputados) y reparto con colaboradores
 * (liquidaciones) para obtener el beneficio neto y lo que queda pendiente.
 */
export interface RentabilidadProyecto {
  proyectoId: string | null; // null = facturas/gastos sin proyecto asignado
  codigo: string;
  nombre: string;
  clienteNombre: string;
  facturas: Factura[];
  gastos: Gasto[];
  liquidaciones: Liquidacion[];

  facturado: number; // base imponible facturada (no anuladas)
  cobrado: number; // base imponible cobrada
  pendienteCobro: number; // total (con IVA) de facturas emitidas sin cobrar

  gastosBase: number; // base de gastos imputados
  gastosPagados: number; // total de gastos ya pagados
  gastosPendientes: number; // total de gastos pendientes de pago

  liqEstimada: number; // reparto % sobre lo facturado (coste final esperado)
  liqDevengada: number; // reparto % sobre lo cobrado (lo que ya toca pagar)
  liqPagada: number; // liquidaciones pagadas
  liqPendiente: number; // devengado - pagado (lo que falta liquidar ya)

  costeTotal: number; // gastosBase + liqEstimada
  beneficio: number; // facturado - costeTotal (beneficio neto estimado final)
  margen: number; // beneficio / facturado (0-1)
  beneficioCaja: number; // cobrado - gastosPagados - liqPagada (caja real)
}

export function rentabilidadProyectos(data: AppData, rango?: Rango): RentabilidadProyecto[] {
  const out: RentabilidadProyecto[] = [];
  const cliente = (id: string) => data.contactos.find((c) => c.id === id)?.nombre || '—';

  const construir = (
    proyectoId: string | null,
    codigo: string,
    nombre: string,
    clienteNombre: string
  ): RentabilidadProyecto => {
    const facturas = data.facturas.filter(
      (f) => (f.proyectoId || null) === proyectoId && f.estado !== 'anulada' && enRango(f.fecha, rango)
    );
    const gastos = data.gastos.filter(
      (g) => (g.proyectoId || null) === proyectoId && enRango(g.fecha, rango)
    );
    const liquidaciones = proyectoId
      ? data.liquidaciones.filter((l) => l.proyectoId === proyectoId && enRango(l.fecha, rango))
      : [];

    const facturado = facturas.reduce((s, f) => s + f.base, 0);
    const cobrado = facturas.filter((f) => f.estado === 'cobrada').reduce((s, f) => s + f.base, 0);
    const pendienteCobro = facturas
      .filter((f) => f.estado === 'emitida')
      .reduce((s, f) => s + f.total, 0);

    const gastosBase = gastos.reduce((s, g) => s + g.base, 0);
    const gastosPagados = gastos.filter((g) => g.estado === 'pagado').reduce((s, g) => s + g.total, 0);
    const gastosPendientes = gastos
      .filter((g) => g.estado === 'pendiente')
      .reduce((s, g) => s + g.total, 0);

    // Coste de reparto = comisión comercial + colaboradores, según la cascada de cada factura
    const liqEstimada = facturas.reduce((s, f) => s + repartoPagableFactura(data, f), 0);
    const liqDevengada = facturas
      .filter((f) => f.estado === 'cobrada')
      .reduce((s, f) => s + repartoPagableFactura(data, f), 0);
    const liqPagada = liquidaciones
      .filter((l) => l.estado === 'pagada')
      .reduce((s, l) => s + l.importe, 0);
    const liqPendiente = Math.max(0, liqDevengada - liqPagada);

    const costeTotal = gastosBase + liqEstimada;
    const beneficio = facturado - costeTotal;
    const beneficioCaja = cobrado - gastosPagados - liqPagada;

    return {
      proyectoId,
      codigo,
      nombre,
      clienteNombre,
      facturas,
      gastos,
      liquidaciones,
      facturado,
      cobrado,
      pendienteCobro,
      gastosBase,
      gastosPagados,
      gastosPendientes,
      liqEstimada,
      liqDevengada,
      liqPagada,
      liqPendiente,
      costeTotal,
      beneficio,
      margen: facturado > 0 ? beneficio / facturado : 0,
      beneficioCaja,
    };
  };

  for (const p of data.proyectos) {
    const r = construir(p.id, p.codigo, p.nombre, cliente(p.clienteId));
    // Incluir solo proyectos con algún dato en el rango
    if (r.facturas.length > 0 || r.gastos.length > 0 || r.liquidaciones.length > 0) {
      out.push(r);
    }
  }

  // Grupo "sin proyecto"
  const sin = construir(null, '—', 'Sin proyecto asignado', '—');
  if (sin.facturas.length > 0 || sin.gastos.length > 0) out.push(sin);

  return out.sort((a, b) => b.facturado - a.facturado);
}

export interface TotalesRentabilidad {
  facturado: number;
  cobrado: number;
  pendienteCobro: number;
  gastosBase: number;
  gastosPendientes: number;
  liqEstimada: number;
  liqPendiente: number;
  beneficio: number;
  beneficioCaja: number;
  margen: number;
}

export function totalesRentabilidad(filas: RentabilidadProyecto[]): TotalesRentabilidad {
  const t = filas.reduce(
    (acc, r) => {
      acc.facturado += r.facturado;
      acc.cobrado += r.cobrado;
      acc.pendienteCobro += r.pendienteCobro;
      acc.gastosBase += r.gastosBase;
      acc.gastosPendientes += r.gastosPendientes;
      acc.liqEstimada += r.liqEstimada;
      acc.liqPendiente += r.liqPendiente;
      acc.beneficio += r.beneficio;
      acc.beneficioCaja += r.beneficioCaja;
      return acc;
    },
    {
      facturado: 0,
      cobrado: 0,
      pendienteCobro: 0,
      gastosBase: 0,
      gastosPendientes: 0,
      liqEstimada: 0,
      liqPendiente: 0,
      beneficio: 0,
      beneficioCaja: 0,
      margen: 0,
    }
  );
  t.margen = t.facturado > 0 ? t.beneficio / t.facturado : 0;
  return t;
}

/** Margen estimado pendiente de cerrar: avisa de proyectos que pierden dinero. */
export function proyectosEnPerdida(data: AppData): number {
  return rentabilidadProyectos(data).filter((r) => r.proyectoId && r.beneficio < -0.005).length;
}

export { baseFacturadaProyecto };
