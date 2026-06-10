import { useSyncExternalStore } from 'react';
import { AppData, EMPTY_DATA } from '../types';

const STORAGE_KEY = 'srs-contabilidad-v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_DATA, ...parsed };
  } catch {
    return EMPTY_DATA;
  }
}

let state: AppData = load();
const listeners = new Set<() => void>();

/** Hook que la capa de sincronización registra para enviar cambios a la nube. */
type ChangeHook = (prev: AppData, next: AppData) => void;
let changeHook: ChangeHook | null = null;

export function registerChangeHook(hook: ChangeHook | null) {
  changeHook = hook;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function notify() {
  listeners.forEach((l) => l());
}

export function getState(): AppData {
  return state;
}

export function setState(updater: (prev: AppData) => AppData) {
  const prev = state;
  state = updater(state);
  persist();
  notify();
  if (changeHook) changeHook(prev, state);
}

/** Sustituye todos los datos y los sincroniza a la nube (restaurar copia, borrado total). */
export function replaceState(data: AppData) {
  const prev = state;
  state = { ...EMPTY_DATA, ...data };
  persist();
  notify();
  if (changeHook) changeHook(prev, state);
}

/** Sustituye los datos SIN avisar a la nube (usado al descargar datos desde la nube). */
export function replaceStateQuiet(data: AppData) {
  state = { ...EMPTY_DATA, ...data };
  persist();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getState);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Crea un contacto si no existe uno con el mismo nombre (sin distinguir mayúsculas); devuelve su id. */
export function ensureContacto(nombre: string, tipo: 'cliente' | 'proveedor' | 'colaborador'): string {
  const limpio = nombre.trim();
  const existente = state.contactos.find(
    (c) => c.nombre.trim().toLowerCase() === limpio.toLowerCase()
  );
  if (existente) return existente.id;
  const id = uid();
  setState((prev) => ({
    ...prev,
    contactos: [...prev.contactos, { id, tipo, nombre: limpio }],
  }));
  return id;
}
