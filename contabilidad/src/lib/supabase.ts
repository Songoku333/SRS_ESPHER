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
    return { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY };
  }
  return null;
}

export function setConfig(cfg: SupabaseConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CONFIG_KEY);
  // Al cambiar de nube, la próxima conexión vuelve a fusionar en vez de pisar lo local
  localStorage.removeItem('srs-sync-vinculado');
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
