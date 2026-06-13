import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const CONFIG_KEY = 'srs-supabase-config';

/** Configuración de la nube: primero la guardada por el usuario, después variables de entorno del build. */
export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg?.url && cfg?.anonKey) return cfg;
    }
  } catch {
    // ignorar configuración corrupta
  }
  const env = (import.meta as any).env || {};
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    // Las variables del build pueden traer espacios, salto de línea o barra final
    // al copiarlas; se limpian igual que la URL escrita a mano.
    const url = normalizarUrlProyecto(String(env.VITE_SUPABASE_URL));
    if (url) return { url, anonKey: String(env.VITE_SUPABASE_ANON_KEY).trim() };
  }
  return null;
}

export function setConfig(cfg: SupabaseConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CONFIG_KEY);
  // Al cambiar de nube, la próxima conexión vuelve a fusionar en vez de pisar lo local
  localStorage.removeItem('srs-sync-vinculado');
}

/**
 * Normaliza lo que el usuario pegue como URL del proyecto.
 * Acepta la Project URL (https://xxxx.supabase.co), la URL del panel
 * (https://supabase.com/dashboard/project/xxxx/...) o URLs con rutas de más,
 * y devuelve siempre https://xxxx.supabase.co. Null si no se reconoce.
 */
export function normalizarUrlProyecto(entrada: string): string | null {
  let s = entrada.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  // URL del panel: supabase.com/dashboard/project/<ref>/...
  const m = u.pathname.match(/\/project\/([a-z0-9-]+)/i);
  if (u.hostname.endsWith('supabase.com') && m) {
    return `https://${m[1]}.supabase.co`;
  }
  if (u.hostname.endsWith('supabase.com')) return null;
  // Proyecto en supabase.co (o autoalojado): quedarse solo con el origen
  return u.origin;
}

let client: SupabaseClient | null = null;
let clientUrl = '';

export function getClient(): SupabaseClient | null {
  const cfg = getConfig();
  if (!cfg) return null;
  if (!client || clientUrl !== cfg.url) {
    client = createClient(cfg.url, cfg.anonKey);
    clientUrl = cfg.url;
  }
  return client;
}
