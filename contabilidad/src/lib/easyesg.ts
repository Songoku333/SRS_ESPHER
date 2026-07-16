/**
 * Conector con EasyESG.pro: la plataforma de gestión y reporting ESG de la
 * casa. La app consume su API para vincular proyectos con activos y mostrar
 * sus KPIs de sostenibilidad (energía, CO₂, agua, calidad de aire) junto al
 * seguimiento de los trabajos.
 *
 * Contrato de API esperado (a implementar en EasyESG.pro):
 *   GET {base}/api/v1/activos
 *     → { activos: [{ id, nombre, superficieM2?, ubicacion? }] }
 *   GET {base}/api/v1/activos/{id}/kpis
 *     → { periodo, consumoKwh?, co2Kg?, aguaM3?, iaqScore?, renovablePct? }
 *   Autenticación: cabecera "Authorization: Bearer {apiKey}".
 * El detalle completo está en contabilidad/docs/CONECTORES.md.
 */

export interface EasyEsgConfig {
  url: string; // p. ej. https://www.easyesg.pro
  apiKey: string;
}

export interface ActivoESG {
  id: string;
  nombre: string;
  superficieM2?: number;
  ubicacion?: string;
}

export interface KpisActivo {
  periodo?: string; // p. ej. "2026-06" o "últimos 12 meses"
  consumoKwh?: number;
  co2Kg?: number;
  aguaM3?: number;
  iaqScore?: number; // 0-100
  renovablePct?: number; // 0-100
}

const CONFIG_KEY = 'srs-easyesg-config';

export function getEasyEsgConfig(): EasyEsgConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    return cfg?.url && cfg?.apiKey ? cfg : null;
  } catch {
    return null;
  }
}

export function setEasyEsgConfig(cfg: EasyEsgConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CONFIG_KEY);
}

async function llamar<T>(ruta: string): Promise<T> {
  const cfg = getEasyEsgConfig();
  if (!cfg) throw new Error('Conector EasyESG.pro sin configurar (Ajustes → Conectores).');
  const base = cfg.url.replace(/\/+$/, '');
  const res = await fetch(`${base}/api/v1${ruta}`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`EasyESG.pro ${ruta}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function listarActivos(): Promise<ActivoESG[]> {
  const res = await llamar<{ activos?: ActivoESG[] } | ActivoESG[]>('/activos');
  return Array.isArray(res) ? res : res.activos || [];
}

export async function kpisActivo(activoId: string): Promise<KpisActivo> {
  return await llamar<KpisActivo>(`/activos/${encodeURIComponent(activoId)}/kpis`);
}

/** Prueba la conexión: devuelve nº de activos o lanza un error legible. */
export async function probarConexion(): Promise<number> {
  const activos = await listarActivos();
  return activos.length;
}
