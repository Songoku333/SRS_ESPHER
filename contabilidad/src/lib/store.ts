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

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getState(): AppData {
  return state;
}

export function setState(updater: (prev: AppData) => AppData) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(data: AppData) {
  state = { ...EMPTY_DATA, ...data };
  persist();
  listeners.forEach((l) => l());
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
