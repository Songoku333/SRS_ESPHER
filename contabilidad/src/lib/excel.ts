import * as XLSX from 'xlsx';

export interface HojaExcel {
  nombre: string;
  cabeceras: string[];
  filas: unknown[][];
}

/** Lee un fichero Excel o CSV y devuelve todas sus hojas con cabeceras y filas. */
export async function leerExcel(file: File): Promise<HojaExcel[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  return wb.SheetNames.map((nombre) => {
    const ws = wb.Sheets[nombre];
    const matriz: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    // Busca la fila de cabecera: la primera con al menos 2 celdas de texto no vacías
    let idxCabecera = 0;
    for (let i = 0; i < Math.min(matriz.length, 15); i++) {
      const textos = matriz[i].filter((c) => typeof c === 'string' && c.trim() !== '');
      if (textos.length >= 2) {
        idxCabecera = i;
        break;
      }
    }
    const cabeceras = (matriz[idxCabecera] || []).map((c) => String(c ?? '').trim());
    const filas = matriz
      .slice(idxCabecera + 1)
      .filter((f) => f.some((c) => c !== '' && c != null));
    return { nombre, cabeceras, filas };
  });
}

/** Devuelve el índice de la primera cabecera que contenga alguna de las palabras clave. */
export function detectarColumna(cabeceras: string[], claves: string[]): number {
  const normalizadas = cabeceras.map((c) =>
    c
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );
  for (const clave of claves) {
    const idx = normalizadas.findIndex((c) => c.includes(clave));
    if (idx !== -1) return idx;
  }
  return -1;
}
