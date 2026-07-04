import { AppData } from '../types';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Repara datos importados con el IVA/IRPF guardado como importe en euros en vez
 * de como porcentaje (Excel con columna "IVA" en €). El total es la fuente de
 * verdad: si el % es imposible (>30), se deriva del total y la base.
 */
export function repararDatos(data: AppData): { data: AppData; cambios: number } {
  let cambios = 0;

  const facturas = data.facturas.map((f) => {
    if (!(f.base > 0)) return f;
    let ivaPct = f.ivaPct;
    let irpfPct = f.irpfPct;
    if (irpfPct > 30) irpfPct = 0; // irrecuperable con fiabilidad; el total manda
    if (ivaPct > 30) ivaPct = r2(((f.total - f.base) / f.base) * 100 + irpfPct);
    if (ivaPct < 0 || ivaPct > 30) ivaPct = 21;
    if (ivaPct !== f.ivaPct || irpfPct !== f.irpfPct) {
      cambios++;
      return { ...f, ivaPct, irpfPct };
    }
    return f;
  });

  const gastos = data.gastos.map((g) => {
    if (!(g.base > 0) || g.ivaPct <= 30) return g;
    let ivaPct = r2(((g.total - g.base) / g.base) * 100);
    if (ivaPct < 0 || ivaPct > 30) ivaPct = 21;
    cambios++;
    return { ...g, ivaPct };
  });

  return cambios > 0 ? { data: { ...data, facturas, gastos }, cambios } : { data, cambios: 0 };
}
