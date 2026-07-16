import { LineaServicio } from '../types';
import { adivinarLinea } from './plantillas';

/**
 * Importador de ofertas en PDF: extrae el texto (pdfjs) y reconoce los campos
 * de las ofertas de la casa — título ("Propuesta para…"), cliente, fecha,
 * superficie, partidas del presupuesto (Ref./Ítem/Honorarios) y base
 * imponible. Todo lo detectado es editable antes de crear nada.
 */

export interface PartidaPdf {
  concepto: string;
  importe: number;
}

export interface OfertaDetectada {
  titulo: string;
  cliente: string;
  fecha: string; // ISO yyyy-mm-dd (o '' si no se detecta)
  importe: number; // base imponible
  superficieM2?: number;
  linea: LineaServicio;
  partidas: PartidaPdf[];
  texto: string; // texto completo por si hace falta revisar
}

/** Extrae el texto de un PDF reconstruyendo líneas por posición vertical. */
export async function extraerTextoPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const contenido = await page.getTextContent();
    // Agrupar por coordenada Y (línea) y ordenar por X dentro de cada línea
    const lineas = new Map<number, { x: number; s: string }[]>();
    for (const item of contenido.items as any[]) {
      if (!item.str || !item.transform) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      // Tolerancia de 2px para juntar items de la misma línea
      let clave = y;
      for (const k of lineas.keys()) {
        if (Math.abs(k - y) <= 2) {
          clave = k;
          break;
        }
      }
      if (!lineas.has(clave)) lineas.set(clave, []);
      lineas.get(clave)!.push({ x, s: item.str });
    }
    const ordenadas = [...lineas.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    paginas.push(ordenadas.join('\n'));
  }
  await (doc as { destroy?: () => Promise<void> }).destroy?.();
  return paginas.join('\n');
}

const parseImporteEs = (s: string): number => {
  const limpio = s.replace(/[€\s ]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
};

/** Reconoce los campos de la oferta en el texto extraído. */
export function parsearOferta(texto: string): OfertaDetectada {
  const lineas = texto.split('\n');

  // Título: "Propuesta para ..." (puede partirse en varias líneas hasta "Empresa/cliente")
  let titulo = '';
  const iProp = lineas.findIndex((l) => /propuesta para/i.test(l));
  if (iProp >= 0) {
    titulo = lineas[iProp].replace(/.*propuesta para/i, '').trim();
    for (let j = iProp + 1; j < Math.min(iProp + 3, lineas.length); j++) {
      if (/empresa\s*\/?\s*cliente|att\.:|índice|indice/i.test(lineas[j])) break;
      if (/^[A-ZÁÉÍÓÚa-z]/.test(lineas[j]) && lineas[j].length < 90) titulo += ' ' + lineas[j].trim();
      else break;
    }
    titulo = titulo.replace(/\s+/g, ' ').trim();
  }

  // Cliente
  const mCliente = texto.match(/Empresa\s*\/?\s*cliente\s*:\s*([^\n]+)/i);
  const cliente = (mCliente?.[1] || '').replace(/NIF.*$/i, '').trim();

  // Fecha (d-m-aaaa o "12 de julio de 2026")
  let fecha = '';
  const mFecha = texto.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (mFecha) {
    const y = mFecha[3].length === 2 ? `20${mFecha[3]}` : mFecha[3];
    fecha = `${y}-${mFecha[2].padStart(2, '0')}-${mFecha[1].padStart(2, '0')}`;
  } else {
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mLarga = texto.match(/(\d{1,2})\s+de\s+([a-zñ]+)\s+de\s+(\d{4})/i);
    if (mLarga) {
      const mes = MESES.indexOf(mLarga[2].toLowerCase()) + 1;
      if (mes > 0) fecha = `${mLarga[3]}-${String(mes).padStart(2, '0')}-${mLarga[1].padStart(2, '0')}`;
    }
  }

  // Superficie
  const mSup = texto.match(/([\d.]{1,9})\s*m²/);
  const superficieM2 = mSup ? Math.round(parseImporteEs(mSup[1] + ',0')) : undefined;

  // Partidas del presupuesto: filas "N  concepto [importe]" en la tabla de
  // honorarios. Las tablas reales agrupan varias filas en una celda combinada
  // de importe que aparece en su propia línea: se acumulan los conceptos
  // pendientes hasta que llega su importe.
  const iRef = lineas.findIndex((l) => /REF\.?\s+ITEM/i.test(l));
  const iPres =
    iRef >= 0
      ? iRef
      : lineas.reduce((acc, l, i) => (/presupuesto y condiciones/i.test(l) ? i : acc), -1);
  const iFin = lineas.findIndex((l, i) => i > iPres && /exclusiones|entregables/i.test(l));
  const zona = iPres >= 0 ? lineas.slice(iPres, iFin > iPres ? iFin : undefined) : lineas;
  const partidas: PartidaPdf[] = [];
  let pendientes: string[] = [];
  for (const l of zona) {
    if (/base imponible|^total|iva|honorarios/i.test(l)) continue;
    // Fila con importe al final
    let m = l.match(/^(\d{1,2})\s+(.{4,}?)\s+([\d.]{1,3}(?:\.\d{3})*,\d{2})\s*€?$/);
    if (m) {
      const importe = parseImporteEs(m[3]);
      const concepto = [...pendientes, m[2].replace(/\d+[\d.,]*\s*h\b.*$/i, '').trim()];
      if (importe > 0) {
        partidas.push({
          concepto: concepto.slice(0, 2).join(' + ') + (concepto.length > 2 ? ` (+${concepto.length - 2} más)` : ''),
          importe,
        });
      }
      pendientes = [];
      continue;
    }
    // Fila de concepto sin importe (celda combinada): queda pendiente
    m = l.match(/^(\d{1,2})\s+(.{4,})$/);
    if (m && !/^\d+\.-/.test(l)) {
      pendientes.push(m[2].trim());
      continue;
    }
    // Importe solo en su línea: cierra el grupo pendiente
    m = l.match(/^([\d.]{1,3}(?:\.\d{3})*,\d{2})\s*€?$/);
    if (m) {
      const importe = parseImporteEs(m[1]);
      if (importe > 0) {
        partidas.push({
          concepto: pendientes.length
            ? pendientes.slice(0, 2).join(' + ') + (pendientes.length > 2 ? ` (+${pendientes.length - 2} más)` : '')
            : `Partida ${partidas.length + 1}`,
          importe,
        });
      }
      pendientes = [];
    }
  }

  // Base imponible: línea explícita o suma de partidas o mayor importe del documento
  let importe = 0;
  const mBase = texto.match(/base imponible\s*([\d.]{1,3}(?:\.\d{3})*,\d{2})/i);
  if (mBase) importe = parseImporteEs(mBase[1]);
  if (!importe && partidas.length) importe = Math.round(partidas.reduce((s, p) => s + p.importe, 0) * 100) / 100;
  if (!importe) {
    const todos = [...texto.matchAll(/([\d.]{1,3}(?:\.\d{3})+,\d{2}|\d{3,6},\d{2})\s*€/g)].map((m) => parseImporteEs(m[1]));
    if (todos.length) importe = Math.max(...todos);
  }

  const linea = adivinarLinea(`${titulo} ${partidas.map((p) => p.concepto).join(' ')}`);
  return { titulo, cliente, fecha, importe, superficieM2, linea, partidas, texto };
}
