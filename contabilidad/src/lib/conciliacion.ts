import { AppData } from '../types';

export interface Propuesta {
  movimientoId: string;
  movFecha: string;
  movConcepto: string;
  movImporte: number;
  tipo: 'factura' | 'gasto' | 'liquidacion';
  destinoId: string;
  etiqueta: string; // texto descriptivo del destino
  importeDestino: number;
  difDias: number;
  exacta: boolean; // importe coincide dentro de la tolerancia
}

function diasEntre(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (isNaN(da) || isNaN(db)) return 9999;
  return Math.abs(Math.round((da - db) / 86400000));
}

/**
 * Propone conciliaciones automáticas cruzando los movimientos sin conciliar con
 * facturas emitidas (entradas), y gastos / liquidaciones pendientes (salidas).
 * Empareja por importe (dentro de la tolerancia) y cercanía de fecha, sin asignar
 * el mismo destino a dos movimientos.
 */
export function proponerConciliaciones(
  data: AppData,
  ventanaDias = 45,
  tolerancia = 0.5
): Propuesta[] {
  const nombre = (id?: string) => (id ? data.contactos.find((c) => c.id === id)?.nombre || '' : '');
  const propuestas: Propuesta[] = [];
  const destinosUsados = new Set<string>(); // `${tipo}:${id}` ya propuestos

  // Movimientos sin conciliar, los más recientes primero
  const movimientos = data.movimientos
    .filter((m) => !m.conciliacion)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Destinos ya conciliados con algún movimiento (para no duplicar)
  for (const m of data.movimientos) {
    if (m.conciliacion) destinosUsados.add(`${m.conciliacion.tipo}:${m.conciliacion.id}`);
  }

  for (const m of movimientos) {
    let mejor: Propuesta | null = null;

    const considerar = (
      tipo: Propuesta['tipo'],
      destinoId: string,
      etiqueta: string,
      importeDestino: number,
      fechaDestino: string
    ) => {
      const clave = `${tipo}:${destinoId}`;
      if (destinosUsados.has(clave)) return;
      const dif = Math.abs(importeDestino - Math.abs(m.importe));
      if (dif > tolerancia) return;
      const difDias = diasEntre(m.fecha, fechaDestino);
      if (difDias > ventanaDias) return;
      const cand: Propuesta = {
        movimientoId: m.id,
        movFecha: m.fecha,
        movConcepto: m.concepto,
        movImporte: m.importe,
        tipo,
        destinoId,
        etiqueta,
        importeDestino,
        difDias,
        exacta: dif < 0.005,
      };
      if (!mejor || cand.difDias < mejor.difDias) mejor = cand;
    };

    if (m.importe >= 0) {
      // Entrada → factura emitida (cobro)
      for (const f of data.facturas) {
        if (f.estado !== 'emitida') continue;
        const etiqueta = `Factura ${f.numero} · ${nombre(f.clienteId)}`;
        considerar('factura', f.id, etiqueta, f.total, f.fecha);
      }
    } else {
      // Salida → gasto o liquidación pendiente (pago)
      for (const g of data.gastos) {
        if (g.estado !== 'pendiente') continue;
        const etiqueta = `Gasto: ${g.concepto.slice(0, 40)}${nombre(g.contactoId) ? ' · ' + nombre(g.contactoId) : ''}`;
        considerar('gasto', g.id, etiqueta, g.total, g.fecha);
      }
      for (const l of data.liquidaciones) {
        if (l.estado !== 'pendiente') continue;
        const etiqueta = `Liquidación: ${nombre(l.contactoId)} · ${l.concepto.slice(0, 30)}`;
        considerar('liquidacion', l.id, etiqueta, l.importe, l.fecha);
      }
    }

    if (mejor) {
      const elegido = mejor as Propuesta;
      propuestas.push(elegido);
      destinosUsados.add(`${elegido.tipo}:${elegido.destinoId}`);
    }
  }

  // Primero las coincidencias exactas y de fecha más próxima
  return propuestas.sort(
    (a, b) => Number(b.exacta) - Number(a.exacta) || a.difDias - b.difDias
  );
}
