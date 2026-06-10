import { useSyncExternalStore } from 'react';
import { Session } from '@supabase/supabase-js';
import { AppData, EMPTY_DATA } from '../types';
import { getClient, getConfig } from './supabase';
import { getState, replaceStateQuiet, registerChangeHook } from './store';

export type SyncStatus =
  | 'local' // sin nube configurada: solo este navegador
  | 'sin_sesion' // nube configurada pero sin iniciar sesión
  | 'conectando'
  | 'sincronizado'
  | 'guardando'
  | 'error';

export interface SyncInfo {
  status: SyncStatus;
  email?: string;
  error?: string;
}

const COLECCIONES = [
  'contactos',
  'ofertas',
  'proyectos',
  'facturas',
  'gastos',
  'movimientos',
  'liquidaciones',
] as const;

type Coleccion = (typeof COLECCIONES)[number];

let info: SyncInfo = { status: getConfig() ? 'conectando' : 'local' };
const listeners = new Set<() => void>();
let session: Session | null = null;
let inicializado = false;

// Cambios pendientes de subir, por colección
const pendientes: Record<Coleccion, { upserts: Map<string, unknown>; deletes: Set<string> }> =
  Object.fromEntries(
    COLECCIONES.map((c) => [c, { upserts: new Map(), deletes: new Set() }])
  ) as any;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let ultimaRecarga = 0;

function setInfo(next: SyncInfo) {
  info = next;
  listeners.forEach((l) => l());
}

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => info
  );
}

/** Arranca la sincronización. Llamar una vez al iniciar la app. */
export function initSync() {
  if (inicializado) return;
  inicializado = true;
  const client = getClient();
  if (!client) {
    setInfo({ status: 'local' });
    return;
  }
  setInfo({ status: 'conectando' });
  client.auth.onAuthStateChange((_evento, nuevaSesion) => {
    const habia = !!session;
    session = nuevaSesion;
    if (nuevaSesion && !habia) {
      void conectar();
    } else if (!nuevaSesion) {
      registerChangeHook(null);
      setInfo({ status: 'sin_sesion' });
    }
  });
  void client.auth.getSession().then(({ data }) => {
    session = data.session;
    if (session) void conectar();
    else setInfo({ status: 'sin_sesion' });
  });
  // Al volver a la pestaña, refresca desde la nube si no hay cambios pendientes
  window.addEventListener('focus', () => {
    if (info.status === 'sincronizado' && sinPendientes() && Date.now() - ultimaRecarga > 30000) {
      void recargarDesdeNube();
    }
  });
}

function sinPendientes(): boolean {
  return COLECCIONES.every((c) => pendientes[c].upserts.size === 0 && pendientes[c].deletes.size === 0);
}

/** Marca que este navegador ya se vinculó a la nube al menos una vez. */
const VINCULADO_KEY = 'srs-sync-vinculado';

async function conectar() {
  setInfo({ status: 'conectando', email: session?.user.email });
  try {
    const nube = await descargarTodo();
    if (!localStorage.getItem(VINCULADO_KEY)) {
      // Primera vinculación de este navegador: fusiona sin perder nada.
      // Lo local que no exista en la nube se sube; si un id está en ambos, gana la nube.
      const local = getState();
      const fusion: AppData = { ...EMPTY_DATA };
      for (const c of COLECCIONES) {
        const enNube = new Map((nube[c] as { id: string }[]).map((x) => [x.id, x]));
        const soloLocales = (local[c] as { id: string }[]).filter((x) => !enNube.has(x.id));
        for (const item of soloLocales) pendientes[c].upserts.set(item.id, item);
        (fusion as any)[c] = [...soloLocales, ...enNube.values()];
      }
      replaceStateQuiet(fusion);
      await flush();
      localStorage.setItem(VINCULADO_KEY, '1');
    } else {
      // Navegador ya vinculado: la nube es la fuente de verdad
      replaceStateQuiet(nube);
    }
    registerChangeHook(onChange);
    setInfo({ status: 'sincronizado', email: session?.user.email });
  } catch (e: any) {
    setInfo({ status: 'error', email: session?.user.email, error: mensajeError(e) });
  }
}

function mensajeError(e: any): string {
  const msg = String(e?.message || e || 'Error desconocido');
  if (msg.includes('Failed to fetch')) return 'Sin conexión con Supabase.';
  if (msg.includes('Invalid path')) {
    return 'La URL del proyecto no es correcta. Desvincula la nube y vuelve a conectar con la "Project URL" (https://xxxx.supabase.co) de Project Settings → API.';
  }
  if (msg.includes('Invalid API key') || msg.includes('No API key')) {
    return 'La clave anónima no es correcta. Desvincula la nube y vuelve a conectar con la clave "anon public" de Project Settings → API.';
  }
  if (msg.toLowerCase().includes('relation') && msg.includes('does not exist')) {
    return 'Faltan las tablas: ejecuta supabase/schema.sql en el SQL Editor de tu proyecto.';
  }
  return msg;
}

async function descargarTodo(): Promise<AppData> {
  const client = getClient()!;
  const out: AppData = { ...EMPTY_DATA };
  for (const c of COLECCIONES) {
    const { data, error } = await client.from(c).select('id,data');
    if (error) throw error;
    (out as any)[c] = (data || []).map((r: any) => r.data);
  }
  return out;
}

function encolarTodo(data: AppData) {
  for (const c of COLECCIONES) {
    for (const item of data[c] as { id: string }[]) {
      pendientes[c].upserts.set(item.id, item);
    }
  }
}

/** Calcula qué filas cambiaron entre dos estados y las encola. */
function onChange(prev: AppData, next: AppData) {
  for (const c of COLECCIONES) {
    const antes = new Map((prev[c] as { id: string }[]).map((x) => [x.id, x]));
    const despues = new Map((next[c] as { id: string }[]).map((x) => [x.id, x]));
    for (const [id, item] of despues) {
      const previo = antes.get(id);
      if (!previo || JSON.stringify(previo) !== JSON.stringify(item)) {
        pendientes[c].upserts.set(id, item);
        pendientes[c].deletes.delete(id);
      }
    }
    for (const id of antes.keys()) {
      if (!despues.has(id)) {
        pendientes[c].deletes.add(id);
        pendientes[c].upserts.delete(id);
      }
    }
  }
  programarFlush();
}

function programarFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 800);
}

async function flush() {
  if (!session || sinPendientes()) return;
  const client = getClient()!;
  const userId = session.user.id;
  setInfo({ status: 'guardando', email: session.user.email });
  try {
    for (const c of COLECCIONES) {
      const p = pendientes[c];
      if (p.upserts.size > 0) {
        const filas = [...p.upserts.values()].map((item: any) => ({
          id: item.id,
          user_id: userId,
          data: item,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await client.from(c).upsert(filas);
        if (error) throw error;
        p.upserts.clear();
      }
      if (p.deletes.size > 0) {
        const ids = [...p.deletes];
        const { error } = await client.from(c).delete().eq('user_id', userId).in('id', ids);
        if (error) throw error;
        p.deletes.clear();
      }
    }
    setInfo({ status: 'sincronizado', email: session.user.email });
  } catch (e: any) {
    // Los pendientes se conservan; se reintenta con el siguiente cambio o recarga
    setInfo({ status: 'error', email: session?.user.email, error: mensajeError(e) });
    programarReintento();
  }
}

let reintentoTimer: ReturnType<typeof setTimeout> | null = null;
function programarReintento() {
  if (reintentoTimer) clearTimeout(reintentoTimer);
  reintentoTimer = setTimeout(() => void flush(), 15000);
}

export async function recargarDesdeNube() {
  if (!session) return;
  ultimaRecarga = Date.now();
  try {
    const nube = await descargarTodo();
    replaceStateQuiet(nube);
    setInfo({ status: 'sincronizado', email: session.user.email });
  } catch (e: any) {
    setInfo({ status: 'error', email: session?.user.email, error: mensajeError(e) });
  }
}

/** Fuerza la subida de TODO lo local a la nube (sobrescribe filas existentes). */
export async function subirTodoALaNube() {
  if (!session) return;
  encolarTodo(getState());
  await flush();
}

export async function login(email: string, password: string): Promise<string | null> {
  const client = getClient();
  if (!client) return 'La nube no está configurada.';
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    return mensajeError(error);
  }
  return null;
}

export async function logout() {
  const client = getClient();
  if (client) await client.auth.signOut();
}
