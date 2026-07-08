import { AppData, Factura, Gasto, MovimientoBancario, Proyecto } from '../types';

/** Sugerencia de imputación de un gasto a su factura/proyecto, deducida del
 *  apunte bancario de su pago (el concepto de la transferencia lleva la
 *  referencia del proyecto o de la factura). */
export interface SugerenciaImputacion {
  gasto: Gasto;
  movimiento: MovimientoBancario;
  factura?: Factura;
  proyecto?: Proyecto;
  motivo: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Clave normalizada de un nº de factura: "2026/00011", "2026-00011" y
 *  "2026000011" deben casar entre sí → "2026:11". */
export function claveFactura(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 6) return null;
  if (/^(19|20)\d{2}/.test(digitos)) {
    const seq = parseInt(digitos.slice(4), 10);
    if (!isNaN(seq)) return `${digitos.slice(0, 4)}:${seq}`;
  }
  return digitos;
}

/** Claves de factura presentes en un texto libre (concepto bancario). */
function clavesEnTexto(texto: string): Set<string> {
  const claves = new Set<string>();
  for (const m of texto.matchAll(/\d[\d/\-. ]{4,}\d/g)) {
    const clave = claveFactura(m[0]);
    if (clave) claves.add(clave);
  }
  return claves;
}

/** Primer apellido/palabra significativa del nombre de un contacto, para
 *  reforzar la confianza si aparece en el concepto del pago. */
function tokenNombre(nombre: string): string | null {
  const tokens = norm(nombre)
    .split(/[^a-zñ]+/)
    .filter((t) => t.length >= 4 && !['sociedad', 'limitada'].includes(t));
  return tokens[0] || null;
}

/** Propone imputaciones para los gastos sin factura: busca el movimiento
 *  bancario de salida con el mismo importe (total o base) cuyo concepto
 *  contenga una referencia a una factura SRS o al código de un proyecto. */
export function sugerirImputaciones(data: AppData): SugerenciaImputacion[] {
  const facturasPorClave = new Map<string, Factura>();
  for (const f of data.facturas) {
    const clave = claveFactura(f.numero);
    if (clave) facturasPorClave.set(clave, f);
  }
  const proyectos = data.proyectos.filter((p) => (p.codigo || '').trim().length >= 3);

  const salidas = data.movimientos.filter((m) => m.importe < 0);
  const sugerencias: SugerenciaImputacion[] = [];

  for (const gasto of data.gastos) {
    if (gasto.facturaId) continue;
    const candidatos = salidas.filter(
      (m) =>
        Math.abs(Math.abs(m.importe) - gasto.total) < 0.01 ||
        Math.abs(Math.abs(m.importe) - gasto.base) < 0.01
    );
    if (!candidatos.length) continue;

    const token = gasto.contactoId
      ? tokenNombre(data.contactos.find((c) => c.id === gasto.contactoId)?.nombre || '')
      : null;

    let mejor: SugerenciaImputacion | null = null;
    for (const mov of candidatos) {
      const conceptoNorm = norm(mov.concepto);
      const proveedorCita = !!token && conceptoNorm.includes(token);

      // 1º: referencia directa a una factura SRS en el concepto del pago
      let factura: Factura | undefined;
      for (const clave of clavesEnTexto(mov.concepto)) {
        factura = facturasPorClave.get(clave);
        if (factura) break;
      }
      // 2º: código de proyecto en el concepto
      const proyecto = factura
        ? data.proyectos.find((p) => p.id === factura!.proyectoId)
        : proyectos.find((p) => conceptoNorm.includes(norm(p.codigo)));

      if (!factura && !proyecto) continue;
      const sugerencia: SugerenciaImputacion = {
        gasto,
        movimiento: mov,
        factura,
        proyecto,
        motivo: [
          `pago de ${Math.abs(mov.importe).toFixed(2)} € el ${mov.fecha}`,
          factura ? `referencia a la factura ${factura.numero}` : `código de proyecto en el concepto`,
          proveedorCita ? 'menciona al proveedor' : '',
        ]
          .filter(Boolean)
          .join(' · '),
      };
      // Preferimos el candidato que además menciona al proveedor o trae factura
      if (!mejor || (proveedorCita && !mejor.motivo.includes('proveedor')) || (factura && !mejor.factura)) {
        mejor = sugerencia;
      }
    }
    if (mejor) sugerencias.push(mejor);
  }
  return sugerencias.sort((a, b) => b.gasto.fecha.localeCompare(a.gasto.fecha));
}
