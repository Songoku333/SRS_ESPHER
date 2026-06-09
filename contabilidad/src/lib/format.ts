export const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export function fmtEur(n: number): string {
  return eur.format(n || 0);
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function fmtMes(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[parseInt(m, 10) - 1]} ${y}`;
}

/** Convierte texto con formato español ("1.234,56") o número a number. */
export function parseImporte(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  let s = String(v).trim().replace(/[€\s]/g, '');
  if (!s) return 0;
  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');
  if (tieneComa && tienePunto) {
    // El último separador es el decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Convierte fechas de Excel (número de serie), Date o texto dd/mm/yyyy a ISO yyyy-mm-dd. */
export function parseFecha(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Número de serie de Excel (días desde 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}
